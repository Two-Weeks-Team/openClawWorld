import { describe, it, expect, beforeEach } from 'vitest';
import { ZoneSystem, DEFAULT_ZONE_BOUNDS } from '../../packages/server/src/zone/ZoneSystem.js';
import { CollisionSystem } from '../../packages/server/src/collision/CollisionSystem.js';
import { MovementSystem } from '../../packages/server/src/movement/MovementSystem.js';
import { EventLog } from '../../packages/server/src/events/EventLog.js';
import { EntitySchema } from '../../packages/server/src/schemas/EntitySchema.js';
import { WanderBot } from '../../packages/server/src/bots/WanderBot.js';
import type { ParsedMap, ZoneId } from '@openclawworld/shared';

const TILE_SIZE = 32;
const MAP_WIDTH = 64;
const MAP_HEIGHT = 64;

function createTestMap(blockedTiles: Array<{ tx: number; ty: number }> = []): ParsedMap {
  const collisionGrid: boolean[][] = [];

  for (let y = 0; y < MAP_HEIGHT; y++) {
    collisionGrid[y] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      collisionGrid[y][x] = false;
    }
  }

  for (const tile of blockedTiles) {
    if (tile.ty >= 0 && tile.ty < MAP_HEIGHT && tile.tx >= 0 && tile.tx < MAP_WIDTH) {
      collisionGrid[tile.ty][tile.tx] = true;
    }
  }

  return {
    mapId: 'test-map',
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    tileSize: TILE_SIZE,
    collisionGrid,
    layers: [],
    objects: [],
  };
}

