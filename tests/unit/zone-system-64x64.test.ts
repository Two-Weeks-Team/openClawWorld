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

  describe('DEFAULT_ZONE_BOUNDS matches 8-zone Grid-Town spec', () => {
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

  describe('detectZone with 8-zone Grid-Town positions', () => {
    describe('lobby zone (192,64) to (576,448)', () => {
      it('detects lobby at center (384,256)', () => {
        expect(zoneSystem.detectZone(384, 256)).toBe('lobby');
      });

      it('detects lobby at origin (192,64)', () => {
        expect(zoneSystem.detectZone(192, 64)).toBe('lobby');
      });

      it('detects lobby just inside right edge (575,256)', () => {
        expect(zoneSystem.detectZone(575, 256)).toBe('lobby');
      });
    });

    describe('office zone (1344,64) to (1984,512)', () => {
      it('detects office at center (1664,288)', () => {
        expect(zoneSystem.detectZone(1664, 288)).toBe('office');
      });

      it('detects office at origin (1344,64)', () => {
        expect(zoneSystem.detectZone(1344, 64)).toBe('office');
      });
    });

    describe('central-park zone (640,512) to (1408,1152)', () => {
      it('detects central-park at center (1024,832)', () => {
        expect(zoneSystem.detectZone(1024, 832)).toBe('central-park');
      });

      it('detects central-park at origin (640,512)', () => {
        expect(zoneSystem.detectZone(640, 512)).toBe('central-park');
      });
    });

    describe('arcade zone (1408,512) to (1984,1024)', () => {
      it('detects arcade at center (1696,768)', () => {
        expect(zoneSystem.detectZone(1696, 768)).toBe('arcade');
      });

      it('detects arcade at origin (1408,512)', () => {
        expect(zoneSystem.detectZone(1408, 512)).toBe('arcade');
      });
    });

    describe('meeting zone (64,896) to (576,1472)', () => {
      it('detects meeting at center (320,1184)', () => {
        expect(zoneSystem.detectZone(320, 1184)).toBe('meeting');
      });

      it('detects meeting at origin (64,896)', () => {
        expect(zoneSystem.detectZone(64, 896)).toBe('meeting');
      });
    });

    describe('lounge-cafe zone (576,1216) to (1216,1664)', () => {
      it('detects lounge-cafe at center (896,1440)', () => {
        expect(zoneSystem.detectZone(896, 1440)).toBe('lounge-cafe');
      });

      it('detects lounge-cafe at origin (576,1216)', () => {
        expect(zoneSystem.detectZone(576, 1216)).toBe('lounge-cafe');
      });
    });

    describe('plaza zone (1216,1216) to (1728,1728)', () => {
      it('detects plaza at center (1472,1472)', () => {
        expect(zoneSystem.detectZone(1472, 1472)).toBe('plaza');
      });

      it('detects plaza at origin (1216,1216)', () => {
        expect(zoneSystem.detectZone(1216, 1216)).toBe('plaza');
      });

      it('detects plaza just inside right edge (1727,1472)', () => {
        expect(zoneSystem.detectZone(1727, 1472)).toBe('plaza');
      });
    });

    describe('lake zone (64,64) to (192,512)', () => {
      it('detects lake at center (128,288)', () => {
        expect(zoneSystem.detectZone(128, 288)).toBe('lake');
      });

      it('detects lake at origin (64,64)', () => {
        expect(zoneSystem.detectZone(64, 64)).toBe('lake');
      });
    });

    describe('outside all zones', () => {
      it('returns null for position (0,0)', () => {
        expect(zoneSystem.detectZone(0, 0)).toBeNull();
      });

      it('returns null for position beyond map (2100,2100)', () => {
        expect(zoneSystem.detectZone(2100, 2100)).toBeNull();
      });

      it('returns null for gap between zones', () => {
        expect(zoneSystem.detectZone(600, 200)).toBeNull();
      });
    });
  });

  describe('spawn points are inside correct zones', () => {
    it('spawn position (384,256) is inside lobby', () => {
      expect(zoneSystem.detectZone(384, 256)).toBe('lobby');
    });

    it('spawn position (1664,288) is inside office', () => {
      expect(zoneSystem.detectZone(1664, 288)).toBe('office');
    });

    it('spawn position (1024,832) is inside central-park', () => {
      expect(zoneSystem.detectZone(1024, 832)).toBe('central-park');
    });

    it('spawn position (1696,768) is inside arcade', () => {
      expect(zoneSystem.detectZone(1696, 768)).toBe('arcade');
    });

    it('spawn position (320,1184) is inside meeting', () => {
      expect(zoneSystem.detectZone(320, 1184)).toBe('meeting');
    });

    it('spawn position (896,1440) is inside lounge-cafe', () => {
      expect(zoneSystem.detectZone(896, 1440)).toBe('lounge-cafe');
    });

    it('spawn position (1472,1472) is inside plaza', () => {
      expect(zoneSystem.detectZone(1472, 1472)).toBe('plaza');
    });

    it('spawn position (128,288) is inside lake', () => {
      expect(zoneSystem.detectZone(128, 288)).toBe('lake');
    });
  });

  describe('zone transitions in 8-zone Grid-Town layout', () => {
    it('transitions from lobby to central-park via vertical movement', () => {
      zoneSystem.updateEntityZone('entity_1', 384, 256, eventLog, 'room_1');
      expect(zoneSystem.getEntityZone('entity_1')).toBe('lobby');

      const result = zoneSystem.updateEntityZone('entity_1', 700, 600, eventLog, 'room_1');

      expect(result.previousZone).toBe('lobby');
      expect(result.currentZone).toBe('central-park');
      expect(result.changed).toBe(true);
    });

    it('transitions from central-park to arcade via horizontal movement', () => {
      zoneSystem.updateEntityZone('entity_1', 1000, 700, eventLog, 'room_1');
      expect(zoneSystem.getEntityZone('entity_1')).toBe('central-park');

      const result = zoneSystem.updateEntityZone('entity_1', 1500, 700, eventLog, 'room_1');

      expect(result.previousZone).toBe('central-park');
      expect(result.currentZone).toBe('arcade');
      expect(result.changed).toBe(true);
    });

    it('transitions from central-park to lounge-cafe via vertical movement', () => {
      zoneSystem.updateEntityZone('entity_1', 800, 800, eventLog, 'room_1');
      expect(zoneSystem.getEntityZone('entity_1')).toBe('central-park');

      const result = zoneSystem.updateEntityZone('entity_1', 800, 1300, eventLog, 'room_1');

      expect(result.previousZone).toBe('central-park');
      expect(result.currentZone).toBe('lounge-cafe');
      expect(result.changed).toBe(true);
    });

    it('transitions from lounge-cafe to plaza via horizontal movement', () => {
      zoneSystem.updateEntityZone('entity_1', 800, 1400, eventLog, 'room_1');
      expect(zoneSystem.getEntityZone('entity_1')).toBe('lounge-cafe');

      const result = zoneSystem.updateEntityZone('entity_1', 1300, 1400, eventLog, 'room_1');

      expect(result.previousZone).toBe('lounge-cafe');
      expect(result.currentZone).toBe('plaza');
      expect(result.changed).toBe(true);
    });

    it('emits zone.exit and zone.enter events on transition', () => {
      const entity = new EntitySchema('entity_1', 'human', 'Test', 'room_1');

      zoneSystem.updateEntityZone('entity_1', 384, 256, eventLog, 'room_1', entity);
      zoneSystem.updateEntityZone('entity_1', 700, 600, eventLog, 'room_1', entity);

      const { events } = eventLog.getSince('', 10);

      const exitLobby = events.find(
        e => e.type === 'zone.exit' && (e.payload as { zoneId: string }).zoneId === 'lobby'
      );
      const enterCentralPark = events.find(
        e => e.type === 'zone.enter' && (e.payload as { zoneId: string }).zoneId === 'central-park'
      );

      expect(exitLobby).toBeDefined();
      expect(enterCentralPark).toBeDefined();
      expect((exitLobby?.payload as { nextZoneId: string }).nextZoneId).toBe('central-park');
      expect((enterCentralPark?.payload as { previousZoneId: string }).previousZoneId).toBe(
        'lobby'
      );
    });
  });

  describe('zone populations in 8-zone Grid-Town layout', () => {
    it('tracks population across all 8 zones', () => {
      zoneSystem.updateEntityZone('e1', 384, 256); // lobby
      zoneSystem.updateEntityZone('e2', 1664, 288); // office
      zoneSystem.updateEntityZone('e3', 1024, 832); // central-park
      zoneSystem.updateEntityZone('e4', 1696, 768); // arcade
      zoneSystem.updateEntityZone('e5', 320, 1184); // meeting
      zoneSystem.updateEntityZone('e6', 896, 1440); // lounge-cafe
      zoneSystem.updateEntityZone('e7', 1472, 1472); // plaza
      zoneSystem.updateEntityZone('e8', 128, 288); // lake

      expect(zoneSystem.getZonePopulation('lobby')).toBe(1);
      expect(zoneSystem.getZonePopulation('office')).toBe(1);
      expect(zoneSystem.getZonePopulation('central-park')).toBe(1);
      expect(zoneSystem.getZonePopulation('arcade')).toBe(1);
      expect(zoneSystem.getZonePopulation('meeting')).toBe(1);
      expect(zoneSystem.getZonePopulation('lounge-cafe')).toBe(1);
      expect(zoneSystem.getZonePopulation('plaza')).toBe(1);
      expect(zoneSystem.getZonePopulation('lake')).toBe(1);
    });

    it('getEntitiesInZone returns correct entities', () => {
      zoneSystem.updateEntityZone('agent_1', 1024, 832); // central-park
      zoneSystem.updateEntityZone('agent_2', 1100, 900); // central-park
      zoneSystem.updateEntityZone('agent_3', 1696, 768); // arcade

      const centralParkEntities = zoneSystem.getEntitiesInZone('central-park');
      const arcadeEntities = zoneSystem.getEntitiesInZone('arcade');

      expect(centralParkEntities).toHaveLength(2);
      expect(centralParkEntities).toContain('agent_1');
      expect(centralParkEntities).toContain('agent_2');
      expect(arcadeEntities).toHaveLength(1);
      expect(arcadeEntities).toContain('agent_3');
    });
  });

  describe('getZoneBounds returns 8-zone Grid-Town spec values', () => {
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

  describe('zone boundary edge cases', () => {
    describe('lake/lobby boundary at x=192', () => {
      // Lake: (64,64) to (192,512) - ends at x=191 (exclusive)
      // Lobby: (192,64) to (576,448) - starts at x=192 (inclusive)

      it('detects lake at x=191 (last pixel before lobby)', () => {
        expect(zoneSystem.detectZone(191, 100)).toBe('lake');
      });

      it('detects lobby at x=192 (first pixel of lobby)', () => {
        expect(zoneSystem.detectZone(192, 100)).toBe('lobby');
      });

      it('detects lake at x=64 (left edge of lake)', () => {
        expect(zoneSystem.detectZone(64, 100)).toBe('lake');
      });
    });

    describe('central-park/arcade boundary at x=1408', () => {
      // Central-park: (640,512) to (1408,1152) - ends at x=1407
      // Arcade: (1408,512) to (1984,1024) - starts at x=1408

      it('detects central-park at x=1407 (last pixel before arcade)', () => {
        expect(zoneSystem.detectZone(1407, 700)).toBe('central-park');
      });

      it('detects arcade at x=1408 (first pixel of arcade)', () => {
        expect(zoneSystem.detectZone(1408, 700)).toBe('arcade');
      });
    });

    describe('lounge-cafe/plaza boundary at x=1216', () => {
      // Lounge-cafe: (576,1216) to (1216,1664) - ends at x=1215
      // Plaza: (1216,1216) to (1728,1728) - starts at x=1216

      it('detects lounge-cafe at x=1215 (last pixel before plaza)', () => {
        expect(zoneSystem.detectZone(1215, 1300)).toBe('lounge-cafe');
      });

      it('detects plaza at x=1216 (first pixel of plaza)', () => {
        expect(zoneSystem.detectZone(1216, 1300)).toBe('plaza');
      });
    });

    describe('vertical boundaries', () => {
      // Lake: y=64 to y=512 (ends at y=511)
      // Meeting: y=896 to y=1472 (starts at y=896)

      it('detects lake at y=511 (last pixel before gap)', () => {
        expect(zoneSystem.detectZone(100, 511)).toBe('lake');
      });

      it('detects null in gap between lake and meeting', () => {
        expect(zoneSystem.detectZone(100, 600)).toBeNull();
      });

      it('detects meeting at y=896 (first pixel of meeting)', () => {
        expect(zoneSystem.detectZone(100, 896)).toBe('meeting');
      });
    });
  });
});
