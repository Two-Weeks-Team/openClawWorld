import type { Request, Response } from 'express';
import { matchMaker } from 'colyseus';
import { getColyseusRoomId } from '../roomRegistry.js';
import type {
  ObserveRequest,
  ObserveResponseData,
  EntityBase,
  ObservedEntity,
  ObservedFacility,
  RoomInfo,
  AicErrorObject,
  MapMetadata,
  ZoneInfo,
  ZoneId,
} from '@openclawworld/shared';
import { MAP_CONFIG, ZONE_IDS, ZONE_BOUNDS } from '@openclawworld/shared';

function isValidZoneId(value: string): value is ZoneId {
  return (ZONE_IDS as readonly string[]).includes(value);
}

// Cached static zone data per worldPack (keyed by pack name@version)
// Using Map to support multiple worldPacks and prevent cross-room data leakage
const cachedStaticZonesDataByPack = new Map<
  string,
  { zones: ZoneInfo[]; mapSize: MapMetadata['mapSize'] }
>();

function getStaticZonesData(gameRoom: GameRoom): {
  zones: ZoneInfo[];
  mapSize: MapMetadata['mapSize'];
} {
  const worldPack = gameRoom.getWorldPack();
  // Use worldPack identifier as cache key, fallback to '__default__' if not available
  const cacheKey = worldPack?.manifest
    ? `${worldPack.manifest.name}@${worldPack.manifest.version}`
    : '__default__';

  const cached = cachedStaticZonesDataByPack.get(cacheKey);
  if (cached) {
    return cached;
  }

  const zones: ZoneInfo[] = [];

  for (const zoneId of ZONE_IDS) {
    const bounds = ZONE_BOUNDS[zoneId];
    const zoneMapData = worldPack?.maps.get(zoneId);
    const entrances = zoneMapData?.entrances ?? [];

    zones.push({
      id: zoneId,
      bounds,
      entrances,
    });
  }

  const staticData = {
    zones,
    mapSize: {
      width: MAP_CONFIG.pixelWidth,
      height: MAP_CONFIG.pixelHeight,
      tileSize: MAP_CONFIG.tileSize,
    },
  };

  cachedStaticZonesDataByPack.set(cacheKey, staticData);

  return staticData;
}

import type { GameRoom } from '../../rooms/GameRoom.js';
import type { EntitySchema } from '../../schemas/EntitySchema.js';
import type { FacilitySchema } from '../../schemas/FacilitySchema.js';
import type { NPCSchema } from '../../schemas/NPCSchema.js';

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
  const objectType =
    entity.meta.get('objectType') || (entity.name?.split('_')?.[0] ?? '').toLowerCase();

  return Object.prototype.hasOwnProperty.call(AFFORDANCE_MAP, objectType)
    ? AFFORDANCE_MAP[objectType]
    : [];
}

function facilityToObserved(facility: FacilitySchema, distance: number): ObservedFacility {
  const affordances = facility.getAffordances();
  return {
    id: facility.id,
    type: facility.type as ObservedFacility['type'],
    name: facility.id,
    position: { x: facility.position.x, y: facility.position.y },
    distance: Math.round(distance * 100) / 100,
    affords: affordances.map(action => ({
      action,
      label: action.charAt(0).toUpperCase() + action.slice(1).replace(/_/g, ' '),
    })),
  };
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

function buildMapMetadata(
  gameRoom: GameRoom,
  currentZone: string | null,
  includeGrid?: boolean
): MapMetadata {
  const staticData = getStaticZonesData(gameRoom);

  const metadata: MapMetadata = {
    currentZone: currentZone && isValidZoneId(currentZone) ? currentZone : null,
    zones: staticData.zones,
    mapSize: staticData.mapSize,
  };

  if (includeGrid) {
    const collisionSystem = gameRoom.getCollisionSystem();
    if (collisionSystem) {
      metadata.collisionGrid = collisionSystem.getGrid();
    }
  }

  return metadata;
}

export async function handleObserve(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as ObserveRequest;
  const { agentId, roomId, radius, includeGrid } = body;

  if (req.authAgentId !== agentId) {
    res
      .status(403)
      .json(createErrorResponse('forbidden', 'Agent ID mismatch with auth token', false));
    return;
  }

  try {
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

    // Add NPCs to nearby entities
    gameRoom.state.npcs.forEach((npc: NPCSchema) => {
      const distance = calculateDistance(agentPos.x, agentPos.y, npc.x, npc.y);

      if (distance <= radius) {
        const observedNpc: ObservedEntity = {
          entity: {
            id: npc.id,
            kind: 'npc' as const,
            name: npc.name,
            roomId: gameRoom.state.roomId,
            pos: { x: npc.x, y: npc.y },
            facing: npc.facing,
          },
          distance: Math.round(distance * 100) / 100,
          affords: [{ action: 'talk', label: 'Talk' }],
        };

        nearby.push(observedNpc);
      }
    });

    nearby.sort((a, b) => a.distance - b.distance);

    const nearbyFacilities: ObservedFacility[] = [];
    gameRoom.state.facilities.forEach(facility => {
      const distance = calculateDistance(
        agentPos.x,
        agentPos.y,
        facility.position.x,
        facility.position.y
      );

      if (distance <= radius) {
        nearbyFacilities.push(facilityToObserved(facility, distance));
      }
    });

    nearbyFacilities.sort((a, b) => a.distance - b.distance);

    const roomInfo: RoomInfo = {
      roomId: gameRoom.state.roomId,
      mapId: gameRoom.state.mapId,
      tickRate: gameRoom.state.tickRate,
    };

    const responseData: ObserveResponseData = {
      self: entityToBase(agentEntity),
      nearby,
      facilities: nearbyFacilities,
      serverTsMs: Date.now(),
      room: roomInfo,
      mapMetadata: buildMapMetadata(gameRoom, agentEntity.currentZone || null, includeGrid),
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
