import type { Request, Response } from 'express';
import { matchMaker } from 'colyseus';
import type { InteractRequest, InteractResponseData, AicErrorObject } from '@openclawworld/shared';
import type { GameRoom } from '../../rooms/GameRoom.js';
import { interactIdempotencyStore } from '../idempotency.js';
import { getColyseusRoomId } from '../roomRegistry.js';

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

export async function handleInteract(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as InteractRequest;
  const { agentId, roomId, txId, targetId, action } = body;

  if (req.authAgentId !== agentId) {
    res
      .status(403)
      .json(createErrorResponse('forbidden', 'Agent ID mismatch with auth token', false));
    return;
  }

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

    const outcome = gameRoom.handleInteraction(agentId, targetId, action, body.params ?? {});

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
