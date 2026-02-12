import { describe, it, expect, beforeEach } from 'vitest';
import { ZoneSystem, DEFAULT_ZONE_BOUNDS } from '../../packages/server/src/zone/ZoneSystem.js';
import { EventLog } from '../../packages/server/src/events/EventLog.js';
import { EntitySchema } from '../../packages/server/src/schemas/EntitySchema.js';

describe('ZoneSystem - Plaza Zone (8-zone Grid-Town layout)', () => {
  let zoneSystem: ZoneSystem;
  let eventLog: EventLog;

  beforeEach(() => {
    zoneSystem = new ZoneSystem(DEFAULT_ZONE_BOUNDS);
    eventLog = new EventLog(60000, 1000);
  });

  describe('detectZone', () => {
    it('returns plaza for position inside plaza bounds (736, 736)', () => {
      expect(zoneSystem.detectZone(736, 736)).toBe('plaza');
    });

    it('returns plaza for position at plaza origin (608, 608)', () => {
      expect(zoneSystem.detectZone(608, 608)).toBe('plaza');
    });

    it('returns plaza for position at plaza bottom-right boundary (863, 863)', () => {
      expect(zoneSystem.detectZone(863, 863)).toBe('plaza');
    });

    it('returns null for position outside all zones', () => {
      expect(zoneSystem.detectZone(2500, 250)).toBeNull();
    });

    it('returns null for position just outside plaza to the right', () => {
      expect(zoneSystem.detectZone(864, 736)).toBeNull();
    });
  });

  describe('updateEntityZone', () => {
    it('fires zone.enter event when entity enters plaza', () => {
      const entity = new EntitySchema('entity_1', 'human', 'Test', 'room_1');

      const result = zoneSystem.updateEntityZone('entity_1', 736, 736, eventLog, 'room_1', entity);

      expect(result.currentZone).toBe('plaza');
      expect(result.changed).toBe(true);

      const { events } = eventLog.getSince('', 10);
      const enterEvent = events.find(
        e => e.type === 'zone.enter' && (e.payload as { zoneId: string }).zoneId === 'plaza'
      );

      expect(enterEvent).toBeDefined();
      expect((enterEvent?.payload as { entityId: string }).entityId).toBe('entity_1');
    });

    it('updates entity currentZone to plaza when entity enters', () => {
      const entity = new EntitySchema('entity_1', 'human', 'Test', 'room_1');

      zoneSystem.updateEntityZone('entity_1', 736, 736, eventLog, 'room_1', entity);

      expect(entity.currentZone).toBe('plaza');
    });

    it('tracks entity zone correctly for plaza', () => {
      zoneSystem.updateEntityZone('entity_1', 736, 736);

      expect(zoneSystem.getEntityZone('entity_1')).toBe('plaza');
    });
  });

  describe('zone population', () => {
    it('returns correct population for plaza zone', () => {
      zoneSystem.updateEntityZone('entity_1', 700, 700);
      zoneSystem.updateEntityZone('entity_2', 750, 750);

      expect(zoneSystem.getZonePopulation('plaza')).toBe(2);
    });

    it('returns entities in plaza zone', () => {
      zoneSystem.updateEntityZone('entity_1', 700, 700);
      zoneSystem.updateEntityZone('entity_2', 750, 750);

      const entities = zoneSystem.getEntitiesInZone('plaza');

      expect(entities).toHaveLength(2);
      expect(entities).toContain('entity_1');
      expect(entities).toContain('entity_2');
    });
  });

  describe('getZoneIds', () => {
    it('includes plaza in zone IDs', () => {
      const zoneIds = zoneSystem.getZoneIds();

      expect(zoneIds).toContain('plaza');
    });
  });

  describe('getZoneBounds', () => {
    it('returns correct bounds for plaza zone', () => {
      const bounds = zoneSystem.getZoneBounds('plaza');

      expect(bounds).toEqual({ x: 608, y: 608, width: 256, height: 256 });
    });
  });
});
