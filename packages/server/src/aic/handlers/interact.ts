import type { Request, Response } from 'express';
import { matchMaker } from 'colyseus';
import type {
  InteractRequest,
  InteractResponseData,
  InteractOutcome,
  AicErrorObject,
} from '@openclawworld/shared';
import type { GameRoom } from '../../rooms/GameRoom.js';
import type { EntitySchema } from '../../schemas/EntitySchema.js';
import { interactIdempotencyStore } from '../idempotency.js';
import { DEFAULT_PROXIMITY_RADIUS } from '../../constants.js';
import { getColyseusRoomId } from '../roomRegistry.js';

type ActionHandler = (
  agent: EntitySchema,
  target: EntitySchema,
  params: Record<string, unknown>
) => InteractOutcome;

const actionRegistry: Record<string, Record<string, ActionHandler>> = {
  sign: {
    read: (_agent, target) => {
      const text = target.meta.get('text') || 'Empty sign';
      return {
        type: 'ok',
        message: text,
      };
    },
  },
  door: {
    open: (_agent, target) => {
      const currentState = target.meta.get('isOpen');
      if (currentState === 'true') {
        return {
          type: 'no_effect',
          message: 'Door is already open',
        };
      }
      target.meta.set('isOpen', 'true');
      return {
        type: 'ok',
        message: 'Door opened',
      };
    },
    close: (_agent, target) => {
      const currentState = target.meta.get('isOpen');
      if (currentState === 'false' || currentState === undefined) {
        return {
          type: 'no_effect',
          message: 'Door is already closed',
        };
      }
      target.meta.set('isOpen', 'false');
      return {
        type: 'ok',
        message: 'Door closed',
      };
    },
  },
  portal: {
    use: (agent, target) => {
      const destX = parseInt(target.meta.get('destX') || '0', 10);
      const destY = parseInt(target.meta.get('destY') || '0', 10);
      agent.setPosition(destX, destY);
      return {
        type: 'ok',
        message: 'Teleported',
      };
    },
  },
};

function createErrorResponse(
  code: AicErrorObject['code'],
  message: string,
  retryable: boolean
): { status: 'error'; error: AicErrorObject } {
  return {
    status: 'error',
    error: {
      code,
      message,
      retryable,
    },
  };
}

function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

