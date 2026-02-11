import { describe, it, expect, beforeEach } from 'vitest';
import { ZoneSystem, DEFAULT_ZONE_BOUNDS } from '../../packages/server/src/zone/ZoneSystem.js';
import { EventLog } from '../../packages/server/src/events/EventLog.js';
import { EntitySchema } from '../../packages/server/src/schemas/EntitySchema.js';

describe('ZoneSystem - 64x64 Grid-Town Layout (2048x2048 pixels)', () => {
  let zoneSystem: ZoneSystem;
  let eventLog: EventLog;

  beforeEach(() => {
    zoneSystem = new ZoneSystem(DEFAULT_ZONE_BOUNDS);
    eventLog = new EventLog(60000, 1000);
  });

  describe('DEFAULT_ZONE_BOUNDS matches 64x64 Grid-Town spec', () => {
    it('contains all 6 zones', () => {
      expect(DEFAULT_ZONE_BOUNDS.size).toBe(6);
      expect(DEFAULT_ZONE_BOUNDS.has('plaza')).toBe(true);
      expect(DEFAULT_ZONE_BOUNDS.has('north-block')).toBe(true);
      expect(DEFAULT_ZONE_BOUNDS.has('east-block')).toBe(true);
      expect(DEFAULT_ZONE_BOUNDS.has('west-block')).toBe(true);
      expect(DEFAULT_ZONE_BOUNDS.has('south-block')).toBe(true);
      expect(DEFAULT_ZONE_BOUNDS.has('lake')).toBe(true);
    });

    it('plaza has correct bounds (768,768,512,512)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('plaza');
      expect(bounds).toEqual({ x: 768, y: 768, width: 512, height: 512 });
    });

    it('north-block has correct bounds (576,64,768,384)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('north-block');
      expect(bounds).toEqual({ x: 576, y: 64, width: 768, height: 384 });
    });

    it('west-block has correct bounds (64,704,640,640)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('west-block');
      expect(bounds).toEqual({ x: 64, y: 704, width: 640, height: 640 });
    });

    it('east-block has correct bounds (1472,704,576,640)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('east-block');
      expect(bounds).toEqual({ x: 1472, y: 704, width: 576, height: 640 });
    });

    it('south-block has correct bounds (576,1472,768,384)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('south-block');
      expect(bounds).toEqual({ x: 576, y: 1472, width: 768, height: 384 });
    });

    it('lake has correct bounds (1408,1408,640,640)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('lake');
      expect(bounds).toEqual({ x: 1408, y: 1408, width: 640, height: 640 });
    });
  });

  describe('detectZone with 64x64 Grid-Town positions', () => {
    describe('plaza zone (768,768) to (1280,1280)', () => {
      it('detects plaza at center (1024,1024)', () => {
        expect(zoneSystem.detectZone(1024, 1024)).toBe('plaza');
      });

      it('detects plaza at origin (768,768)', () => {
        expect(zoneSystem.detectZone(768, 768)).toBe('plaza');
      });

      it('detects plaza just inside right edge (1279,1024)', () => {
        expect(zoneSystem.detectZone(1279, 1024)).toBe('plaza');
      });

      it('returns null just outside plaza right edge (1280,1024)', () => {
        expect(zoneSystem.detectZone(1280, 1024)).toBeNull();
      });

      it('detects plaza just inside bottom edge (1024,1279)', () => {
        expect(zoneSystem.detectZone(1024, 1279)).toBe('plaza');
      });
    });

    describe('north-block zone (576,64) to (1344,448)', () => {
      it('detects north-block at center (960,256)', () => {
        expect(zoneSystem.detectZone(960, 256)).toBe('north-block');
      });

      it('detects north-block at origin (576,64)', () => {
        expect(zoneSystem.detectZone(576, 64)).toBe('north-block');
      });

      it('detects north-block just inside bottom-right (1343,447)', () => {
        expect(zoneSystem.detectZone(1343, 447)).toBe('north-block');
      });
    });

    describe('west-block zone (64,704) to (704,1344)', () => {
      it('detects west-block at center (384,1024)', () => {
        expect(zoneSystem.detectZone(384, 1024)).toBe('west-block');
      });

      it('detects west-block at origin (64,704)', () => {
        expect(zoneSystem.detectZone(64, 704)).toBe('west-block');
      });

      it('detects west-block just inside bottom-right (703,1343)', () => {
        expect(zoneSystem.detectZone(703, 1343)).toBe('west-block');
      });
    });

    describe('east-block zone (1472,704) to (2048,1344)', () => {
      it('detects east-block at center (1760,1024)', () => {
        expect(zoneSystem.detectZone(1760, 1024)).toBe('east-block');
      });

      it('detects east-block at origin (1472,704)', () => {
        expect(zoneSystem.detectZone(1472, 704)).toBe('east-block');
      });

      it('detects east-block just inside bottom-right (2047,1343)', () => {
        expect(zoneSystem.detectZone(2047, 1343)).toBe('east-block');
      });
    });

    describe('south-block zone (576,1472) to (1344,1856)', () => {
      it('detects south-block at center (960,1664)', () => {
        expect(zoneSystem.detectZone(960, 1664)).toBe('south-block');
      });

      it('detects south-block at origin (576,1472)', () => {
        expect(zoneSystem.detectZone(576, 1472)).toBe('south-block');
      });

      it('detects south-block just inside bottom-right (1343,1855)', () => {
        expect(zoneSystem.detectZone(1343, 1855)).toBe('south-block');
      });
    });

    describe('lake zone (1408,1408) to (2048,2048)', () => {
      it('detects lake at center (1728,1728)', () => {
        expect(zoneSystem.detectZone(1728, 1728)).toBe('lake');
      });

      it('detects lake at origin (1408,1408)', () => {
        expect(zoneSystem.detectZone(1408, 1408)).toBe('lake');
      });

      it('detects lake just inside bottom-right (2047,2047)', () => {
        expect(zoneSystem.detectZone(2047, 2047)).toBe('lake');
      });
    });

    describe('outside all zones', () => {
      it('returns null for position (0,0)', () => {
        expect(zoneSystem.detectZone(0, 0)).toBeNull();
      });

      it('returns null for position beyond map (2100,2100)', () => {
        expect(zoneSystem.detectZone(2100, 2100)).toBeNull();
      });

      it('returns null for gap between zones (800,600)', () => {
        expect(zoneSystem.detectZone(800, 600)).toBeNull();
      });
    });
  });

  describe('spawn points are inside correct zones', () => {
    it('spawn_plaza position (1024,1024) is inside plaza', () => {
      expect(zoneSystem.detectZone(1024, 1024)).toBe('plaza');
    });

    it('spawn_north_block position (960,256) is inside north-block', () => {
      expect(zoneSystem.detectZone(960, 256)).toBe('north-block');
    });

    it('spawn_west_block position (384,1024) is inside west-block', () => {
      expect(zoneSystem.detectZone(384, 1024)).toBe('west-block');
    });

    it('spawn_east_block position (1760,1024) is inside east-block', () => {
      expect(zoneSystem.detectZone(1760, 1024)).toBe('east-block');
    });

    it('spawn_south_block position (960,1664) is inside south-block', () => {
      expect(zoneSystem.detectZone(960, 1664)).toBe('south-block');
    });

    it('spawn_lake position (1728,1728) is inside lake', () => {
      expect(zoneSystem.detectZone(1728, 1728)).toBe('lake');
    });
  });

  describe('zone transitions in 64x64 Grid-Town layout', () => {
    it('transitions from plaza to north-block via vertical movement', () => {
      zoneSystem.updateEntityZone('entity_1', 1024, 900, eventLog, 'room_1');
      expect(zoneSystem.getEntityZone('entity_1')).toBe('plaza');

      const result = zoneSystem.updateEntityZone('entity_1', 1024, 400, eventLog, 'room_1');

      expect(result.previousZone).toBe('plaza');
      expect(result.currentZone).toBe('north-block');
      expect(result.changed).toBe(true);
    });

    it('transitions from plaza to west-block via horizontal movement', () => {
      zoneSystem.updateEntityZone('entity_1', 900, 1024, eventLog, 'room_1');
      expect(zoneSystem.getEntityZone('entity_1')).toBe('plaza');

      const result = zoneSystem.updateEntityZone('entity_1', 400, 1024, eventLog, 'room_1');

      expect(result.previousZone).toBe('plaza');
      expect(result.currentZone).toBe('west-block');
      expect(result.changed).toBe(true);
    });

    it('transitions from plaza to east-block via horizontal movement', () => {
      zoneSystem.updateEntityZone('entity_1', 1100, 1024, eventLog, 'room_1');
      expect(zoneSystem.getEntityZone('entity_1')).toBe('plaza');

      const result = zoneSystem.updateEntityZone('entity_1', 1600, 1024, eventLog, 'room_1');

      expect(result.previousZone).toBe('plaza');
      expect(result.currentZone).toBe('east-block');
      expect(result.changed).toBe(true);
    });

    it('transitions from plaza to south-block via vertical movement', () => {
      zoneSystem.updateEntityZone('entity_1', 1024, 1100, eventLog, 'room_1');
      expect(zoneSystem.getEntityZone('entity_1')).toBe('plaza');

      const result = zoneSystem.updateEntityZone('entity_1', 1024, 1600, eventLog, 'room_1');

      expect(result.previousZone).toBe('plaza');
      expect(result.currentZone).toBe('south-block');
      expect(result.changed).toBe(true);
    });

    it('emits zone.exit and zone.enter events on transition', () => {
      const entity = new EntitySchema('entity_1', 'human', 'Test', 'room_1');

      zoneSystem.updateEntityZone('entity_1', 1024, 900, eventLog, 'room_1', entity);
      zoneSystem.updateEntityZone('entity_1', 1024, 400, eventLog, 'room_1', entity);

      const { events } = eventLog.getSince('', 10);

      const exitPlaza = events.find(
        e => e.type === 'zone.exit' && (e.payload as { zoneId: string }).zoneId === 'plaza'
      );
      const enterNorthBlock = events.find(
        e => e.type === 'zone.enter' && (e.payload as { zoneId: string }).zoneId === 'north-block'
      );

      expect(exitPlaza).toBeDefined();
      expect(enterNorthBlock).toBeDefined();
      expect((exitPlaza?.payload as { nextZoneId: string }).nextZoneId).toBe('north-block');
      expect((enterNorthBlock?.payload as { previousZoneId: string }).previousZoneId).toBe('plaza');
    });
  });

  describe('zone populations in 64x64 Grid-Town layout', () => {
    it('tracks population across all 6 zones', () => {
      zoneSystem.updateEntityZone('e1', 1024, 1024); // plaza
      zoneSystem.updateEntityZone('e2', 960, 256); // north-block
      zoneSystem.updateEntityZone('e3', 384, 1024); // west-block
      zoneSystem.updateEntityZone('e4', 1760, 1024); // east-block
      zoneSystem.updateEntityZone('e5', 960, 1664); // south-block
      zoneSystem.updateEntityZone('e6', 1728, 1728); // lake

      expect(zoneSystem.getZonePopulation('plaza')).toBe(1);
      expect(zoneSystem.getZonePopulation('north-block')).toBe(1);
      expect(zoneSystem.getZonePopulation('west-block')).toBe(1);
      expect(zoneSystem.getZonePopulation('east-block')).toBe(1);
      expect(zoneSystem.getZonePopulation('south-block')).toBe(1);
      expect(zoneSystem.getZonePopulation('lake')).toBe(1);
    });

    it('getEntitiesInZone returns correct entities', () => {
      zoneSystem.updateEntityZone('agent_1', 1000, 1000); // plaza
      zoneSystem.updateEntityZone('agent_2', 1100, 1100); // plaza
      zoneSystem.updateEntityZone('agent_3', 960, 256); // north-block

      const plazaEntities = zoneSystem.getEntitiesInZone('plaza');
      const northBlockEntities = zoneSystem.getEntitiesInZone('north-block');

      expect(plazaEntities).toHaveLength(2);
      expect(plazaEntities).toContain('agent_1');
      expect(plazaEntities).toContain('agent_2');
      expect(northBlockEntities).toHaveLength(1);
      expect(northBlockEntities).toContain('agent_3');
    });
  });

  describe('getZoneBounds returns 64x64 Grid-Town spec values', () => {
    it('returns correct bounds for all zones', () => {
      expect(zoneSystem.getZoneBounds('plaza')).toEqual({
        x: 768,
        y: 768,
        width: 512,
        height: 512,
      });
      expect(zoneSystem.getZoneBounds('north-block')).toEqual({
        x: 576,
        y: 64,
        width: 768,
        height: 384,
      });
      expect(zoneSystem.getZoneBounds('west-block')).toEqual({
        x: 64,
        y: 704,
        width: 640,
        height: 640,
      });
      expect(zoneSystem.getZoneBounds('east-block')).toEqual({
        x: 1472,
        y: 704,
        width: 576,
        height: 640,
      });
      expect(zoneSystem.getZoneBounds('south-block')).toEqual({
        x: 576,
        y: 1472,
        width: 768,
        height: 384,
      });
      expect(zoneSystem.getZoneBounds('lake')).toEqual({
        x: 1408,
        y: 1408,
        width: 640,
        height: 640,
      });
    });
  });

  describe('getZoneIds', () => {
    it('returns all 6 zone IDs', () => {
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
});
