import { describe, it, expect, beforeEach } from 'vitest';
import { ZoneSystem, DEFAULT_ZONE_BOUNDS } from '../../packages/server/src/zone/ZoneSystem.js';
import { EventLog } from '../../packages/server/src/events/EventLog.js';
import { EntitySchema } from '../../packages/server/src/schemas/EntitySchema.js';

describe('ZoneSystem - Plaza Zone', () => {
  let zoneSystem: ZoneSystem;
  let eventLog: EventLog;

  beforeEach(() => {
    zoneSystem = new ZoneSystem(DEFAULT_ZONE_BOUNDS);
    eventLog = new EventLog(60000, 1000);
  });

  describe('detectZone', () => {
    it('returns plaza for position inside plaza bounds (3300, 500)', () => {
      // Plaza bounds: { x: 3200, y: 0, width: 960, height: 1280 }
      // Position (3300, 500) is inside plaza
      expect(zoneSystem.detectZone(3300, 500)).toBe('plaza');
    });

    it('returns plaza for position at plaza origin (3200, 0)', () => {
      // Position (3200, 0) is at the top-left corner of plaza
      expect(zoneSystem.detectZone(3200, 0)).toBe('plaza');
    });

    it('returns plaza for position at plaza bottom-right boundary', () => {
      // Position (4159, 1279) is just inside plaza bottom-right corner
      // (3200 + 960 = 4160, 0 + 1280 = 1280, so 4159, 1279 is inside)
      expect(zoneSystem.detectZone(4159, 1279)).toBe('plaza');
    });

    it('returns null for position outside all zones', () => {
      // Position (5000, 500) is outside plaza (plaza ends at x=4160)
      expect(zoneSystem.detectZone(5000, 500)).toBeNull();
    });

    it('returns null for position just outside plaza to the right', () => {
      // Position (4160, 100) is at x=4160 which is plaza.x + plaza.width
      expect(zoneSystem.detectZone(4160, 100)).toBeNull();
    });
  });

  describe('updateEntityZone', () => {
    it('fires zone.enter event when entity enters plaza', () => {
      const entity = new EntitySchema('entity_1', 'human', 'Test', 'room_1');

      const result = zoneSystem.updateEntityZone('entity_1', 3300, 500, eventLog, 'room_1', entity);

      expect(result.currentZone).toBe('plaza');
      expect(result.changed).toBe(true);

      const { events } = eventLog.getSince('', 10);
      const enterEvent = events.find(
        e => e.type === 'zone.enter' && (e.payload as any).zoneId === 'plaza'
      );

      expect(enterEvent).toBeDefined();
      expect((enterEvent?.payload as any).entityId).toBe('entity_1');
    });

    it('updates entity currentZone to plaza when entity enters', () => {
      const entity = new EntitySchema('entity_1', 'human', 'Test', 'room_1');

      zoneSystem.updateEntityZone('entity_1', 3300, 500, eventLog, 'room_1', entity);

      expect(entity.currentZone).toBe('plaza');
    });

    it('tracks entity zone correctly for plaza', () => {
      zoneSystem.updateEntityZone('entity_1', 3300, 500);

      expect(zoneSystem.getEntityZone('entity_1')).toBe('plaza');
    });
  });

  describe('zone population', () => {
    it('returns correct population for plaza zone', () => {
      zoneSystem.updateEntityZone('entity_1', 3300, 500);
      zoneSystem.updateEntityZone('entity_2', 3400, 600);

      expect(zoneSystem.getZonePopulation('plaza')).toBe(2);
    });

    it('returns entities in plaza zone', () => {
      zoneSystem.updateEntityZone('entity_1', 3300, 500);
      zoneSystem.updateEntityZone('entity_2', 3400, 600);

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

      expect(bounds).toEqual({ x: 3200, y: 0, width: 960, height: 1280 });
    });
  });
});