export async function handleInteract(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as InteractRequest;
  const { agentId, roomId, txId, targetId, action } = body;

  try {
    const idempotencyCheck = interactIdempotencyStore.check(agentId, roomId, txId, body);

    if (idempotencyCheck.status === 'conflict') {
      res.status(409).json(createErrorResponse('conflict', idempotencyCheck.error.message, false));
      return;
    }

    if (idempotencyCheck.status === 'replay') {
      res.status(200).json({
        status: 'ok',
        data: idempotencyCheck.result,
      });
      return;
    }

    const colyseusRoomId = getColyseusRoomId(roomId);

    if (!colyseusRoomId) {
      res
        .status(404)
        .json(createErrorResponse('not_found', `Room with id '${roomId}' not found`, false));
      return;
    }

    const gameRoom = matchMaker.getLocalRoomById(colyseusRoomId) as GameRoom | undefined;

    if (!gameRoom) {
      res
        .status(503)
        .json(createErrorResponse('room_not_ready', `Room '${roomId}' is not ready`, true));
      return;
    }

    const agentEntity = gameRoom.state.getEntity(agentId);

    if (!agentEntity) {
      res
        .status(404)
        .json(
          createErrorResponse(
            'agent_not_in_room',
            `Agent with id '${agentId}' not found in room '${roomId}'`,
            false
          )
        );
      return;
    }

    const facilityService = gameRoom.getFacilityService();
    const targetFacility = facilityService.getFacility(targetId);

    let outcome: InteractOutcome;

    if (targetFacility) {
      const distance = calculateDistance(
        agentEntity.pos.x,
        agentEntity.pos.y,
        targetFacility.position.x,
        targetFacility.position.y
      );

      if (distance > DEFAULT_PROXIMITY_RADIUS) {
        outcome = {
          type: 'too_far',
          message: `Facility '${targetId}' is too far away (${Math.round(distance)} units, max ${DEFAULT_PROXIMITY_RADIUS})`,
        };
        const responseData: InteractResponseData = {
          txId,
          applied: false,
          serverTsMs: Date.now(),
          outcome,
        };
        interactIdempotencyStore.save(agentId, roomId, txId, body, responseData);
        res.status(200).json({
          status: 'ok',
          data: responseData,
        });
        return;
      }

      outcome = facilityService.interact(targetId, agentId, action, body.params ?? {});

      if (outcome.type === 'ok') {
        const eventLog = gameRoom.getEventLog();
        eventLog.append('facility.interacted', roomId, {
          facilityId: targetId,
          facilityType: targetFacility.type,
          action,
          entityId: agentId,
        });
      }
    } else {
      const targetEntity = gameRoom.state.getEntity(targetId);

      if (!targetEntity) {
        outcome = {
          type: 'invalid_action',
          message: `Target '${targetId}' not found`,
        };
        const responseData: InteractResponseData = {
          txId,
          applied: false,
          serverTsMs: Date.now(),
          outcome,
        };
        interactIdempotencyStore.save(agentId, roomId, txId, body, responseData);
        res.status(200).json({
          status: 'ok',
          data: responseData,
        });
        return;
      }

      if (targetEntity.kind !== 'object') {
        outcome = {
          type: 'invalid_action',
          message: `Target '${targetId}' is not an interactable object`,
        };
        const responseData: InteractResponseData = {
          txId,
          applied: false,
          serverTsMs: Date.now(),
          outcome,
        };
        interactIdempotencyStore.save(agentId, roomId, txId, body, responseData);
        res.status(200).json({
          status: 'ok',
          data: responseData,
        });
        return;
      }

      const distance = calculateDistance(
        agentEntity.pos.x,
        agentEntity.pos.y,
        targetEntity.pos.x,
        targetEntity.pos.y
      );

      if (distance > DEFAULT_PROXIMITY_RADIUS) {
        outcome = {
          type: 'too_far',
          message: `Target '${targetId}' is too far away (${Math.round(distance)} units, max ${DEFAULT_PROXIMITY_RADIUS})`,
        };
        const responseData: InteractResponseData = {
          txId,
          applied: false,
          serverTsMs: Date.now(),
          outcome,
        };
        interactIdempotencyStore.save(agentId, roomId, txId, body, responseData);
        res.status(200).json({
          status: 'ok',
          data: responseData,
        });
        return;
      }

      const objectType = targetEntity.meta.get('objectType') || 'unknown';
      const handler = actionRegistry[objectType]?.[action];

      if (handler) {
        outcome = handler(agentEntity, targetEntity, body.params ?? {});

        if (outcome.type === 'ok' && ['open', 'close', 'use'].includes(action)) {
          const eventLog = gameRoom.getEventLog();
          eventLog.append('object.state_changed', roomId, {
            objectId: targetId,
            objectType,
            action,
            agentId,
          });
        }
      } else {
        outcome = {
          type: 'invalid_action',
          message: `No handler for ${action} on ${objectType}`,
        };
      }
    }

    const responseData: InteractResponseData = {
      txId,
      applied: outcome.type === 'ok',
      serverTsMs: Date.now(),
      outcome,
    };

    interactIdempotencyStore.save(agentId, roomId, txId, body, responseData);

    res.status(200).json({
      status: 'ok',
      data: responseData,
    });
  } catch (error) {
    console.error(`[InteractHandler] Error processing interact request:`, error);
    res
      .status(500)
      .json(
        createErrorResponse('internal', 'Internal server error processing interact request', true)
      );
  }
}
