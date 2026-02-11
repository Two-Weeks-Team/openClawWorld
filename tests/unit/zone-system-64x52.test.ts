import { describe, it, expect, beforeEach } from 'vitest';
import { ZoneSystem, DEFAULT_ZONE_BOUNDS } from '../../packages/server/src/zone/ZoneSystem.js';
import { EventLog } from '../../packages/server/src/events/EventLog.js';
import { EntitySchema } from '../../packages/server/src/schemas/EntitySchema.js';

describe('ZoneSystem - 64x52 Map Layout (2048x1664 pixels)', () => {
  let zoneSystem: ZoneSystem;
  let eventLog: EventLog;

  beforeEach(() => {
    zoneSystem = new ZoneSystem(DEFAULT_ZONE_BOUNDS);
    eventLog = new EventLog(60000, 1000);
  });

  describe('DEFAULT_ZONE_BOUNDS matches 64x52 spec', () => {
    it('contains all 6 zones', () => {
      expect(DEFAULT_ZONE_BOUNDS.size).toBe(6);
      expect(DEFAULT_ZONE_BOUNDS.has('lobby')).toBe(true);
      expect(DEFAULT_ZONE_BOUNDS.has('office')).toBe(true);
      expect(DEFAULT_ZONE_BOUNDS.has('meeting-center')).toBe(true);
      expect(DEFAULT_ZONE_BOUNDS.has('lounge-cafe')).toBe(true);
      expect(DEFAULT_ZONE_BOUNDS.has('arcade')).toBe(true);
      expect(DEFAULT_ZONE_BOUNDS.has('plaza')).toBe(true);
    });

    it('lobby has correct bounds (192,96,736,416)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('lobby');
      expect(bounds).toEqual({ x: 192, y: 96, width: 736, height: 416 });
    });

    it('office has correct bounds (1024,192,448,448)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('office');
      expect(bounds).toEqual({ x: 1024, y: 192, width: 448, height: 448 });
    });

    it('meeting-center has correct bounds (96,928,512,576)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('meeting-center');
      expect(bounds).toEqual({ x: 96, y: 928, width: 512, height: 576 });
    });

    it('lounge-cafe has correct bounds (704,928,512,320)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('lounge-cafe');
      expect(bounds).toEqual({ x: 704, y: 928, width: 512, height: 320 });
    });

    it('arcade has correct bounds (1344,736,608,416)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('arcade');
      expect(bounds).toEqual({ x: 1344, y: 736, width: 608, height: 416 });
    });

    it('plaza has correct bounds (1344,1152,608,416)', () => {
      const bounds = DEFAULT_ZONE_BOUNDS.get('plaza');
      expect(bounds).toEqual({ x: 1344, y: 1152, width: 608, height: 416 });
    });
  });

  describe('detectZone with 64x52 positions', () => {
    describe('lobby zone (192,96) to (928,512)', () => {
      it('detects lobby at center (640,304)', () => {
        expect(zoneSystem.detectZone(640, 304)).toBe('lobby');
      });

      it('detects lobby at origin (192,96)', () => {
        expect(zoneSystem.detectZone(192, 96)).toBe('lobby');
      });

      it('detects lobby just inside right edge (927,300)', () => {
        expect(zoneSystem.detectZone(927, 300)).toBe('lobby');
      });

      it('returns null just outside lobby right edge (928,300)', () => {
        expect(zoneSystem.detectZone(928, 300)).toBeNull();
      });

      it('detects lobby just inside bottom edge (300,511)', () => {
        expect(zoneSystem.detectZone(300, 511)).toBe('lobby');
      });
    });

    describe('office zone (1024,192) to (1472,640)', () => {
      it('detects office at center (1248,416)', () => {
        expect(zoneSystem.detectZone(1248, 416)).toBe('office');
      });

      it('detects office at origin (1024,192)', () => {
        expect(zoneSystem.detectZone(1024, 192)).toBe('office');
      });

      it('detects office just inside bottom-right (1471,639)', () => {
        expect(zoneSystem.detectZone(1471, 639)).toBe('office');
      });
    });

    describe('meeting-center zone (96,928) to (608,1504)', () => {
      it('detects meeting-center at center (352,1216)', () => {
        expect(zoneSystem.detectZone(352, 1216)).toBe('meeting-center');
      });

      it('detects meeting-center at origin (96,928)', () => {
        expect(zoneSystem.detectZone(96, 928)).toBe('meeting-center');
      });

      it('detects meeting-center just inside bottom-right (607,1503)', () => {
        expect(zoneSystem.detectZone(607, 1503)).toBe('meeting-center');
      });
    });

    describe('lounge-cafe zone (704,928) to (1216,1248)', () => {
      it('detects lounge-cafe at center (960,1088)', () => {
        expect(zoneSystem.detectZone(960, 1088)).toBe('lounge-cafe');
      });

      it('detects lounge-cafe at origin (704,928)', () => {
        expect(zoneSystem.detectZone(704, 928)).toBe('lounge-cafe');
      });

      it('detects lounge-cafe just inside bottom-right (1215,1247)', () => {
        expect(zoneSystem.detectZone(1215, 1247)).toBe('lounge-cafe');
      });
    });

    describe('arcade zone (1344,736) to (1952,1152)', () => {
      it('detects arcade at center (1648,944)', () => {
        expect(zoneSystem.detectZone(1648, 944)).toBe('arcade');
      });

      it('detects arcade at origin (1344,736)', () => {
        expect(zoneSystem.detectZone(1344, 736)).toBe('arcade');
      });

      it('detects arcade just inside bottom-right (1951,1151)', () => {
        expect(zoneSystem.detectZone(1951, 1151)).toBe('arcade');
      });
    });

    describe('plaza zone (1344,1152) to (1952,1568)', () => {
      it('detects plaza at center (1648,1360)', () => {
        expect(zoneSystem.detectZone(1648, 1360)).toBe('plaza');
      });

      it('detects plaza at origin (1344,1152)', () => {
        expect(zoneSystem.detectZone(1344, 1152)).toBe('plaza');
      });

      it('detects plaza just inside bottom-right (1951,1567)', () => {
        expect(zoneSystem.detectZone(1951, 1567)).toBe('plaza');
      });
    });

    describe('outside all zones', () => {
      it('returns null for position (0,0)', () => {
        expect(zoneSystem.detectZone(0, 0)).toBeNull();
      });

      it('returns null for position beyond map (2100,1700)', () => {
        expect(zoneSystem.detectZone(2100, 1700)).toBeNull();
      });

      it('returns null for gap between lobby and office (950,300)', () => {
        expect(zoneSystem.detectZone(950, 300)).toBeNull();
      });
    });
  });

  describe('spawn points are inside correct zones', () => {
    it('spawn_lobby (640,640) should be near lobby but outside (adjusted spawn needed)', () => {
      const zone = zoneSystem.detectZone(640, 640);
      expect(zone).toBeNull();
    });

    it('spawn at lobby center (640,304) is inside lobby', () => {
      expect(zoneSystem.detectZone(640, 304)).toBe('lobby');
    });

    it('spawn_office position (1216,576) is inside office', () => {
      expect(zoneSystem.detectZone(1216, 576)).toBe('office');
    });

    it('spawn_meeting position (512,1216) is inside meeting-center', () => {
      expect(zoneSystem.detectZone(512, 1216)).toBe('meeting-center');
    });

    it('spawn_lounge position (960,1088) is inside lounge-cafe', () => {
      expect(zoneSystem.detectZone(960, 1088)).toBe('lounge-cafe');
    });

    it('spawn_arcade position (1536,1024) is inside arcade', () => {
      expect(zoneSystem.detectZone(1536, 1024)).toBe('arcade');
    });

    it('spawn_plaza position (1600,1312) is inside plaza', () => {
      expect(zoneSystem.detectZone(1600, 1312)).toBe('plaza');
    });
  });

  describe('zone transitions in 64x52 layout', () => {
    it('transitions from lobby to office via horizontal movement', () => {
      zoneSystem.updateEntityZone('entity_1', 640, 300, eventLog, 'room_1');
      expect(zoneSystem.getEntityZone('entity_1')).toBe('lobby');

      const result = zoneSystem.updateEntityZone('entity_1', 1200, 300, eventLog, 'room_1');

      expect(result.previousZone).toBe('lobby');
      expect(result.currentZone).toBe('office');
      expect(result.changed).toBe(true);
    });

    it('transitions from lobby to meeting-center via vertical movement', () => {
      zoneSystem.updateEntityZone('entity_1', 300, 300, eventLog, 'room_1');
      expect(zoneSystem.getEntityZone('entity_1')).toBe('lobby');

      const result = zoneSystem.updateEntityZone('entity_1', 300, 1000, eventLog, 'room_1');

      expect(result.previousZone).toBe('lobby');
      expect(result.currentZone).toBe('meeting-center');
      expect(result.changed).toBe(true);
    });

    it('transitions from arcade to plaza via vertical movement', () => {
      zoneSystem.updateEntityZone('entity_1', 1600, 900, eventLog, 'room_1');
      expect(zoneSystem.getEntityZone('entity_1')).toBe('arcade');

      const result = zoneSystem.updateEntityZone('entity_1', 1600, 1300, eventLog, 'room_1');

      expect(result.previousZone).toBe('arcade');
      expect(result.currentZone).toBe('plaza');
      expect(result.changed).toBe(true);
    });

    it('emits zone.exit and zone.enter events on transition', () => {
      const entity = new EntitySchema('entity_1', 'human', 'Test', 'room_1');

      zoneSystem.updateEntityZone('entity_1', 640, 300, eventLog, 'room_1', entity);
      zoneSystem.updateEntityZone('entity_1', 1200, 400, eventLog, 'room_1', entity);

      const { events } = eventLog.getSince('', 10);

      const exitLobby = events.find(
        e => e.type === 'zone.exit' && (e.payload as { zoneId: string }).zoneId === 'lobby'
      );
      const enterOffice = events.find(
        e => e.type === 'zone.enter' && (e.payload as { zoneId: string }).zoneId === 'office'
      );

      expect(exitLobby).toBeDefined();
      expect(enterOffice).toBeDefined();
      expect((exitLobby?.payload as { nextZoneId: string }).nextZoneId).toBe('office');
      expect((enterOffice?.payload as { previousZoneId: string }).previousZoneId).toBe('lobby');
    });
  });

  describe('zone populations in 64x52 layout', () => {
    it('tracks population across all 6 zones', () => {
      zoneSystem.updateEntityZone('e1', 640, 300);
      zoneSystem.updateEntityZone('e2', 1200, 400);
      zoneSystem.updateEntityZone('e3', 300, 1000);
      zoneSystem.updateEntityZone('e4', 900, 1000);
      zoneSystem.updateEntityZone('e5', 1600, 900);
      zoneSystem.updateEntityZone('e6', 1600, 1300);

      expect(zoneSystem.getZonePopulation('lobby')).toBe(1);
      expect(zoneSystem.getZonePopulation('office')).toBe(1);
      expect(zoneSystem.getZonePopulation('meeting-center')).toBe(1);
      expect(zoneSystem.getZonePopulation('lounge-cafe')).toBe(1);
      expect(zoneSystem.getZonePopulation('arcade')).toBe(1);
      expect(zoneSystem.getZonePopulation('plaza')).toBe(1);
    });

    it('getEntitiesInZone returns correct entities', () => {
      zoneSystem.updateEntityZone('agent_1', 640, 300);
      zoneSystem.updateEntityZone('agent_2', 700, 350);
      zoneSystem.updateEntityZone('agent_3', 1200, 400);

      const lobbyEntities = zoneSystem.getEntitiesInZone('lobby');
      const officeEntities = zoneSystem.getEntitiesInZone('office');

      expect(lobbyEntities).toHaveLength(2);
      expect(lobbyEntities).toContain('agent_1');
      expect(lobbyEntities).toContain('agent_2');
      expect(officeEntities).toHaveLength(1);
      expect(officeEntities).toContain('agent_3');
    });
  });

  describe('getZoneBounds returns 64x52 spec values', () => {
    it('returns correct bounds for all zones', () => {
      expect(zoneSystem.getZoneBounds('lobby')).toEqual({ x: 192, y: 96, width: 736, height: 416 });
      expect(zoneSystem.getZoneBounds('office')).toEqual({
        x: 1024,
        y: 192,
        width: 448,
        height: 448,
      });
      expect(zoneSystem.getZoneBounds('meeting-center')).toEqual({
        x: 96,
        y: 928,
        width: 512,
        height: 576,
      });
      expect(zoneSystem.getZoneBounds('lounge-cafe')).toEqual({
        x: 704,
        y: 928,
        width: 512,
        height: 320,
      });
      expect(zoneSystem.getZoneBounds('arcade')).toEqual({
        x: 1344,
        y: 736,
        width: 608,
        height: 416,
      });
      expect(zoneSystem.getZoneBounds('plaza')).toEqual({
        x: 1344,
        y: 1152,
        width: 608,
        height: 416,
      });
    });
  });

  describe('getZoneIds', () => {
    it('returns all 6 zone IDs', () => {
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
});
