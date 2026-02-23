import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { matchMaker } from 'colyseus';
import { v4 as uuidv4 } from 'uuid';
import type { RegisterRequest, RegisterResponseData, AicErrorObject } from '@openclawworld/shared';
import type { GameRoom } from '../../rooms/GameRoom.js';
import { EntitySchema } from '../../schemas/EntitySchema.js';
import { getColyseusRoomId } from '../roomRegistry.js';
import { registerToken } from '../tokenRegistry.js';
import { assignChannel, canJoinChannel } from '../channelManager.js';
import { DEFAULT_SPAWN_POSITION, DEFAULT_TILE_SIZE, CHANNEL_PREFIX } from '../../constants.js';

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

  if (roomId !== 'auto' && !roomId.startsWith(`${CHANNEL_PREFIX}-`)) {
    res
      .status(400)
      .json(
        createErrorResponse(
          'bad_request',
          `Invalid roomId: must be 'auto' or start with '${CHANNEL_PREFIX}-'`,
          false
        )
      );
    return;
  }

  try {
    // Resolve channel: 'auto' or seamless fallback when specified channel is full
    let targetRoomId = roomId;
    let colyseusRoomId: string | undefined;

    if (roomId === 'auto' || !canJoinChannel(roomId)) {
      if (roomId !== 'auto') {
        console.log(
          `[RegisterHandler] Channel '${roomId}' is full, auto-assigning to next channel`
        );
      }
      try {
        const assigned = await assignChannel();
        targetRoomId = assigned.channelId;
        colyseusRoomId = assigned.colyseusRoomId;
        console.log(`[RegisterHandler] Auto-assigned to channel '${targetRoomId}'`);
      } catch (assignError) {
        console.error(`[RegisterHandler] Failed to assign channel:`, assignError);
        res.status(500).json(createErrorResponse('internal', 'Failed to assign channel', true));
        return;
      }
    } else {
      colyseusRoomId = getColyseusRoomId(targetRoomId);
      if (!colyseusRoomId) {
        console.log(`[RegisterHandler] No room found for '${targetRoomId}', creating new room`);
        try {
          const roomRef = await matchMaker.createRoom('game', { channelId: targetRoomId });
          colyseusRoomId = roomRef.roomId;
          console.log(`[RegisterHandler] Created room ${colyseusRoomId} for '${targetRoomId}'`);
        } catch (createError) {
          console.error(`[RegisterHandler] Failed to create room:`, createError);
          res
            .status(500)
            .json(createErrorResponse('internal', `Failed to create room '${targetRoomId}'`, true));
          return;
        }
      }
    }

    const gameRoom = matchMaker.getLocalRoomById(colyseusRoomId!) as GameRoom | undefined;

    if (!gameRoom) {
      res
        .status(503)
        .json(createErrorResponse('room_not_ready', `Room '${targetRoomId}' is not ready`, true));
      return;
    }

    const agentId = generateAgentId();
    const entity = new EntitySchema(agentId, 'agent', name, targetRoomId);

    const roomSpawn = gameRoom.getSpawnPoint();
    const tileSize = gameRoom.state.map?.tileSize ?? DEFAULT_TILE_SIZE;

    const spawnX = roomSpawn.x || DEFAULT_SPAWN_POSITION.x;
    const spawnY = roomSpawn.y || DEFAULT_SPAWN_POSITION.y;

    entity.setPosition(spawnX, spawnY);
    entity.setTile(Math.floor(spawnX / tileSize), Math.floor(spawnY / tileSize));

    gameRoom.state.addEntity(entity);

    const eventLog = gameRoom.getEventLog();

    const zoneSystem = gameRoom.getZoneSystem();
    if (zoneSystem) {
      zoneSystem.updateEntityZone(agentId, spawnX, spawnY, eventLog, targetRoomId, entity);
    }
    eventLog.append('presence.join', targetRoomId, {
      entityId: agentId,
      name,
      kind: 'agent',
    });

    const sessionToken = generateSessionToken();
    registerToken(sessionToken, agentId, targetRoomId);

    const responseData: RegisterResponseData = {
      agentId,
      roomId: targetRoomId,
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
