import { describe, it, expect, beforeEach } from 'vitest';
import { ZoneSystem, DEFAULT_ZONE_BOUNDS } from '../../packages/server/src/zone/ZoneSystem.js';
import { EventLog } from '../../packages/server/src/events/EventLog.js';
import { EntitySchema } from '../../packages/server/src/schemas/EntitySchema.js';

describe('ZoneSystem - 64x64 Grid-Town Layout (1024x1024 pixels)', () => {
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

    it('lobby has correct bounds (96,32,192,192)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('lobby');
      expect(bounds).toEqual({ x: 96, y: 32, width: 192, height: 192 });
    });

    it('office has correct bounds (672,32,320,224)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('office');
      expect(bounds).toEqual({ x: 672, y: 32, width: 320, height: 224 });
    });

    it('central-park has correct bounds (320,256,384,320)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('central-park');
      expect(bounds).toEqual({ x: 320, y: 256, width: 384, height: 320 });
    });

    it('arcade has correct bounds (704,256,288,256)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('arcade');
      expect(bounds).toEqual({ x: 704, y: 256, width: 288, height: 256 });
    });

    it('meeting has correct bounds (32,448,256,288)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('meeting');
      expect(bounds).toEqual({ x: 32, y: 448, width: 256, height: 288 });
    });

    it('lounge-cafe has correct bounds (288,608,320,224)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('lounge-cafe');
      expect(bounds).toEqual({ x: 288, y: 608, width: 320, height: 224 });
    });

    it('plaza has correct bounds (608,608,256,256)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('plaza');
      expect(bounds).toEqual({ x: 608, y: 608, width: 256, height: 256 });
    });

    it('lake has correct bounds (32,32,64,224)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('lake');
      expect(bounds).toEqual({ x: 32, y: 32, width: 64, height: 224 });
    });
  });

  describe('detectZone with new 8-zone layout positions', () => {
    describe('plaza zone (608,608) to (863,863)', () => {
      it('detects plaza at center (736,736)', () => {
        expect(zoneSystem.detectZone(736, 736)).toBe('plaza');
      });

      it('detects plaza at origin (608,608)', () => {
        expect(zoneSystem.detectZone(608, 608)).toBe('plaza');
      });

      it('detects plaza just inside right edge (863,736)', () => {
        expect(zoneSystem.detectZone(863, 736)).toBe('plaza');
      });

      it('returns null just outside plaza right edge (864,736)', () => {
        expect(zoneSystem.detectZone(864, 736)).toBeNull();
      });

      it('detects plaza just inside bottom edge (736,863)', () => {
        expect(zoneSystem.detectZone(736, 863)).toBe('plaza');
      });
    });

    describe('lobby zone (96,32) to (287,223)', () => {
      it('detects lobby at center (192,128)', () => {
        expect(zoneSystem.detectZone(192, 128)).toBe('lobby');
      });

      it('detects lobby at origin (96,32)', () => {
        expect(zoneSystem.detectZone(96, 32)).toBe('lobby');
      });

      it('detects lobby just inside bottom-right (287,223)', () => {
        expect(zoneSystem.detectZone(287, 223)).toBe('lobby');
      });
    });

    describe('office zone (672,32) to (991,255)', () => {
      it('detects office at center (832,144)', () => {
        expect(zoneSystem.detectZone(832, 144)).toBe('office');
      });

      it('detects office at origin (672,32)', () => {
        expect(zoneSystem.detectZone(672, 32)).toBe('office');
      });

      it('detects office just inside bottom-right (991,255)', () => {
        expect(zoneSystem.detectZone(991, 255)).toBe('office');
      });
    });

    describe('central-park zone (320,256) to (703,575)', () => {
      it('detects central-park at center (512,416)', () => {
        expect(zoneSystem.detectZone(512, 416)).toBe('central-park');
      });

      it('detects central-park at origin (320,256)', () => {
        expect(zoneSystem.detectZone(320, 256)).toBe('central-park');
      });

      it('detects central-park just inside bottom-right (703,575)', () => {
        expect(zoneSystem.detectZone(703, 575)).toBe('central-park');
      });
    });

    describe('arcade zone (704,256) to (991,511)', () => {
      it('detects arcade at center (848,384)', () => {
        expect(zoneSystem.detectZone(848, 384)).toBe('arcade');
      });

      it('detects arcade at origin (704,256)', () => {
        expect(zoneSystem.detectZone(704, 256)).toBe('arcade');
      });

      it('detects arcade just inside bottom-right (991,511)', () => {
        expect(zoneSystem.detectZone(991, 511)).toBe('arcade');
      });
    });

    describe('meeting zone (32,448) to (287,735)', () => {
      it('detects meeting at center (160,592)', () => {
        expect(zoneSystem.detectZone(160, 592)).toBe('meeting');
      });

      it('detects meeting at origin (32,448)', () => {
        expect(zoneSystem.detectZone(32, 448)).toBe('meeting');
      });

      it('detects meeting just inside bottom-right (287,735)', () => {
        expect(zoneSystem.detectZone(287, 735)).toBe('meeting');
      });
    });

    describe('lounge-cafe zone (288,608) to (607,831)', () => {
      it('detects lounge-cafe at center (448,720)', () => {
        expect(zoneSystem.detectZone(448, 720)).toBe('lounge-cafe');
      });

      it('detects lounge-cafe at origin (288,608)', () => {
        expect(zoneSystem.detectZone(288, 608)).toBe('lounge-cafe');
      });

      it('detects lounge-cafe just inside bottom-right (607,831)', () => {
        expect(zoneSystem.detectZone(607, 831)).toBe('lounge-cafe');
      });
    });

    describe('lake zone (32,32) to (95,255)', () => {
      it('detects lake at center (64,144)', () => {
        expect(zoneSystem.detectZone(64, 144)).toBe('lake');
      });

      it('detects lake at origin (32,32)', () => {
        expect(zoneSystem.detectZone(32, 32)).toBe('lake');
      });

      it('detects lake just inside bottom-right (95,255)', () => {
        expect(zoneSystem.detectZone(95, 255)).toBe('lake');
      });
    });

    describe('outside all zones', () => {
      it('returns null for position (0,0)', () => {
        expect(zoneSystem.detectZone(0, 0)).toBeNull();
      });

      it('returns null for position beyond map (1050,1050)', () => {
        expect(zoneSystem.detectZone(1050, 1050)).toBeNull();
      });

      it('returns null for gap between zones (500,50)', () => {
        expect(zoneSystem.detectZone(500, 50)).toBeNull();
      });
    });
  });

  describe('spawn points are inside correct zones', () => {
    it('spawn_plaza position (736,736) is inside plaza', () => {
      expect(zoneSystem.detectZone(736, 736)).toBe('plaza');
    });

    it('spawn_lobby position (192,128) is inside lobby', () => {
      expect(zoneSystem.detectZone(192, 128)).toBe('lobby');
    });

    it('spawn_office position (832,144) is inside office', () => {
      expect(zoneSystem.detectZone(832, 144)).toBe('office');
    });

    it('spawn_central_park position (512,416) is inside central-park', () => {
      expect(zoneSystem.detectZone(512, 416)).toBe('central-park');
    });

    it('spawn_arcade position (848,384) is inside arcade', () => {
      expect(zoneSystem.detectZone(848, 384)).toBe('arcade');
    });

    it('spawn_meeting position (160,592) is inside meeting', () => {
      expect(zoneSystem.detectZone(160, 592)).toBe('meeting');
    });

    it('spawn_lounge_cafe position (448,720) is inside lounge-cafe', () => {
      expect(zoneSystem.detectZone(448, 720)).toBe('lounge-cafe');
    });

    it('spawn_lake position (64,144) is inside lake', () => {
      expect(zoneSystem.detectZone(64, 144)).toBe('lake');
    });
  });

  describe('zone transitions in new 8-zone layout', () => {
    it('transitions from central-park to office via movement', () => {
      zoneSystem.updateEntityZone('entity_1', 550, 416, eventLog, 'room_1');
      expect(zoneSystem.getEntityZone('entity_1')).toBe('central-park');

      const result = zoneSystem.updateEntityZone('entity_1', 700, 144, eventLog, 'room_1');

      expect(result.previousZone).toBe('central-park');
      expect(result.currentZone).toBe('office');
      expect(result.changed).toBe(true);
    });

    it('transitions from central-park to meeting via movement', () => {
      zoneSystem.updateEntityZone('entity_1', 350, 450, eventLog, 'room_1');
      expect(zoneSystem.getEntityZone('entity_1')).toBe('central-park');

      const result = zoneSystem.updateEntityZone('entity_1', 150, 550, eventLog, 'room_1');

      expect(result.previousZone).toBe('central-park');
      expect(result.currentZone).toBe('meeting');
      expect(result.changed).toBe(true);
    });

    it('transitions from central-park to arcade via movement', () => {
      zoneSystem.updateEntityZone('entity_1', 650, 416, eventLog, 'room_1');
      expect(zoneSystem.getEntityZone('entity_1')).toBe('central-park');

      const result = zoneSystem.updateEntityZone('entity_1', 750, 350, eventLog, 'room_1');

      expect(result.previousZone).toBe('central-park');
      expect(result.currentZone).toBe('arcade');
      expect(result.changed).toBe(true);
    });

    it('transitions from central-park to lounge-cafe via movement', () => {
      zoneSystem.updateEntityZone('entity_1', 450, 575, eventLog, 'room_1');
      expect(zoneSystem.getEntityZone('entity_1')).toBe('central-park');

      const result = zoneSystem.updateEntityZone('entity_1', 448, 650, eventLog, 'room_1');

      expect(result.previousZone).toBe('central-park');
      expect(result.currentZone).toBe('lounge-cafe');
      expect(result.changed).toBe(true);
    });

    it('transitions from lounge-cafe to plaza via horizontal movement', () => {
      zoneSystem.updateEntityZone('entity_1', 448, 720, eventLog, 'room_1');
      expect(zoneSystem.getEntityZone('entity_1')).toBe('lounge-cafe');

      const result = zoneSystem.updateEntityZone('entity_1', 736, 720, eventLog, 'room_1');

      expect(result.previousZone).toBe('lounge-cafe');
      expect(result.currentZone).toBe('plaza');
      expect(result.changed).toBe(true);
    });

    it('emits zone.exit and zone.enter events on transition', () => {
      const entity = new EntitySchema('entity_1', 'human', 'Test', 'room_1');

      zoneSystem.updateEntityZone('entity_1', 550, 416, eventLog, 'room_1', entity);
      zoneSystem.updateEntityZone('entity_1', 700, 144, eventLog, 'room_1', entity);

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

  describe('zone populations in 8-zone Grid-Town layout', () => {
    it('tracks population across all 8 zones', () => {
      zoneSystem.updateEntityZone('e1', 736, 736);
      zoneSystem.updateEntityZone('e2', 192, 128);
      zoneSystem.updateEntityZone('e3', 832, 144);
      zoneSystem.updateEntityZone('e4', 512, 416);
      zoneSystem.updateEntityZone('e5', 848, 384);
      zoneSystem.updateEntityZone('e6', 160, 592);
      zoneSystem.updateEntityZone('e7', 448, 720);
      zoneSystem.updateEntityZone('e8', 64, 144);

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
      zoneSystem.updateEntityZone('agent_1', 700, 700);
      zoneSystem.updateEntityZone('agent_2', 750, 750);
      zoneSystem.updateEntityZone('agent_3', 832, 144);

      const plazaEntities = zoneSystem.getEntitiesInZone('plaza');
      const officeEntities = zoneSystem.getEntitiesInZone('office');

      expect(plazaEntities).toHaveLength(2);
      expect(plazaEntities).toContain('agent_1');
      expect(plazaEntities).toContain('agent_2');
      expect(officeEntities).toHaveLength(1);
      expect(officeEntities).toContain('agent_3');
    });
  });

  describe('getZoneBounds returns 8-zone Grid-Town spec values', () => {
    it('returns correct bounds for all zones', () => {
      expect(zoneSystem.getZoneBounds('lobby')).toEqual({
        x: 96,
        y: 32,
        width: 192,
        height: 192,
      });
      expect(zoneSystem.getZoneBounds('office')).toEqual({
        x: 672,
        y: 32,
        width: 320,
        height: 224,
      });
      expect(zoneSystem.getZoneBounds('central-park')).toEqual({
        x: 320,
        y: 256,
        width: 384,
        height: 320,
      });
      expect(zoneSystem.getZoneBounds('arcade')).toEqual({
        x: 704,
        y: 256,
        width: 288,
        height: 256,
      });
      expect(zoneSystem.getZoneBounds('meeting')).toEqual({
        x: 32,
        y: 448,
        width: 256,
        height: 288,
      });
      expect(zoneSystem.getZoneBounds('lounge-cafe')).toEqual({
        x: 288,
        y: 608,
        width: 320,
        height: 224,
      });
      expect(zoneSystem.getZoneBounds('plaza')).toEqual({
        x: 608,
        y: 608,
        width: 256,
        height: 256,
      });
      expect(zoneSystem.getZoneBounds('lake')).toEqual({
        x: 32,
        y: 32,
        width: 64,
        height: 224,
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
    describe('lake/lobby boundary at x=96', () => {
      it('detects lake at x=95 (last pixel before lobby)', () => {
        expect(zoneSystem.detectZone(95, 100)).toBe('lake');
      });

      it('detects lobby at x=96 (first pixel of lobby)', () => {
        expect(zoneSystem.detectZone(96, 100)).toBe('lobby');
      });

      it('detects lake at x=32 (left edge of lake)', () => {
        expect(zoneSystem.detectZone(32, 100)).toBe('lake');
      });
    });

    describe('central-park/arcade boundary at x=704', () => {
      it('detects central-park at x=703 (last pixel before arcade)', () => {
        expect(zoneSystem.detectZone(703, 300)).toBe('central-park');
      });

      it('detects arcade at x=704 (first pixel of arcade)', () => {
        expect(zoneSystem.detectZone(704, 300)).toBe('arcade');
      });
    });

    describe('lounge-cafe/plaza boundary at x=608', () => {
      it('detects lounge-cafe at x=607 (last pixel before plaza)', () => {
        expect(zoneSystem.detectZone(607, 700)).toBe('lounge-cafe');
      });

      it('detects plaza at x=608 (first pixel of plaza)', () => {
        expect(zoneSystem.detectZone(608, 700)).toBe('plaza');
      });
    });

    describe('vertical boundaries', () => {
      it('detects lake at y=255 (last pixel of lake)', () => {
        expect(zoneSystem.detectZone(50, 255)).toBe('lake');
      });

      it('detects null in gap between lake and meeting', () => {
        expect(zoneSystem.detectZone(50, 300)).toBeNull();
      });

      it('detects meeting at y=448 (first pixel of meeting)', () => {
        expect(zoneSystem.detectZone(50, 448)).toBe('meeting');
      });
    });
  });
});