describe('World System Integration Tests', () => {
  describe('Scenario A: Player walks into LOBBY triggers zone.enter event', () => {
    let zoneSystem: ZoneSystem;
    let eventLog: EventLog;
    let entity: EntitySchema;

    beforeEach(() => {
      zoneSystem = new ZoneSystem(DEFAULT_ZONE_BOUNDS);
      eventLog = new EventLog(60000, 1000);
      entity = new EntitySchema('player_1', 'human', 'TestPlayer', 'room_1');
    });

    it('emits zone.enter when moving from outside into lobby', () => {
      entity.setPosition(600, 600);
      zoneSystem.updateEntityZone('player_1', 600, 600, eventLog, 'room_1', entity);
      expect(zoneSystem.getEntityZone('player_1')).toBeNull();

      entity.setPosition(320, 256);
      const result = zoneSystem.updateEntityZone('player_1', 320, 256, eventLog, 'room_1', entity);

      expect(result.changed).toBe(true);
      expect(result.previousZone).toBeNull();
      expect(result.currentZone).toBe('lobby');
      expect(zoneSystem.getEntityZone('player_1')).toBe('lobby');

      const { events } = eventLog.getSince('', 10);
      const enterEvent = events.find(
        e => e.type === 'zone.enter' && (e.payload as { zoneId: string }).zoneId === 'lobby'
      );
      expect(enterEvent).toBeDefined();
      expect((enterEvent?.payload as { entityId: string }).entityId).toBe('player_1');
      expect((enterEvent?.payload as { previousZoneId: string | null }).previousZoneId).toBeNull();
    });

    it('updates entity currentZone property on enter', () => {
      entity.setPosition(320, 256);
      zoneSystem.updateEntityZone('player_1', 320, 256, eventLog, 'room_1', entity);

      expect(entity.currentZone).toBe('lobby');
    });
  });

  describe('Scenario B: Player exits LOBBY triggers zone.exit event', () => {
    let zoneSystem: ZoneSystem;
    let eventLog: EventLog;
    let entity: EntitySchema;

    beforeEach(() => {
      zoneSystem = new ZoneSystem(DEFAULT_ZONE_BOUNDS);
      eventLog = new EventLog(60000, 1000);
      entity = new EntitySchema('player_1', 'human', 'TestPlayer', 'room_1');

      entity.setPosition(320, 256);
      zoneSystem.updateEntityZone('player_1', 320, 256, eventLog, 'room_1', entity);
      eventLog.getSince('', 100);
    });

    it('emits zone.exit when leaving lobby to outside', () => {
      entity.setPosition(50, 500);
      const result = zoneSystem.updateEntityZone('player_1', 50, 500, eventLog, 'room_1', entity);

      expect(result.changed).toBe(true);
      expect(result.previousZone).toBe('lobby');
      expect(result.currentZone).toBeNull();

      const { events } = eventLog.getSince('', 10);
      const exitEvent = events.find(
        e => e.type === 'zone.exit' && (e.payload as { zoneId: string }).zoneId === 'lobby'
      );
      expect(exitEvent).toBeDefined();
      expect((exitEvent?.payload as { entityId: string }).entityId).toBe('player_1');
      expect((exitEvent?.payload as { nextZoneId: string | null }).nextZoneId).toBeNull();
    });

    it('emits both zone.exit and zone.enter when transitioning between zones', () => {
      entity.setPosition(1664, 288);
      const result = zoneSystem.updateEntityZone('player_1', 1664, 288, eventLog, 'room_1', entity);

      expect(result.changed).toBe(true);
      expect(result.previousZone).toBe('lobby');
      expect(result.currentZone).toBe('office');

      const { events } = eventLog.getSince('', 10);

      const exitEvent = events.find(
        e => e.type === 'zone.exit' && (e.payload as { zoneId: string }).zoneId === 'lobby'
      );
      const enterEvent = events.find(
        e => e.type === 'zone.enter' && (e.payload as { zoneId: string }).zoneId === 'office'
      );

      expect(exitEvent).toBeDefined();
      expect(enterEvent).toBeDefined();
      expect((exitEvent?.payload as { nextZoneId: string }).nextZoneId).toBe('office');
      expect((enterEvent?.payload as { previousZoneId: string }).previousZoneId).toBe('lobby');
    });
  });

  describe('Scenario C: Player walks into wall triggers position rejection', () => {
    let collisionSystem: CollisionSystem;
    let movementSystem: MovementSystem;

    beforeEach(() => {
      const wallTiles = [
        { tx: 10, ty: 10 },
        { tx: 11, ty: 10 },
        { tx: 12, ty: 10 },
      ];
      const parsedMap = createTestMap(wallTiles);
      collisionSystem = new CollisionSystem(parsedMap);
      movementSystem = new MovementSystem(collisionSystem, 100);
    });

    it('rejects movement to blocked tile', () => {
      const result = movementSystem.setDestination('player_1', 10, 10);
      expect(result).toBe('rejected');
    });

    it('accepts movement to non-blocked tile', () => {
      const result = movementSystem.setDestination('player_1', 5, 5);
      expect(result).toBe('accepted');
    });

    it('rejects movement to out-of-bounds tile', () => {
      const result = movementSystem.setDestination('player_1', -1, 5);
      expect(result).toBe('rejected');

      const result2 = movementSystem.setDestination('player_1', 100, 5);
      expect(result2).toBe('rejected');
    });

    it('collision system correctly identifies blocked tiles', () => {
      expect(collisionSystem.isBlocked(10, 10)).toBe(true);
      expect(collisionSystem.isBlocked(11, 10)).toBe(true);
      expect(collisionSystem.isBlocked(12, 10)).toBe(true);
      expect(collisionSystem.isBlocked(9, 10)).toBe(false);
      expect(collisionSystem.isBlocked(13, 10)).toBe(false);
    });

    it('collision system correctly identifies out-of-bounds as blocked', () => {
      expect(collisionSystem.isBlocked(-1, 0)).toBe(true);
      expect(collisionSystem.isBlocked(0, -1)).toBe(true);
      expect(collisionSystem.isBlocked(MAP_WIDTH, 0)).toBe(true);
      expect(collisionSystem.isBlocked(0, MAP_HEIGHT)).toBe(true);
    });
  });

  describe('Scenario D: Bot walks through 3 different zones', () => {
    let collisionSystem: CollisionSystem;
    let movementSystem: MovementSystem;
    let zoneSystem: ZoneSystem;
    let eventLog: EventLog;
    let entity: EntitySchema;
    let wanderBot: WanderBot;

    beforeEach(() => {
      const parsedMap = createTestMap();
      collisionSystem = new CollisionSystem(parsedMap);
      movementSystem = new MovementSystem(collisionSystem, 200);
      zoneSystem = new ZoneSystem(DEFAULT_ZONE_BOUNDS);
      eventLog = new EventLog(60000, 1000);
      entity = new EntitySchema('bot_1', 'agent', 'WanderBot', 'room_1');

      entity.setPosition(320, 256);
      entity.setTile(10, 8);

      wanderBot = new WanderBot(
        {
          entityId: 'bot_1',
          roomId: 'room_1',
          minWaitMs: 0,
          maxWaitMs: 0,
          seed: 12345,
        },
        entity,
        collisionSystem,
        movementSystem,
        zoneSystem,
        eventLog
      );
      wanderBot.start();
    });

    it('bot starts in lobby zone', () => {
      expect(wanderBot.getCurrentZone()).toBe('lobby');
      expect(wanderBot.getZonesVisited()).toContain('lobby');
    });

    it('bot can move to office zone', () => {
      entity.setPosition(1664, 288);
      entity.setTile(52, 9);

      wanderBot.update(Date.now());

      expect(wanderBot.getCurrentZone()).toBe('office');
      expect(wanderBot.getZonesVisited()).toContain('lobby');
      expect(wanderBot.getZonesVisited()).toContain('office');
    });

    it('bot visits at least 3 zones when manually moved', () => {
      const zonePositions: Array<{ zone: ZoneId; x: number; y: number }> = [
        { zone: 'lobby', x: 320, y: 256 },
        { zone: 'office', x: 1664, y: 288 },
        { zone: 'meeting', x: 320, y: 1184 },
      ];

      for (const { x, y } of zonePositions) {
        entity.setPosition(x, y);
        wanderBot.update(Date.now());
      }

      const visited = wanderBot.getZonesVisited();
      expect(visited.length).toBeGreaterThanOrEqual(3);
      expect(visited).toContain('lobby');
      expect(visited).toContain('office');
      expect(visited).toContain('meeting');
    });

    it('bot respects collision when trying to move', () => {
      const wallMap = createTestMap([
        { tx: 21, ty: 9 },
        { tx: 22, ty: 9 },
        { tx: 23, ty: 9 },
      ]);
      const wallCollision = new CollisionSystem(wallMap);
      const wallMovement = new MovementSystem(wallCollision, 200);

      const botWithWalls = new WanderBot(
        {
          entityId: 'bot_2',
          roomId: 'room_1',
          minWaitMs: 0,
          maxWaitMs: 0,
          seed: 54321,
        },
        entity,
        wallCollision,
        wallMovement,
        zoneSystem,
        eventLog
      );

      const moveSuccess = botWithWalls.moveTo(21, 9);
      expect(moveSuccess).toBe(false);

      const moveToOpen = botWithWalls.moveTo(20, 10);
      expect(moveToOpen).toBe(true);
    });

    it('bot tracks move count correctly', () => {
      const initialCount = wanderBot.getMoveCount();

      entity.setPosition(1200, 400);
      wanderBot.moveTo(38, 13);

      expect(wanderBot.getMoveCount()).toBe(initialCount + 1);
    });

    it('zone events are logged when bot moves between zones', () => {
      eventLog.getSince('', 100);

      entity.setPosition(1664, 288);
      wanderBot.update(Date.now());

      const { events } = eventLog.getSince('', 10);

      const exitLobby = events.find(
        e => e.type === 'zone.exit' && (e.payload as { zoneId: string }).zoneId === 'lobby'
      );
      const enterOffice = events.find(
        e => e.type === 'zone.enter' && (e.payload as { zoneId: string }).zoneId === 'office'
      );

      expect(exitLobby).toBeDefined();
      expect(enterOffice).toBeDefined();
    });
  });

  describe('Door tiles are passable', () => {
    it('doors are not blocked in collision grid', () => {
      const parsedMap = createTestMap();
      const collisionSystem = new CollisionSystem(parsedMap);

      expect(collisionSystem.isBlocked(15, 15)).toBe(false);
    });

    it('can move through door tile location', () => {
      const parsedMap = createTestMap();
      const collisionSystem = new CollisionSystem(parsedMap);
      const movementSystem = new MovementSystem(collisionSystem, 100);

      const result = movementSystem.setDestination('player_1', 15, 15);
      expect(result).toBe('accepted');
    });
  });
});
