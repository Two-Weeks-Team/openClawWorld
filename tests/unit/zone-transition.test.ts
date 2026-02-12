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

describe('ZoneSystem (8-zone Grid-Town layout)', () => {
  let zoneSystem: ZoneSystem;
  let eventLog: EventLog;

  beforeEach(() => {
    zoneSystem = new ZoneSystem(DEFAULT_ZONE_BOUNDS);
    eventLog = new EventLog(60000, 1000);
  });

  describe('getZoneAtPosition', () => {
    it('returns plaza for position in plaza bounds', () => {
      expect(zoneSystem.getZoneAtPosition(736, 736)).toBe('plaza');
    });

    it('returns office for position in office bounds', () => {
      expect(zoneSystem.getZoneAtPosition(832, 144)).toBe('office');
    });

    it('returns meeting for position in meeting bounds', () => {
      expect(zoneSystem.getZoneAtPosition(160, 592)).toBe('meeting');
    });

    it('returns arcade for position in arcade bounds', () => {
      expect(zoneSystem.getZoneAtPosition(848, 384)).toBe('arcade');
    });

    it('returns lounge-cafe for position in lounge-cafe bounds', () => {
      expect(zoneSystem.getZoneAtPosition(448, 720)).toBe('lounge-cafe');
    });

    it('returns lake for position in lake bounds', () => {
      expect(zoneSystem.getZoneAtPosition(64, 144)).toBe('lake');
    });

    it('returns lobby for position in lobby bounds', () => {
      expect(zoneSystem.getZoneAtPosition(192, 128)).toBe('lobby');
    });

    it('returns central-park for position in central-park bounds', () => {
      expect(zoneSystem.getZoneAtPosition(512, 416)).toBe('central-park');
    });

    it('returns null for position outside all zones', () => {
      expect(zoneSystem.getZoneAtPosition(-100, -100)).toBeNull();
      expect(zoneSystem.getZoneAtPosition(2500, 2500)).toBeNull();
    });

    it('returns correct zone at zone boundaries', () => {
      expect(zoneSystem.getZoneAtPosition(608, 608)).toBe('plaza');
      expect(zoneSystem.getZoneAtPosition(863, 863)).toBe('plaza');
      expect(zoneSystem.getZoneAtPosition(672, 32)).toBe('office');
      expect(zoneSystem.getZoneAtPosition(32, 448)).toBe('meeting');
      expect(zoneSystem.getZoneAtPosition(704, 256)).toBe('arcade');
      expect(zoneSystem.getZoneAtPosition(288, 608)).toBe('lounge-cafe');
      expect(zoneSystem.getZoneAtPosition(32, 32)).toBe('lake');
      expect(zoneSystem.getZoneAtPosition(96, 32)).toBe('lobby');
      expect(zoneSystem.getZoneAtPosition(320, 256)).toBe('central-park');
    });
  });

  describe('updateEntityZone', () => {
    it('detects initial zone entry', () => {
      const result = zoneSystem.updateEntityZone('entity_1', 736, 736);

      expect(result.previousZone).toBeNull();
      expect(result.currentZone).toBe('plaza');
      expect(result.changed).toBe(true);
    });

    it('detects no change when entity stays in same zone', () => {
      zoneSystem.updateEntityZone('entity_1', 736, 736);
      const result = zoneSystem.updateEntityZone('entity_1', 750, 750);

      expect(result.previousZone).toBe('plaza');
      expect(result.currentZone).toBe('plaza');
      expect(result.changed).toBe(false);
    });

    it('detects zone transition from plaza to office', () => {
      zoneSystem.updateEntityZone('entity_1', 640, 640);
      const result = zoneSystem.updateEntityZone('entity_1', 832, 144);

      expect(result.previousZone).toBe('plaza');
      expect(result.currentZone).toBe('office');
      expect(result.changed).toBe(true);
    });

    it('emits zone.exit and zone.enter events on transition', () => {
      zoneSystem.updateEntityZone('entity_1', 736, 736, eventLog, 'room_1');
      zoneSystem.updateEntityZone('entity_1', 832, 144, eventLog, 'room_1');

      const { events } = eventLog.getSince('', 10);

      expect(events).toHaveLength(3);

      const enterPlaza = events.find(
        e => e.type === 'zone.enter' && (e.payload as ZoneEventPayload).zoneId === 'plaza'
      );
      const exitPlaza = events.find(
        e => e.type === 'zone.exit' && (e.payload as ZoneEventPayload).zoneId === 'plaza'
      );
      const enterOffice = events.find(
        e => e.type === 'zone.enter' && (e.payload as ZoneEventPayload).zoneId === 'office'
      );

      expect(enterPlaza).toBeDefined();
      expect(exitPlaza).toBeDefined();
      expect(enterOffice).toBeDefined();
      expect((exitPlaza?.payload as ZoneEventPayload).nextZoneId).toBe('office');
      expect((enterOffice?.payload as ZoneEventPayload).previousZoneId).toBe('plaza');
    });

    it('updates entity currentZone when entity provided', () => {
      const entity = new EntitySchema('entity_1', 'human', 'Test', 'room_1');

      zoneSystem.updateEntityZone('entity_1', 832, 144, eventLog, 'room_1', entity);

      expect(entity.currentZone).toBe('office');
    });

    it('handles transition to outside all zones', () => {
      zoneSystem.updateEntityZone('entity_1', 736, 736);
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
      zoneSystem.updateEntityZone('entity_1', 736, 736);

      expect(zoneSystem.getZonePopulation('plaza')).toBe(1);
    });

    it('decrements population when entity leaves zone', () => {
      zoneSystem.updateEntityZone('entity_1', 736, 736);
      zoneSystem.updateEntityZone('entity_1', 832, 144);

      expect(zoneSystem.getZonePopulation('plaza')).toBe(0);
      expect(zoneSystem.getZonePopulation('office')).toBe(1);
    });

    it('tracks multiple entities per zone', () => {
      zoneSystem.updateEntityZone('entity_1', 736, 736);
      zoneSystem.updateEntityZone('entity_2', 750, 750);
      zoneSystem.updateEntityZone('entity_3', 800, 800);

      expect(zoneSystem.getZonePopulation('plaza')).toBe(3);
    });
  });

  describe('getEntitiesInZone', () => {
    it('returns empty array for zone with no entities', () => {
      expect(zoneSystem.getEntitiesInZone('plaza')).toEqual([]);
    });

    it('returns entity IDs in zone', () => {
      zoneSystem.updateEntityZone('entity_1', 736, 736);
      zoneSystem.updateEntityZone('entity_2', 750, 750);

      const entities = zoneSystem.getEntitiesInZone('plaza');

      expect(entities).toHaveLength(2);
      expect(entities).toContain('entity_1');
      expect(entities).toContain('entity_2');
    });

    it('excludes entities that left zone', () => {
      zoneSystem.updateEntityZone('entity_1', 736, 736);
      zoneSystem.updateEntityZone('entity_1', 832, 144);

      expect(zoneSystem.getEntitiesInZone('plaza')).toEqual([]);
      expect(zoneSystem.getEntitiesInZone('office')).toContain('entity_1');
    });
  });

  describe('removeEntity', () => {
    it('returns previous zone when entity removed', () => {
      zoneSystem.updateEntityZone('entity_1', 736, 736);

      const previousZone = zoneSystem.removeEntity('entity_1');

      expect(previousZone).toBe('plaza');
    });

    it('returns null when entity was not tracked', () => {
      const previousZone = zoneSystem.removeEntity('nonexistent');

      expect(previousZone).toBeNull();
    });

    it('decrements population when entity removed', () => {
      zoneSystem.updateEntityZone('entity_1', 736, 736);
      zoneSystem.updateEntityZone('entity_2', 750, 750);

      expect(zoneSystem.getZonePopulation('plaza')).toBe(2);

      zoneSystem.removeEntity('entity_1');

      expect(zoneSystem.getZonePopulation('plaza')).toBe(1);
    });

    it('removes entity from tracking', () => {
      zoneSystem.updateEntityZone('entity_1', 736, 736);
      zoneSystem.removeEntity('entity_1');

      expect(zoneSystem.getEntityZone('entity_1')).toBeNull();
      expect(zoneSystem.getEntitiesInZone('plaza')).not.toContain('entity_1');
    });

    it('emits zone.exit event with null nextZoneId', () => {
      zoneSystem.updateEntityZone('entity_1', 736, 736, eventLog, 'room_1');
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

      entity1.setPosition(736, 736);
      entity2.setPosition(832, 144);
      entities.set('entity_1', entity1);
      entities.set('entity_2', entity2);

      const zoneEvents = zoneSystem.update(entities, eventLog, 'room_1');

      expect(zoneEvents).toHaveLength(2);
      expect(entity1.currentZone).toBe('plaza');
      expect(entity2.currentZone).toBe('office');
      expect(zoneSystem.getZonePopulation('plaza')).toBe(1);
      expect(zoneSystem.getZonePopulation('office')).toBe(1);
    });

    it('cleans up removed entities', () => {
      const entities = new Map<string, EntitySchema>();
      const entity1 = new EntitySchema('entity_1', 'human', 'Test1', 'room_1');
      entity1.setPosition(736, 736);
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
        const result = zoneSystem.updateEntityZone('entity_1', 672, 32);

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
        zoneSystem.updateEntityZone('entity_1', 736, 736);
        const result = zoneSystem.updateEntityZone('entity_1', 64, 144);

        expect(result.previousZone).toBe('plaza');
        expect(result.currentZone).toBe('lake');
        expect(result.changed).toBe(true);
      });

      it('updates populations correctly on teleport', () => {
        zoneSystem.updateEntityZone('entity_1', 736, 736);
        zoneSystem.updateEntityZone('entity_2', 750, 750);

        expect(zoneSystem.getZonePopulation('plaza')).toBe(2);

        zoneSystem.updateEntityZone('entity_1', 64, 144);

        expect(zoneSystem.getZonePopulation('plaza')).toBe(1);
        expect(zoneSystem.getZonePopulation('lake')).toBe(1);
      });
    });

    describe('boundary precision', () => {
      it('correctly handles positions exactly on zone boundary', () => {
        expect(zoneSystem.getZoneAtPosition(672, 144)).toBe('office');
        expect(zoneSystem.getZoneAtPosition(671, 144)).toBeNull();
      });

      it('handles plaza adjacency with lounge-cafe', () => {
        expect(zoneSystem.getZoneAtPosition(736, 550)).toBeNull();
        expect(zoneSystem.getZoneAtPosition(736, 608)).toBe('plaza');
        expect(zoneSystem.getZoneAtPosition(736, 800)).toBe('plaza');
        expect(zoneSystem.getZoneAtPosition(550, 736)).toBe('lounge-cafe');
      });
    });

    describe('population never goes negative', () => {
      it('population stays at 0 after multiple removes', () => {
        zoneSystem.updateEntityZone('entity_1', 736, 736);
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

      expect(bounds).toEqual({ x: 608, y: 608, width: 256, height: 256 });
    });

    it('returns undefined for invalid zone', () => {
      const bounds = zoneSystem.getZoneBounds('nonexistent' as ZoneId);

      expect(bounds).toBeUndefined();
    });
  });

  describe('getZoneIds', () => {
    it('returns all zone IDs', () => {
      const zoneIds = zoneSystem.getZoneIds();

      expect(zoneIds).toHaveLength(8);
      expect(zoneIds).toContain('lobby');
      expect(zoneIds).toContain('office');
      expect(zoneIds).toContain('central-park');
      expect(zoneIds).toContain('arcade');
      expect(zoneIds).toContain('meeting');
      expect(zoneIds).toContain('lounge-cafe');
      expect(zoneIds).toContain('plaza');
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
