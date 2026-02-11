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

describe('ZoneSystem (64x64 Grid-Town layout)', () => {
  let zoneSystem: ZoneSystem;
  let eventLog: EventLog;

  beforeEach(() => {
    zoneSystem = new ZoneSystem(DEFAULT_ZONE_BOUNDS);
    eventLog = new EventLog(60000, 1000);
  });

  describe('getZoneAtPosition', () => {
    it('returns plaza for position in plaza bounds', () => {
      expect(zoneSystem.getZoneAtPosition(1024, 1024)).toBe('plaza');
    });

    it('returns north-block for position in north-block bounds', () => {
      expect(zoneSystem.getZoneAtPosition(960, 256)).toBe('north-block');
    });

    it('returns west-block for position in west-block bounds', () => {
      expect(zoneSystem.getZoneAtPosition(384, 1024)).toBe('west-block');
    });

    it('returns east-block for position in east-block bounds', () => {
      expect(zoneSystem.getZoneAtPosition(1760, 1024)).toBe('east-block');
    });

    it('returns south-block for position in south-block bounds', () => {
      expect(zoneSystem.getZoneAtPosition(960, 1664)).toBe('south-block');
    });

    it('returns lake for position in lake bounds', () => {
      expect(zoneSystem.getZoneAtPosition(1728, 1728)).toBe('lake');
    });

    it('returns null for position outside all zones', () => {
      expect(zoneSystem.getZoneAtPosition(-100, -100)).toBeNull();
      expect(zoneSystem.getZoneAtPosition(5000, 5000)).toBeNull();
    });

    it('returns correct zone at zone boundaries', () => {
      expect(zoneSystem.getZoneAtPosition(768, 768)).toBe('plaza');
      expect(zoneSystem.getZoneAtPosition(1279, 1279)).toBe('plaza');
      expect(zoneSystem.getZoneAtPosition(576, 64)).toBe('north-block');
      expect(zoneSystem.getZoneAtPosition(64, 704)).toBe('west-block');
      expect(zoneSystem.getZoneAtPosition(1472, 704)).toBe('east-block');
      expect(zoneSystem.getZoneAtPosition(576, 1472)).toBe('south-block');
      expect(zoneSystem.getZoneAtPosition(1408, 1408)).toBe('lake');
    });
  });

  describe('updateEntityZone', () => {
    it('detects initial zone entry', () => {
      const result = zoneSystem.updateEntityZone('entity_1', 1024, 1024);

      expect(result.previousZone).toBeNull();
      expect(result.currentZone).toBe('plaza');
      expect(result.changed).toBe(true);
    });

    it('detects no change when entity stays in same zone', () => {
      zoneSystem.updateEntityZone('entity_1', 1024, 1024);
      const result = zoneSystem.updateEntityZone('entity_1', 1050, 1050);

      expect(result.previousZone).toBe('plaza');
      expect(result.currentZone).toBe('plaza');
      expect(result.changed).toBe(false);
    });

    it('detects zone transition from plaza to north-block', () => {
      zoneSystem.updateEntityZone('entity_1', 1024, 900);
      const result = zoneSystem.updateEntityZone('entity_1', 1024, 400);

      expect(result.previousZone).toBe('plaza');
      expect(result.currentZone).toBe('north-block');
      expect(result.changed).toBe(true);
    });

    it('emits zone.exit and zone.enter events on transition', () => {
      zoneSystem.updateEntityZone('entity_1', 1024, 1024, eventLog, 'room_1');
      zoneSystem.updateEntityZone('entity_1', 1024, 400, eventLog, 'room_1');

      const { events } = eventLog.getSince('', 10);

      expect(events).toHaveLength(3);

      const enterPlaza = events.find(
        e => e.type === 'zone.enter' && (e.payload as ZoneEventPayload).zoneId === 'plaza'
      );
      const exitPlaza = events.find(
        e => e.type === 'zone.exit' && (e.payload as ZoneEventPayload).zoneId === 'plaza'
      );
      const enterNorthBlock = events.find(
        e => e.type === 'zone.enter' && (e.payload as ZoneEventPayload).zoneId === 'north-block'
      );

      expect(enterPlaza).toBeDefined();
      expect(exitPlaza).toBeDefined();
      expect(enterNorthBlock).toBeDefined();
      expect((exitPlaza?.payload as ZoneEventPayload).nextZoneId).toBe('north-block');
      expect((enterNorthBlock?.payload as ZoneEventPayload).previousZoneId).toBe('plaza');
    });

    it('updates entity currentZone when entity provided', () => {
      const entity = new EntitySchema('entity_1', 'human', 'Test', 'room_1');

      zoneSystem.updateEntityZone('entity_1', 960, 256, eventLog, 'room_1', entity);

      expect(entity.currentZone).toBe('north-block');
    });

    it('handles transition to outside all zones', () => {
      zoneSystem.updateEntityZone('entity_1', 1024, 1024);
      const result = zoneSystem.updateEntityZone('entity_1', -100, -100);

      expect(result.previousZone).toBe('plaza');
      expect(result.currentZone).toBeNull();
      expect(result.changed).toBe(true);
    });
  });

  describe('getZonePopulation', () => {
    it('returns 0 for empty zone', () => {
      expect(zoneSystem.getZonePopulation('plaza')).toBe(0);
    });

    it('increments population when entity enters zone', () => {
      zoneSystem.updateEntityZone('entity_1', 1024, 1024);

      expect(zoneSystem.getZonePopulation('plaza')).toBe(1);
    });

    it('decrements population when entity leaves zone', () => {
      zoneSystem.updateEntityZone('entity_1', 1024, 1024);
      zoneSystem.updateEntityZone('entity_1', 960, 256);

      expect(zoneSystem.getZonePopulation('plaza')).toBe(0);
      expect(zoneSystem.getZonePopulation('north-block')).toBe(1);
    });

    it('tracks multiple entities per zone', () => {
      zoneSystem.updateEntityZone('entity_1', 1024, 1024);
      zoneSystem.updateEntityZone('entity_2', 1050, 1050);
      zoneSystem.updateEntityZone('entity_3', 1100, 1100);

      expect(zoneSystem.getZonePopulation('plaza')).toBe(3);
    });
  });

  describe('getEntitiesInZone', () => {
    it('returns empty array for zone with no entities', () => {
      expect(zoneSystem.getEntitiesInZone('plaza')).toEqual([]);
    });

    it('returns entity IDs in zone', () => {
      zoneSystem.updateEntityZone('entity_1', 1024, 1024);
      zoneSystem.updateEntityZone('entity_2', 1050, 1050);

      const entities = zoneSystem.getEntitiesInZone('plaza');

      expect(entities).toHaveLength(2);
      expect(entities).toContain('entity_1');
      expect(entities).toContain('entity_2');
    });

    it('excludes entities that left zone', () => {
      zoneSystem.updateEntityZone('entity_1', 1024, 1024);
      zoneSystem.updateEntityZone('entity_1', 960, 256);

      expect(zoneSystem.getEntitiesInZone('plaza')).toEqual([]);
      expect(zoneSystem.getEntitiesInZone('north-block')).toContain('entity_1');
    });
  });

  describe('removeEntity', () => {
    it('returns previous zone when entity removed', () => {
      zoneSystem.updateEntityZone('entity_1', 1024, 1024);

      const previousZone = zoneSystem.removeEntity('entity_1');

      expect(previousZone).toBe('plaza');
    });

    it('returns null when entity was not tracked', () => {
      const previousZone = zoneSystem.removeEntity('nonexistent');

      expect(previousZone).toBeNull();
    });

    it('decrements population when entity removed', () => {
      zoneSystem.updateEntityZone('entity_1', 1024, 1024);
      zoneSystem.updateEntityZone('entity_2', 1050, 1050);

      expect(zoneSystem.getZonePopulation('plaza')).toBe(2);

      zoneSystem.removeEntity('entity_1');

      expect(zoneSystem.getZonePopulation('plaza')).toBe(1);
    });

    it('removes entity from tracking', () => {
      zoneSystem.updateEntityZone('entity_1', 1024, 1024);
      zoneSystem.removeEntity('entity_1');

      expect(zoneSystem.getEntityZone('entity_1')).toBeNull();
      expect(zoneSystem.getEntitiesInZone('plaza')).not.toContain('entity_1');
    });

    it('emits zone.exit event with null nextZoneId', () => {
      zoneSystem.updateEntityZone('entity_1', 1024, 1024, eventLog, 'room_1');
      zoneSystem.removeEntity('entity_1', eventLog, 'room_1');

      const { events } = eventLog.getSince('', 10);
      const exitEvent = events.find(
        e =>
          e.type === 'zone.exit' &&
          (e.payload as ZoneEventPayload).entityId === 'entity_1' &&
          (e.payload as ZoneEventPayload).nextZoneId === null
      );

      expect(exitEvent).toBeDefined();
      expect((exitEvent?.payload as ZoneEventPayload).zoneId).toBe('plaza');
    });
  });

  describe('update (batch)', () => {
    it('updates all entity zones and emits events', () => {
      const entities = new Map<string, EntitySchema>();
      const entity1 = new EntitySchema('entity_1', 'human', 'Test1', 'room_1');
      const entity2 = new EntitySchema('entity_2', 'human', 'Test2', 'room_1');

      entity1.setPosition(1024, 1024);
      entity2.setPosition(960, 256);
      entities.set('entity_1', entity1);
      entities.set('entity_2', entity2);

      const zoneEvents = zoneSystem.update(entities, eventLog, 'room_1');

      expect(zoneEvents).toHaveLength(2);
      expect(entity1.currentZone).toBe('plaza');
      expect(entity2.currentZone).toBe('north-block');
      expect(zoneSystem.getZonePopulation('plaza')).toBe(1);
      expect(zoneSystem.getZonePopulation('north-block')).toBe(1);
    });

    it('cleans up removed entities', () => {
      const entities = new Map<string, EntitySchema>();
      const entity1 = new EntitySchema('entity_1', 'human', 'Test1', 'room_1');
      entity1.setPosition(1024, 1024);
      entities.set('entity_1', entity1);

      zoneSystem.update(entities, eventLog, 'room_1');
      expect(zoneSystem.getZonePopulation('plaza')).toBe(1);

      entities.delete('entity_1');
      zoneSystem.update(entities, eventLog, 'room_1');

      expect(zoneSystem.getZonePopulation('plaza')).toBe(0);
      expect(zoneSystem.getEntityZone('entity_1')).toBeNull();
    });
  });

  describe('edge cases', () => {
    describe('spawn', () => {
      it('handles entity spawning at zone boundary', () => {
        const result = zoneSystem.updateEntityZone('entity_1', 576, 64);

        expect(result.currentZone).toBe('north-block');
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
        zoneSystem.updateEntityZone('entity_1', 1024, 1024);
        const result = zoneSystem.updateEntityZone('entity_1', 1728, 1728);

        expect(result.previousZone).toBe('plaza');
        expect(result.currentZone).toBe('lake');
        expect(result.changed).toBe(true);
      });

      it('updates populations correctly on teleport', () => {
        zoneSystem.updateEntityZone('entity_1', 1024, 1024);
        zoneSystem.updateEntityZone('entity_2', 1050, 1050);

        expect(zoneSystem.getZonePopulation('plaza')).toBe(2);

        zoneSystem.updateEntityZone('entity_1', 1728, 1728);

        expect(zoneSystem.getZonePopulation('plaza')).toBe(1);
        expect(zoneSystem.getZonePopulation('lake')).toBe(1);
      });
    });

    describe('boundary precision', () => {
      it('correctly handles positions exactly on zone boundary', () => {
        expect(zoneSystem.getZoneAtPosition(576, 256)).toBe('north-block');
        expect(zoneSystem.getZoneAtPosition(575, 256)).toBeNull();
      });

      it('handles plaza vertical adjacency with north and south blocks', () => {
        // Gap between north-block (ends at y=448) and plaza (starts at y=768)
        expect(zoneSystem.getZoneAtPosition(1024, 400)).toBe('north-block');
        expect(zoneSystem.getZoneAtPosition(1024, 768)).toBe('plaza');
        expect(zoneSystem.getZoneAtPosition(1024, 1000)).toBe('plaza');
        expect(zoneSystem.getZoneAtPosition(1024, 1279)).toBe('plaza');
        expect(zoneSystem.getZoneAtPosition(1024, 1500)).toBe('south-block');
      });
    });

    describe('population never goes negative', () => {
      it('population stays at 0 after multiple removes', () => {
        zoneSystem.updateEntityZone('entity_1', 1024, 1024);
        zoneSystem.removeEntity('entity_1');
        zoneSystem.removeEntity('entity_1');
        zoneSystem.removeEntity('entity_1');

        expect(zoneSystem.getZonePopulation('plaza')).toBe(0);
      });
    });
  });

  describe('getZoneBounds', () => {
    it('returns bounds for valid zone', () => {
      const bounds = zoneSystem.getZoneBounds('plaza');

      expect(bounds).toEqual({ x: 768, y: 768, width: 512, height: 512 });
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
      expect(zoneIds).toContain('plaza');
      expect(zoneIds).toContain('north-block');
      expect(zoneIds).toContain('east-block');
      expect(zoneIds).toContain('west-block');
      expect(zoneIds).toContain('south-block');
      expect(zoneIds).toContain('lake');
    });
  });

  describe('custom zone bounds', () => {
    it('works with custom zone configuration', () => {
      const customBounds = new Map<ZoneId, ZoneBounds>([
        ['plaza', { x: 0, y: 0, width: 100, height: 100 }],
      ]);

      const customZoneSystem = new ZoneSystem(customBounds);

      expect(customZoneSystem.getZoneAtPosition(50, 50)).toBe('plaza');
      expect(customZoneSystem.getZoneAtPosition(150, 150)).toBeNull();
    });
  });
});
