import type { Request, Response } from 'express';
import colyseus from 'colyseus';
import type { RegisterRequest, RegisterResponseData, AicErrorObject } from '@openclawworld/shared';
import type { GameRoom } from '../../rooms/GameRoom.js';
import { EntitySchema } from '../../schemas/EntitySchema.js';

const { matchMaker } = colyseus;

let agentCounter = 0;

function generateAgentId(): string {
  agentCounter++;
  return `agt_${agentCounter.toString().padStart(4, '0')}`;
}

function generateSessionToken(): string {
  const randomPart = Math.random().toString(36).substring(2, 15);
  const timestampPart = Date.now().toString(36);
  return `tok_${randomPart}_${timestampPart}`;
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

export async function handleRegister(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as RegisterRequest;
  const { name, roomId } = body;

  try {
    const room = await matchMaker.query({ name: 'game', roomId });

    if (!room || room.length === 0) {
      res
        .status(404)
        .json(createErrorResponse('not_found', `Room with id '${roomId}' not found`, false));
      return;
    }

    const roomRef = room[0];
    const gameRoom = (await matchMaker.remoteRoomCall(roomRef.roomId, '')) as GameRoom;

    if (!gameRoom) {
      res
        .status(503)
        .json(createErrorResponse('room_not_ready', `Room '${roomId}' is not ready`, true));
      return;
    }

    const agentId = generateAgentId();
    const entity = new EntitySchema(agentId, 'agent', name, roomId);

    entity.setPosition(0, 0);
    entity.setTile(0, 0);

    gameRoom.state.addEntity(entity);

    const eventLog = gameRoom.getEventLog();
    eventLog.append('presence.join', roomId, {
      entityId: agentId,
      name,
      kind: 'agent',
    });

    const sessionToken = generateSessionToken();

    const responseData: RegisterResponseData = {
      agentId,
      roomId,
      sessionToken,
    };

    res.status(200).json({
      status: 'ok',
      data: responseData,
    });
  } catch (error) {
    console.error(`[RegisterHandler] Error processing register request:`, error);
    res
      .status(500)
      .json(
        createErrorResponse('internal', 'Internal server error processing register request', true)
      );
  }
}
