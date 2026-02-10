import type { Request, Response } from 'express';
import colyseus from 'colyseus';
import type {
  ObserveRequest,
  ObserveResponseData,
  EntityBase,
  ObservedEntity,
  RoomInfo,
  AicErrorObject,
} from '@openclawworld/shared';
import type { GameRoom } from '../../rooms/GameRoom.js';
import type { EntitySchema } from '../../schemas/EntitySchema.js';

const { matchMaker } = colyseus;

function entityToBase(entity: EntitySchema): EntityBase {
  return {
    id: entity.id,
    kind: entity.kind,
    name: entity.name,
    roomId: entity.roomId,
    pos: entity.pos.toVec2(),
    tile: entity.tile?.toTileCoord(),
    facing: entity.facing,
    speed: entity.speed,
    meta: Object.fromEntries(entity.meta.entries()),
  };
}

function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

const AFFORDANCE_MAP: Record<string, Array<{ action: string; label: string }>> = {
  sign: [{ action: 'read', label: 'Read Sign' }],
  door: [
    { action: 'open', label: 'Open Door' },
    { action: 'close', label: 'Close Door' },
  ],
  portal: [{ action: 'use', label: 'Use Portal' }],
  chest: [
    { action: 'open', label: 'Open Chest' },
    { action: 'examine', label: 'Examine Chest' },
  ],
};

function getAffordancesForObject(entity: EntitySchema): Array<{ action: string; label: string }> {
  const objectType = entity.meta.get('objectType') || entity.name.split('_')[0].toLowerCase();

  return Object.prototype.hasOwnProperty.call(AFFORDANCE_MAP, objectType)
    ? AFFORDANCE_MAP[objectType]
    : [];
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

export async function handleObserve(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as ObserveRequest;
  const { agentId, roomId, radius } = body;

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

    const agentPos = agentEntity.pos;
    const allEntities = gameRoom.state.getAllEntities();
    const nearby: ObservedEntity[] = [];

    allEntities.forEach(entity => {
      if (entity.id === agentId) {
        return;
      }

      const distance = calculateDistance(agentPos.x, agentPos.y, entity.pos.x, entity.pos.y);

      if (distance <= radius) {
        const observedEntity: ObservedEntity = {
          entity: entityToBase(entity),
          distance: Math.round(distance * 100) / 100,
          affords: entity.kind === 'object' ? getAffordancesForObject(entity) : [],
        };

        nearby.push(observedEntity);
      }
    });

    nearby.sort((a, b) => a.distance - b.distance);

    const roomInfo: RoomInfo = {
      roomId: gameRoom.state.roomId,
      mapId: gameRoom.state.mapId,
      tickRate: gameRoom.state.tickRate,
    };

    const responseData: ObserveResponseData = {
      self: entityToBase(agentEntity),
      nearby,
      serverTsMs: Date.now(),
      room: roomInfo,
    };

    res.status(200).json({
      status: 'ok',
      data: responseData,
    });
  } catch (error) {
    console.error(`[ObserveHandler] Error processing observe request:`, error);
    res
      .status(500)
      .json(
        createErrorResponse('internal', 'Internal server error processing observe request', true)
      );
  }
}
