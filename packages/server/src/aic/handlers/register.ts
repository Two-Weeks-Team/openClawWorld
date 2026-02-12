import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { matchMaker } from 'colyseus';
import { v4 as uuidv4 } from 'uuid';
import type { RegisterRequest, RegisterResponseData, AicErrorObject } from '@openclawworld/shared';
import type { GameRoom } from '../../rooms/GameRoom.js';
import { EntitySchema } from '../../schemas/EntitySchema.js';
import { registerRoom, getColyseusRoomId } from '../roomRegistry.js';
import { DEFAULT_SPAWN_POSITION, DEFAULT_TILE_SIZE } from '../../constants.js';

function generateAgentId(): string {
  return `agt_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
}

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

export async function handleRegister(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as RegisterRequest;
  const { name, roomId } = body;

  try {
    let colyseusRoomId = getColyseusRoomId(roomId);

    if (!colyseusRoomId) {
      console.log(
        `[RegisterHandler] No room found for '${roomId}', creating new room for AIC agents`
      );
      try {
        const roomRef = await matchMaker.createRoom('game', { roomId });
        colyseusRoomId = roomRef.roomId;
        registerRoom(roomId, colyseusRoomId);
        console.log(`[RegisterHandler] Created room ${colyseusRoomId} for AIC agents`);
      } catch (createError) {
        console.error(`[RegisterHandler] Failed to create room:`, createError);
        res
          .status(500)
          .json(createErrorResponse('internal', `Failed to create room '${roomId}'`, true));
        return;
      }
    }

    const gameRoom = matchMaker.getLocalRoomById(colyseusRoomId) as GameRoom | undefined;

    if (!gameRoom) {
      res
        .status(503)
        .json(createErrorResponse('room_not_ready', `Room '${roomId}' is not ready`, true));
      return;
    }

    const agentId = generateAgentId();
    const entity = new EntitySchema(agentId, 'agent', name, roomId);

    const roomSpawn = gameRoom.getSpawnPoint();
    const tileSize = gameRoom.state.map?.tileSize ?? DEFAULT_TILE_SIZE;

    const spawnX = roomSpawn.x || DEFAULT_SPAWN_POSITION.x;
    const spawnY = roomSpawn.y || DEFAULT_SPAWN_POSITION.y;

    entity.setPosition(spawnX, spawnY);
    entity.setTile(Math.floor(spawnX / tileSize), Math.floor(spawnY / tileSize));

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
