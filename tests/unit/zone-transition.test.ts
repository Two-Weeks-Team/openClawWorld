import { describe, it, expect, beforeEach } from 'vitest';
import {
  ZoneSystem,
  DEFAULT_ZONE_BOUNDS,
  type ZoneBounds,
} from '../../packages/server/src/zone/ZoneSystem.js';
import { EventLog } from '../../packages/server/src/events/EventLog.js';
import { EntitySchema } from '../../packages/server/src/schemas/EntitySchema.js';
import type { ZoneId } from '@openclawworld/shared';

type ZoneEventPayload = {
  entityId?: string;
  zoneId?: ZoneId | null;
  previousZoneId?: ZoneId | null;
  nextZoneId?: ZoneId | null;
};

describe('ZoneSystem (64x52 layout)', () => {
  let zoneSystem: ZoneSystem;
  let eventLog: EventLog;

  beforeEach(() => {
    zoneSystem = new ZoneSystem(DEFAULT_ZONE_BOUNDS);
    eventLog = new EventLog(60000, 1000);
  });

  describe('getZoneAtPosition', () => {
    it('returns lobby for position in lobby bounds', () => {
      expect(zoneSystem.getZoneAtPosition(640, 300)).toBe('lobby');
    });

    it('returns office for position in office bounds', () => {
      expect(zoneSystem.getZoneAtPosition(1200, 400)).toBe('office');
    });

    it('returns meeting-center for position in meeting-center bounds', () => {
      expect(zoneSystem.getZoneAtPosition(300, 1000)).toBe('meeting-center');
    });

    it('returns lounge-cafe for position in lounge-cafe bounds', () => {
      expect(zoneSystem.getZoneAtPosition(900, 1000)).toBe('lounge-cafe');
    });

    it('returns arcade for position in arcade bounds', () => {
      expect(zoneSystem.getZoneAtPosition(1600, 900)).toBe('arcade');
    });

    it('returns null for position outside all zones', () => {
      expect(zoneSystem.getZoneAtPosition(-100, -100)).toBeNull();
      expect(zoneSystem.getZoneAtPosition(5000, 5000)).toBeNull();
    });

    it('returns correct zone at zone boundaries', () => {
      expect(zoneSystem.getZoneAtPosition(192, 96)).toBe('lobby');
      expect(zoneSystem.getZoneAtPosition(927, 511)).toBe('lobby');
      expect(zoneSystem.getZoneAtPosition(1024, 192)).toBe('office');
      expect(zoneSystem.getZoneAtPosition(96, 928)).toBe('meeting-center');
      expect(zoneSystem.getZoneAtPosition(704, 928)).toBe('lounge-cafe');
      expect(zoneSystem.getZoneAtPosition(1344, 736)).toBe('arcade');
    });
  });

  describe('updateEntityZone', () => {
    it('detects initial zone entry', () => {
      const result = zoneSystem.updateEntityZone('entity_1', 640, 300);

      expect(result.previousZone).toBeNull();
      expect(result.currentZone).toBe('lobby');
      expect(result.changed).toBe(true);
    });

    it('detects no change when entity stays in same zone', () => {
      zoneSystem.updateEntityZone('entity_1', 640, 300);
      const result = zoneSystem.updateEntityZone('entity_1', 650, 310);

      expect(result.previousZone).toBe('lobby');
      expect(result.currentZone).toBe('lobby');
      expect(result.changed).toBe(false);
    });

    it('detects zone transition from lobby to office', () => {
      zoneSystem.updateEntityZone('entity_1', 640, 300);
      const result = zoneSystem.updateEntityZone('entity_1', 1200, 400);

      expect(result.previousZone).toBe('lobby');
      expect(result.currentZone).toBe('office');
      expect(result.changed).toBe(true);
    });

    it('emits zone.exit and zone.enter events on transition', () => {
      zoneSystem.updateEntityZone('entity_1', 640, 300, eventLog, 'room_1');
      zoneSystem.updateEntityZone('entity_1', 1200, 400, eventLog, 'room_1');

      const { events } = eventLog.getSince('', 10);

      expect(events).toHaveLength(3);

      const enterLobby = events.find(
        e => e.type === 'zone.enter' && (e.payload as ZoneEventPayload).zoneId === 'lobby'
      );
      const exitLobby = events.find(
        e => e.type === 'zone.exit' && (e.payload as ZoneEventPayload).zoneId === 'lobby'
      );
      const enterOffice = events.find(
        e => e.type === 'zone.enter' && (e.payload as ZoneEventPayload).zoneId === 'office'
      );

      expect(enterLobby).toBeDefined();
      expect(exitLobby).toBeDefined();
      expect(enterOffice).toBeDefined();
      expect((exitLobby?.payload as ZoneEventPayload).nextZoneId).toBe('office');
      expect((enterOffice?.payload as ZoneEventPayload).previousZoneId).toBe('lobby');
    });

    it('updates entity currentZone when entity provided', () => {
      const entity = new EntitySchema('entity_1', 'human', 'Test', 'room_1');

      zoneSystem.updateEntityZone('entity_1', 1200, 400, eventLog, 'room_1', entity);

      expect(entity.currentZone).toBe('office');
    });

    it('handles transition to outside all zones', () => {
      zoneSystem.updateEntityZone('entity_1', 640, 300);
      const result = zoneSystem.updateEntityZone('entity_1', -100, -100);

      expect(result.previousZone).toBe('lobby');
      expect(result.currentZone).toBeNull();
      expect(result.changed).toBe(true);
    });
  });

  describe('getZonePopulation', () => {
    it('returns 0 for empty zone', () => {
      expect(zoneSystem.getZonePopulation('lobby')).toBe(0);
    });

    it('increments population when entity enters zone', () => {
      zoneSystem.updateEntityZone('entity_1', 640, 300);

      expect(zoneSystem.getZonePopulation('lobby')).toBe(1);
    });

    it('decrements population when entity leaves zone', () => {
      zoneSystem.updateEntityZone('entity_1', 640, 300);
      zoneSystem.updateEntityZone('entity_1', 1200, 400);

      expect(zoneSystem.getZonePopulation('lobby')).toBe(0);
      expect(zoneSystem.getZonePopulation('office')).toBe(1);
    });

    it('tracks multiple entities per zone', () => {
      zoneSystem.updateEntityZone('entity_1', 640, 300);
      zoneSystem.updateEntityZone('entity_2', 650, 310);
      zoneSystem.updateEntityZone('entity_3', 660, 320);

      expect(zoneSystem.getZonePopulation('lobby')).toBe(3);
    });
  });

  describe('getEntitiesInZone', () => {
    it('returns empty array for zone with no entities', () => {
      expect(zoneSystem.getEntitiesInZone('lobby')).toEqual([]);
    });

    it('returns entity IDs in zone', () => {
      zoneSystem.updateEntityZone('entity_1', 640, 300);
      zoneSystem.updateEntityZone('entity_2', 650, 310);

      const entities = zoneSystem.getEntitiesInZone('lobby');

      expect(entities).toHaveLength(2);
      expect(entities).toContain('entity_1');
      expect(entities).toContain('entity_2');
    });

    it('excludes entities that left zone', () => {
      zoneSystem.updateEntityZone('entity_1', 640, 300);
      zoneSystem.updateEntityZone('entity_1', 1200, 400);

      expect(zoneSystem.getEntitiesInZone('lobby')).toEqual([]);
      expect(zoneSystem.getEntitiesInZone('office')).toContain('entity_1');
    });
  });

  describe('removeEntity', () => {
    it('returns previous zone when entity removed', () => {
      zoneSystem.updateEntityZone('entity_1', 640, 300);

      const previousZone = zoneSystem.removeEntity('entity_1');

      expect(previousZone).toBe('lobby');
    });

    it('returns null when entity was not tracked', () => {
      const previousZone = zoneSystem.removeEntity('nonexistent');

      expect(previousZone).toBeNull();
    });

    it('decrements population when entity removed', () => {
      zoneSystem.updateEntityZone('entity_1', 640, 300);
      zoneSystem.updateEntityZone('entity_2', 650, 310);

      expect(zoneSystem.getZonePopulation('lobby')).toBe(2);

      zoneSystem.removeEntity('entity_1');

      expect(zoneSystem.getZonePopulation('lobby')).toBe(1);
    });

    it('removes entity from tracking', () => {
      zoneSystem.updateEntityZone('entity_1', 640, 300);
      zoneSystem.removeEntity('entity_1');

      expect(zoneSystem.getEntityZone('entity_1')).toBeNull();
      expect(zoneSystem.getEntitiesInZone('lobby')).not.toContain('entity_1');
    });

    it('emits zone.exit event with null nextZoneId', () => {
      zoneSystem.updateEntityZone('entity_1', 640, 300, eventLog, 'room_1');
      zoneSystem.removeEntity('entity_1', eventLog, 'room_1');

      const { events } = eventLog.getSince('', 10);
      const exitEvent = events.find(
        e =>
          e.type === 'zone.exit' &&
          (e.payload as ZoneEventPayload).entityId === 'entity_1' &&
          (e.payload as ZoneEventPayload).nextZoneId === null
      );

      expect(exitEvent).toBeDefined();
      expect((exitEvent?.payload as ZoneEventPayload).zoneId).toBe('lobby');
    });
  });

  describe('update (batch)', () => {
    it('updates all entity zones and emits events', () => {
      const entities = new Map<string, EntitySchema>();
      const entity1 = new EntitySchema('entity_1', 'human', 'Test1', 'room_1');
      const entity2 = new EntitySchema('entity_2', 'human', 'Test2', 'room_1');

      entity1.setPosition(640, 300);
      entity2.setPosition(1200, 400);
      entities.set('entity_1', entity1);
      entities.set('entity_2', entity2);

      const zoneEvents = zoneSystem.update(entities, eventLog, 'room_1');

      expect(zoneEvents).toHaveLength(2);
      expect(entity1.currentZone).toBe('lobby');
      expect(entity2.currentZone).toBe('office');
      expect(zoneSystem.getZonePopulation('lobby')).toBe(1);
      expect(zoneSystem.getZonePopulation('office')).toBe(1);
    });

    it('cleans up removed entities', () => {
      const entities = new Map<string, EntitySchema>();
      const entity1 = new EntitySchema('entity_1', 'human', 'Test1', 'room_1');
      entity1.setPosition(640, 300);
      entities.set('entity_1', entity1);

      zoneSystem.update(entities, eventLog, 'room_1');
      expect(zoneSystem.getZonePopulation('lobby')).toBe(1);

      entities.delete('entity_1');
      zoneSystem.update(entities, eventLog, 'room_1');

      expect(zoneSystem.getZonePopulation('lobby')).toBe(0);
      expect(zoneSystem.getEntityZone('entity_1')).toBeNull();
    });
  });

  describe('edge cases', () => {
    describe('spawn', () => {
      it('handles entity spawning at zone boundary', () => {
        const result = zoneSystem.updateEntityZone('entity_1', 1024, 192);

        expect(result.currentZone).toBe('office');
        expect(result.changed).toBe(true);
      });

      it('handles entity spawning outside all zones', () => {
        const result = zoneSystem.updateEntityZone('entity_1', -50, -50);

        expect(result.currentZone).toBeNull();
        expect(result.changed).toBe(false);
      });
    });

    describe('teleport', () => {
      it('handles teleport across multiple zones', () => {
        zoneSystem.updateEntityZone('entity_1', 640, 300);
        const result = zoneSystem.updateEntityZone('entity_1', 1600, 900);

        expect(result.previousZone).toBe('lobby');
        expect(result.currentZone).toBe('arcade');
        expect(result.changed).toBe(true);
      });

      it('updates populations correctly on teleport', () => {
        zoneSystem.updateEntityZone('entity_1', 640, 300);
        zoneSystem.updateEntityZone('entity_2', 650, 310);

        expect(zoneSystem.getZonePopulation('lobby')).toBe(2);

        zoneSystem.updateEntityZone('entity_1', 1600, 900);

        expect(zoneSystem.getZonePopulation('lobby')).toBe(1);
        expect(zoneSystem.getZonePopulation('arcade')).toBe(1);
      });
    });

    describe('boundary precision', () => {
      it('correctly handles positions exactly on zone boundary', () => {
        expect(zoneSystem.getZoneAtPosition(1024, 300)).toBe('office');
        expect(zoneSystem.getZoneAtPosition(1023, 300)).toBeNull();
      });

      it('handles arcade and plaza vertical stacking', () => {
        expect(zoneSystem.getZoneAtPosition(1600, 800)).toBe('arcade');
        expect(zoneSystem.getZoneAtPosition(1600, 1100)).toBe('arcade');
        expect(zoneSystem.getZoneAtPosition(1600, 1300)).toBe('plaza');
      });
    });

    describe('population never goes negative', () => {
      it('population stays at 0 after multiple removes', () => {
        zoneSystem.updateEntityZone('entity_1', 640, 300);
        zoneSystem.removeEntity('entity_1');
        zoneSystem.removeEntity('entity_1');
        zoneSystem.removeEntity('entity_1');

        expect(zoneSystem.getZonePopulation('lobby')).toBe(0);
      });
    });
  });

  describe('getZoneBounds', () => {
    it('returns bounds for valid zone', () => {
      const bounds = zoneSystem.getZoneBounds('lobby');

      expect(bounds).toEqual({ x: 192, y: 96, width: 736, height: 416 });
    });

    it('returns undefined for invalid zone', () => {
      const bounds = zoneSystem.getZoneBounds('nonexistent' as ZoneId);

      expect(bounds).toBeUndefined();
    });
  });

  describe('getZoneIds', () => {
    it('returns all zone IDs', () => {
      const zoneIds = zoneSystem.getZoneIds();

      expect(zoneIds).toHaveLength(6);
      expect(zoneIds).toContain('lobby');
      expect(zoneIds).toContain('office');
      expect(zoneIds).toContain('meeting-center');
      expect(zoneIds).toContain('lounge-cafe');
      expect(zoneIds).toContain('arcade');
      expect(zoneIds).toContain('plaza');
    });
  });

  describe('custom zone bounds', () => {
    it('works with custom zone configuration', () => {
      const customBounds = new Map<ZoneId, ZoneBounds>([
        ['lobby', { x: 0, y: 0, width: 100, height: 100 }],
      ]);

      const customZoneSystem = new ZoneSystem(customBounds);

      expect(customZoneSystem.getZoneAtPosition(50, 50)).toBe('lobby');
      expect(customZoneSystem.getZoneAtPosition(150, 150)).toBeNull();
    });
  });
});
