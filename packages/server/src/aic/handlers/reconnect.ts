import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { matchMaker } from 'colyseus';
import type {
  ReconnectRequest,
  ReconnectResponseData,
  AicErrorObject,
} from '@openclawworld/shared';
import type { GameRoom } from '../../rooms/GameRoom.js';
import { getColyseusRoomId } from '../roomRegistry.js';
import { getAgentIdFromToken, getRoomIdFromToken, registerToken } from '../tokenRegistry.js';

function generateSessionToken(): string {
  return `tok_${randomBytes(24).toString('base64url')}`;
}

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

export async function handleReconnect(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as ReconnectRequest;
  const { agentId, sessionToken } = body;

  try {
    // Validate the provided token matches the agent
    const tokenAgentId = getAgentIdFromToken(sessionToken);

    if (!tokenAgentId || tokenAgentId !== agentId) {
      res
        .status(401)
        .json(
          createErrorResponse(
            'unauthorized',
            'Invalid or expired session token. Please re-register via POST /register.',
            false
          )
        );
      return;
    }

    const roomId = getRoomIdFromToken(sessionToken);
    if (!roomId) {
      res
        .status(401)
        .json(
          createErrorResponse(
            'unauthorized',
            'Session token has no associated room. Please re-register.',
            false
          )
        );
      return;
    }

    const colyseusRoomId = getColyseusRoomId(roomId);
    if (!colyseusRoomId) {
      res
        .status(404)
        .json(createErrorResponse('not_found', `Room '${roomId}' no longer exists`, false));
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
        .status(410)
        .json(
          createErrorResponse(
            'agent_not_in_room',
            `Agent '${agentId}' session has expired and was cleaned up. Please re-register.`,
            false
          )
        );
      return;
    }

    // Agent exists and token is valid — issue new token and reset activity
    const newToken = generateSessionToken();
    registerToken(newToken, agentId, roomId);
    agentEntity.updateActivity();

    const responseData: ReconnectResponseData = {
      agentId,
      roomId,
      sessionToken: newToken,
      pos: agentEntity.pos.toVec2(),
      tile: agentEntity.tile?.toTileCoord(),
    };

    console.log(`[ReconnectHandler] Agent '${agentId}' reconnected to room '${roomId}'`);

    res.status(200).json({
      status: 'ok',
      data: responseData,
    });
  } catch (error) {
    console.error(`[ReconnectHandler] Error processing reconnect request:`, error);
    res
      .status(500)
      .json(
        createErrorResponse('internal', 'Internal server error processing reconnect request', true)
      );
  }
}
