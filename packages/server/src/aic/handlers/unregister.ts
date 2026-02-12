import type { Request, Response } from 'express';
import { matchMaker } from 'colyseus';
import type {
  UnregisterRequest,
  UnregisterResponseData,
  AicErrorObject,
} from '@openclawworld/shared';
import type { GameRoom } from '../../rooms/GameRoom.js';
import { getColyseusRoomId } from '../roomRegistry.js';
import { invalidateAgentToken } from '../tokenRegistry.js';

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

export async function handleUnregister(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as UnregisterRequest;
  const { agentId, roomId } = body;

  if (req.authAgentId !== agentId) {
    res
      .status(403)
      .json(createErrorResponse('forbidden', 'Cannot unregister another agent', false));
    return;
  }

  try {
    const colyseusRoomId = getColyseusRoomId(roomId);

    if (!colyseusRoomId) {
      res.status(404).json(createErrorResponse('not_found', `Room '${roomId}' not found`, false));
      return;
    }

    const gameRoom = matchMaker.getLocalRoomById(colyseusRoomId) as GameRoom | undefined;

    if (!gameRoom) {
      res
        .status(503)
        .json(createErrorResponse('room_not_ready', `Room '${roomId}' is not ready`, true));
      return;
    }

    const entity = gameRoom.state.agents.get(agentId);

    if (!entity) {
      res
        .status(404)
        .json(createErrorResponse('not_found', `Agent '${agentId}' not found in room`, false));
      return;
    }

    const entityName = entity.name;

    gameRoom.state.removeEntity(agentId, 'agent');

    const skillService = gameRoom.getSkillService();
    if (skillService) {
      skillService.cleanupAgent(agentId);
    }

    const eventLog = gameRoom.getEventLog();
    eventLog.append('presence.leave', roomId, {
      entityId: agentId,
      name: entityName,
      kind: 'agent',
      reason: 'unregister',
    });

    invalidateAgentToken(agentId);

    const responseData: UnregisterResponseData = {
      agentId,
      unregisteredAt: Date.now(),
    };

    res.status(200).json({
      status: 'ok',
      data: responseData,
    });

    console.log(
      `[UnregisterHandler] Agent '${agentId}' (${entityName}) unregistered from '${roomId}'`
    );
  } catch (error) {
    console.error(`[UnregisterHandler] Error processing unregister request:`, error);
    res
      .status(500)
      .json(
        createErrorResponse('internal', 'Internal server error processing unregister request', true)
      );
  }
}
