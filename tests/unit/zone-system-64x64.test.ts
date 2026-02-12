import { describe, it, expect, beforeEach } from 'vitest';
import { ZoneSystem, DEFAULT_ZONE_BOUNDS } from '../../packages/server/src/zone/ZoneSystem.js';
import { EventLog } from '../../packages/server/src/events/EventLog.js';
import { EntitySchema } from '../../packages/server/src/schemas/EntitySchema.js';

describe('ZoneSystem - New 8-Zone Layout', () => {
  let zoneSystem: ZoneSystem;
  let eventLog: EventLog;

  beforeEach(() => {
    zoneSystem = new ZoneSystem(DEFAULT_ZONE_BOUNDS);
    eventLog = new EventLog(60000, 1000);
  });

  describe('DEFAULT_ZONE_BOUNDS matches new 8-zone spec', () => {
    it('contains all 8 zones', () => {
      expect(DEFAULT_ZONE_BOUNDS.size).toBe(8);
      expect(DEFAULT_ZONE_BOUNDS.has('lobby')).toBe(true);
      expect(DEFAULT_ZONE_BOUNDS.has('office')).toBe(true);
      expect(DEFAULT_ZONE_BOUNDS.has('central-park')).toBe(true);
      expect(DEFAULT_ZONE_BOUNDS.has('arcade')).toBe(true);
      expect(DEFAULT_ZONE_BOUNDS.has('meeting')).toBe(true);
      expect(DEFAULT_ZONE_BOUNDS.has('lounge-cafe')).toBe(true);
      expect(DEFAULT_ZONE_BOUNDS.has('plaza')).toBe(true);
      expect(DEFAULT_ZONE_BOUNDS.has('lake')).toBe(true);
    });

    it('lobby has correct bounds (192,64,384,384)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('lobby');
      expect(bounds).toEqual({ x: 192, y: 64, width: 384, height: 384 });
    });

    it('office has correct bounds (1344,64,640,448)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('office');
      expect(bounds).toEqual({ x: 1344, y: 64, width: 640, height: 448 });
    });

    it('central-park has correct bounds (640,512,768,640)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('central-park');
      expect(bounds).toEqual({ x: 640, y: 512, width: 768, height: 640 });
    });

    it('arcade has correct bounds (1408,512,576,512)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('arcade');
      expect(bounds).toEqual({ x: 1408, y: 512, width: 576, height: 512 });
    });

    it('meeting has correct bounds (64,896,512,576)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('meeting');
      expect(bounds).toEqual({ x: 64, y: 896, width: 512, height: 576 });
    });

    it('lounge-cafe has correct bounds (576,1216,640,448)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('lounge-cafe');
      expect(bounds).toEqual({ x: 576, y: 1216, width: 640, height: 448 });
    });

    it('plaza has correct bounds (1216,1216,512,512)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('plaza');
      expect(bounds).toEqual({ x: 1216, y: 1216, width: 512, height: 512 });
    });

    it('lake has correct bounds (64,64,128,448)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('lake');
      expect(bounds).toEqual({ x: 64, y: 64, width: 128, height: 448 });
    });
  });

  describe('detectZone with new 8-zone layout positions', () => {
    describe('plaza zone (1216,1216) to (1727,1727)', () => {
      it('detects plaza at center (1472,1472)', () => {
        expect(zoneSystem.detectZone(1472, 1472)).toBe('plaza');
      });

      it('detects plaza at origin (1216,1216)', () => {
        expect(zoneSystem.detectZone(1216, 1216)).toBe('plaza');
      });

      it('detects plaza just inside right edge (1727,1472)', () => {
        expect(zoneSystem.detectZone(1727, 1472)).toBe('plaza');
      });

      it('returns null just outside plaza right edge (1728,1472)', () => {
        expect(zoneSystem.detectZone(1728, 1472)).toBeNull();
      });

      it('detects plaza just inside bottom edge (1472,1727)', () => {
        expect(zoneSystem.detectZone(1472, 1727)).toBe('plaza');
      });
    });

    describe('lobby zone (192,64) to (575,447)', () => {
      it('detects lobby at center (384,256)', () => {
        expect(zoneSystem.detectZone(384, 256)).toBe('lobby');
      });

      it('detects lobby at origin (192,64)', () => {
        expect(zoneSystem.detectZone(192, 64)).toBe('lobby');
      });

      it('detects lobby just inside bottom-right (575,447)', () => {
        expect(zoneSystem.detectZone(575, 447)).toBe('lobby');
      });
    });

    describe('office zone (1344,64) to (1983,511)', () => {
      it('detects office at center (1664,288)', () => {
        expect(zoneSystem.detectZone(1664, 288)).toBe('office');
      });

      it('detects office at origin (1344,64)', () => {
        expect(zoneSystem.detectZone(1344, 64)).toBe('office');
      });

      it('detects office just inside bottom-right (1983,511)', () => {
        expect(zoneSystem.detectZone(1983, 511)).toBe('office');
      });
    });

    describe('central-park zone (640,512) to (1407,1151)', () => {
      it('detects central-park at center (1024,832)', () => {
        expect(zoneSystem.detectZone(1024, 832)).toBe('central-park');
      });

      it('detects central-park at origin (640,512)', () => {
        expect(zoneSystem.detectZone(640, 512)).toBe('central-park');
      });

      it('detects central-park just inside bottom-right (1407,1151)', () => {
        expect(zoneSystem.detectZone(1407, 1151)).toBe('central-park');
      });
    });

    describe('arcade zone (1408,512) to (1983,1023)', () => {
      it('detects arcade at center (1696,768)', () => {
        expect(zoneSystem.detectZone(1696, 768)).toBe('arcade');
      });

      it('detects arcade at origin (1408,512)', () => {
        expect(zoneSystem.detectZone(1408, 512)).toBe('arcade');
      });

      it('detects arcade just inside bottom-right (1983,1023)', () => {
        expect(zoneSystem.detectZone(1983, 1023)).toBe('arcade');
      });
    });

    describe('meeting zone (64,896) to (575,1471)', () => {
      it('detects meeting at center (320,1184)', () => {
        expect(zoneSystem.detectZone(320, 1184)).toBe('meeting');
      });

      it('detects meeting at origin (64,896)', () => {
        expect(zoneSystem.detectZone(64, 896)).toBe('meeting');
      });

      it('detects meeting just inside bottom-right (575,1471)', () => {
        expect(zoneSystem.detectZone(575, 1471)).toBe('meeting');
      });
    });

    describe('lounge-cafe zone (576,1216) to (1215,1663)', () => {
      it('detects lounge-cafe at center (896,1440)', () => {
        expect(zoneSystem.detectZone(896, 1440)).toBe('lounge-cafe');
      });

      it('detects lounge-cafe at origin (576,1216)', () => {
        expect(zoneSystem.detectZone(576, 1216)).toBe('lounge-cafe');
      });

      it('detects lounge-cafe just inside bottom-right (1215,1663)', () => {
        expect(zoneSystem.detectZone(1215, 1663)).toBe('lounge-cafe');
      });
    });

    describe('lake zone (64,64) to (191,511)', () => {
      it('detects lake at center (128,288)', () => {
        expect(zoneSystem.detectZone(128, 288)).toBe('lake');
      });

      it('detects lake at origin (64,64)', () => {
        expect(zoneSystem.detectZone(64, 64)).toBe('lake');
      });

      it('detects lake just inside bottom-right (191,511)', () => {
        expect(zoneSystem.detectZone(191, 511)).toBe('lake');
      });
    });

    describe('outside all zones', () => {
      it('returns null for position (0,0)', () => {
        expect(zoneSystem.detectZone(0, 0)).toBeNull();
      });

      it('returns null for position beyond map (2100,2100)', () => {
        expect(zoneSystem.detectZone(2100, 2100)).toBeNull();
      });

      it('returns null for gap between zones (1000,100)', () => {
        expect(zoneSystem.detectZone(1000, 100)).toBeNull();
      });
    });
  });

  describe('spawn points are inside correct zones', () => {
    it('spawn_plaza position (1472,1472) is inside plaza', () => {
      expect(zoneSystem.detectZone(1472, 1472)).toBe('plaza');
    });

    it('spawn_lobby position (384,256) is inside lobby', () => {
      expect(zoneSystem.detectZone(384, 256)).toBe('lobby');
    });

    it('spawn_office position (1664,288) is inside office', () => {
      expect(zoneSystem.detectZone(1664, 288)).toBe('office');
    });

    it('spawn_central_park position (1024,832) is inside central-park', () => {
      expect(zoneSystem.detectZone(1024, 832)).toBe('central-park');
    });

    it('spawn_arcade position (1696,768) is inside arcade', () => {
      expect(zoneSystem.detectZone(1696, 768)).toBe('arcade');
    });

    it('spawn_meeting position (320,1184) is inside meeting', () => {
      expect(zoneSystem.detectZone(320, 1184)).toBe('meeting');
    });

    it('spawn_lounge_cafe position (896,1440) is inside lounge-cafe', () => {
      expect(zoneSystem.detectZone(896, 1440)).toBe('lounge-cafe');
    });

    it('spawn_lake position (128,288) is inside lake', () => {
      expect(zoneSystem.detectZone(128, 288)).toBe('lake');
    });
  });

  describe('zone transitions in new 8-zone layout', () => {
    it('transitions from central-park to office via movement', () => {
      zoneSystem.updateEntityZone('entity_1', 1100, 832, eventLog, 'room_1');
      expect(zoneSystem.getEntityZone('entity_1')).toBe('central-park');

      const result = zoneSystem.updateEntityZone('entity_1', 1400, 288, eventLog, 'room_1');

      expect(result.previousZone).toBe('central-park');
      expect(result.currentZone).toBe('office');
      expect(result.changed).toBe(true);
    });

    it('transitions from central-park to meeting via movement', () => {
      zoneSystem.updateEntityZone('entity_1', 700, 900, eventLog, 'room_1');
      expect(zoneSystem.getEntityZone('entity_1')).toBe('central-park');

      const result = zoneSystem.updateEntityZone('entity_1', 300, 1100, eventLog, 'room_1');

      expect(result.previousZone).toBe('central-park');
      expect(result.currentZone).toBe('meeting');
      expect(result.changed).toBe(true);
    });

    it('transitions from central-park to arcade via movement', () => {
      zoneSystem.updateEntityZone('entity_1', 1300, 832, eventLog, 'room_1');
      expect(zoneSystem.getEntityZone('entity_1')).toBe('central-park');

      const result = zoneSystem.updateEntityZone('entity_1', 1500, 700, eventLog, 'room_1');

      expect(result.previousZone).toBe('central-park');
      expect(result.currentZone).toBe('arcade');
      expect(result.changed).toBe(true);
    });

    it('transitions from central-park to lounge-cafe via movement', () => {
      zoneSystem.updateEntityZone('entity_1', 900, 1150, eventLog, 'room_1');
      expect(zoneSystem.getEntityZone('entity_1')).toBe('central-park');

      const result = zoneSystem.updateEntityZone('entity_1', 896, 1300, eventLog, 'room_1');

      expect(result.previousZone).toBe('central-park');
      expect(result.currentZone).toBe('lounge-cafe');
      expect(result.changed).toBe(true);
    });

    it('emits zone.exit and zone.enter events on transition', () => {
      const entity = new EntitySchema('entity_1', 'human', 'Test', 'room_1');

      zoneSystem.updateEntityZone('entity_1', 1100, 832, eventLog, 'room_1', entity);
      zoneSystem.updateEntityZone('entity_1', 1400, 288, eventLog, 'room_1', entity);

      const { events } = eventLog.getSince('', 10);

      const exitCentralPark = events.find(
        e => e.type === 'zone.exit' && (e.payload as { zoneId: string }).zoneId === 'central-park'
      );
      const enterOffice = events.find(
        e => e.type === 'zone.enter' && (e.payload as { zoneId: string }).zoneId === 'office'
      );

      expect(exitCentralPark).toBeDefined();
      expect(enterOffice).toBeDefined();
      expect((exitCentralPark?.payload as { nextZoneId: string }).nextZoneId).toBe('office');
      expect((enterOffice?.payload as { previousZoneId: string }).previousZoneId).toBe(
        'central-park'
      );
    });
  });

  describe('zone populations in new 8-zone layout', () => {
    it('tracks population across all 8 zones', () => {
      zoneSystem.updateEntityZone('e1', 1472, 1472);
      zoneSystem.updateEntityZone('e2', 384, 256);
      zoneSystem.updateEntityZone('e3', 1664, 288);
      zoneSystem.updateEntityZone('e4', 1024, 832);
      zoneSystem.updateEntityZone('e5', 1696, 768);
      zoneSystem.updateEntityZone('e6', 320, 1184);
      zoneSystem.updateEntityZone('e7', 896, 1440);
      zoneSystem.updateEntityZone('e8', 128, 288);

      expect(zoneSystem.getZonePopulation('plaza')).toBe(1);
      expect(zoneSystem.getZonePopulation('lobby')).toBe(1);
      expect(zoneSystem.getZonePopulation('office')).toBe(1);
      expect(zoneSystem.getZonePopulation('central-park')).toBe(1);
      expect(zoneSystem.getZonePopulation('arcade')).toBe(1);
      expect(zoneSystem.getZonePopulation('meeting')).toBe(1);
      expect(zoneSystem.getZonePopulation('lounge-cafe')).toBe(1);
      expect(zoneSystem.getZonePopulation('lake')).toBe(1);
    });

    it('getEntitiesInZone returns correct entities', () => {
      zoneSystem.updateEntityZone('agent_1', 1400, 1400); // plaza
      zoneSystem.updateEntityZone('agent_2', 1500, 1500); // plaza
      zoneSystem.updateEntityZone('agent_3', 1664, 288); // office

      const plazaEntities = zoneSystem.getEntitiesInZone('plaza');
      const officeEntities = zoneSystem.getEntitiesInZone('office');

      expect(plazaEntities).toHaveLength(2);
      expect(plazaEntities).toContain('agent_1');
      expect(plazaEntities).toContain('agent_2');
      expect(officeEntities).toHaveLength(1);
      expect(officeEntities).toContain('agent_3');
    });
  });

  describe('getZoneBounds returns new 8-zone spec values', () => {
    it('returns correct bounds for all zones', () => {
      expect(zoneSystem.getZoneBounds('lobby')).toEqual({
        x: 192,
        y: 64,
        width: 384,
        height: 384,
      });
      expect(zoneSystem.getZoneBounds('office')).toEqual({
        x: 1344,
        y: 64,
        width: 640,
        height: 448,
      });
      expect(zoneSystem.getZoneBounds('central-park')).toEqual({
        x: 640,
        y: 512,
        width: 768,
        height: 640,
      });
      expect(zoneSystem.getZoneBounds('arcade')).toEqual({
        x: 1408,
        y: 512,
        width: 576,
        height: 512,
      });
      expect(zoneSystem.getZoneBounds('meeting')).toEqual({
        x: 64,
        y: 896,
        width: 512,
        height: 576,
      });
      expect(zoneSystem.getZoneBounds('lounge-cafe')).toEqual({
        x: 576,
        y: 1216,
        width: 640,
        height: 448,
      });
      expect(zoneSystem.getZoneBounds('plaza')).toEqual({
        x: 1216,
        y: 1216,
        width: 512,
        height: 512,
      });
      expect(zoneSystem.getZoneBounds('lake')).toEqual({
        x: 64,
        y: 64,
        width: 128,
        height: 448,
      });
    });
  });

  describe('getZoneIds', () => {
    it('returns all 8 zone IDs', () => {
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
});
