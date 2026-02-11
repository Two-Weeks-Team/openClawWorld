import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { WorldPackLoader } from '../../packages/server/src/world/WorldPackLoader.js';

const REAL_PACK_PATH = resolve(process.cwd(), 'world/packs/base');

describe('WorldPackLoader - Unified Map Integration (64x64)', () => {
  describe('loading unified map', () => {
    it('loads village_outdoor.json as unified map source', () => {
      const loader = new WorldPackLoader(REAL_PACK_PATH);
      const pack = loader.loadPack();

      expect(pack.manifest.name).toBe('base');
      expect(pack.maps.size).toBe(6);
    });

    it('unified map has correct dimensions (64x64 tiles)', () => {
      const loader = new WorldPackLoader(REAL_PACK_PATH);
      loader.loadPack();

      const lobby = loader.getZoneMap('plaza');
      expect(lobby).toBeDefined();
      expect(lobby?.width).toBe(64);
      expect(lobby?.height).toBe(64);
      expect(lobby?.tileWidth).toBe(32);
      expect(lobby?.tileHeight).toBe(32);
    });

    it('all zones share the same unified map dimensions', () => {
      const loader = new WorldPackLoader(REAL_PACK_PATH);
      loader.loadPack();

      const zones = [
        'plaza',
        'north-block',
        'east-block',
        'west-block',
        'south-block',
        'lake',
      ] as const;

      for (const zoneId of zones) {
        const zoneMap = loader.getZoneMap(zoneId);
        expect(zoneMap, `Zone ${zoneId} should exist`).toBeDefined();
        expect(zoneMap?.width).toBe(64);
        expect(zoneMap?.height).toBe(64);
      }
    });
  });

  describe('zone bounds match 64x64 spec', () => {
    it('plaza has correct bounds', () => {
      const loader = new WorldPackLoader(REAL_PACK_PATH);
      loader.loadPack();

      const plaza = loader.getZoneMap('plaza');
      expect(plaza?.bounds).toEqual({ x: 768, y: 768, width: 512, height: 512 });
    });

    it('north-block has correct bounds', () => {
      const loader = new WorldPackLoader(REAL_PACK_PATH);
      loader.loadPack();

      const northBlock = loader.getZoneMap('north-block');
      expect(northBlock?.bounds).toEqual({ x: 576, y: 64, width: 768, height: 384 });
    });

    it('west-block has correct bounds', () => {
      const loader = new WorldPackLoader(REAL_PACK_PATH);
      loader.loadPack();

      const westBlock = loader.getZoneMap('west-block');
      expect(westBlock?.bounds).toEqual({ x: 64, y: 704, width: 640, height: 640 });
    });

    it('east-block has correct bounds', () => {
      const loader = new WorldPackLoader(REAL_PACK_PATH);
      loader.loadPack();

      const eastBlock = loader.getZoneMap('east-block');
      expect(eastBlock?.bounds).toEqual({ x: 1472, y: 704, width: 576, height: 640 });
    });

    it('south-block has correct bounds', () => {
      const loader = new WorldPackLoader(REAL_PACK_PATH);
      loader.loadPack();

      const southBlock = loader.getZoneMap('south-block');
      expect(southBlock?.bounds).toEqual({ x: 576, y: 1472, width: 768, height: 384 });
    });

    it('lake has correct bounds', () => {
      const loader = new WorldPackLoader(REAL_PACK_PATH);
      loader.loadPack();

      const lake = loader.getZoneMap('lake');
      expect(lake?.bounds).toEqual({ x: 1408, y: 1408, width: 640, height: 640 });
    });
  });

  describe('objects layer extraction', () => {
    it('extracts non-empty objects array from unified map', () => {
      const loader = new WorldPackLoader(REAL_PACK_PATH);
      loader.loadPack();

      const allObjects = Array.from(loader.getAllZoneMaps().values()).flatMap(zm => zm.objects);
      expect(allObjects.length).toBeGreaterThan(0);
    });

    it('lobby has facility objects in its zone bounds', () => {
      const loader = new WorldPackLoader(REAL_PACK_PATH);
      loader.loadPack();

      const lobby = loader.getZoneMap('plaza');
      expect(lobby).toBeDefined();

      const facilityObjects = lobby?.objects.filter(obj => obj.type === 'facility') ?? [];
      expect(facilityObjects.length).toBeGreaterThan(0);
    });

    it('office has kanban_terminal in its objects', () => {
      const loader = new WorldPackLoader(REAL_PACK_PATH);
      loader.loadPack();

      const office = loader.getZoneMap('north-block');
      expect(office).toBeDefined();

      const hasKanban = office?.objects.some(
        obj =>
          obj.name === 'kanban_terminal' ||
          obj.properties?.some(p => p.name === 'facilityType' && p.value === 'kanban_terminal')
      );
      expect(hasKanban).toBe(true);
    });
  });

  describe('spawn points extraction', () => {
    it('extracts spawn points for all zones', () => {
      const loader = new WorldPackLoader(REAL_PACK_PATH);
      loader.loadPack();

      const zones = [
        'plaza',
        'north-block',
        'east-block',
        'west-block',
        'south-block',
        'lake',
      ] as const;

      for (const zoneId of zones) {
        const zoneMap = loader.getZoneMap(zoneId);
        expect(
          zoneMap?.spawnPoints.length,
          `Zone ${zoneId} should have spawn points`
        ).toBeGreaterThan(0);
      }
    });

    it('at least one spawn point per zone is within zone bounds', () => {
      const loader = new WorldPackLoader(REAL_PACK_PATH);
      loader.loadPack();

      for (const [zoneId, zoneMap] of loader.getAllZoneMaps()) {
        const { bounds, spawnPoints } = zoneMap;

        const hasValidSpawn = spawnPoints.some(sp => {
          return (
            sp.x >= bounds.x &&
            sp.x < bounds.x + bounds.width &&
            sp.y >= bounds.y &&
            sp.y < bounds.y + bounds.height
          );
        });

        expect(
          hasValidSpawn,
          `Zone ${zoneId} should have at least one spawn within bounds ${JSON.stringify(bounds)}`
        ).toBe(true);
      }
    });
  });

  describe('layers structure', () => {
    it('includes ground, collision, and objects layers', () => {
      const loader = new WorldPackLoader(REAL_PACK_PATH);
      loader.loadPack();

      const lobby = loader.getZoneMap('plaza');
      expect(lobby).toBeDefined();

      const layerNames = lobby?.layers.map(l => l.name) ?? [];
      expect(layerNames).toContain('ground');
      expect(layerNames).toContain('collision');
      expect(layerNames).toContain('objects');
    });

    it('collision layer has correct tile count (64x64)', () => {
      const loader = new WorldPackLoader(REAL_PACK_PATH);
      loader.loadPack();

      const lobby = loader.getZoneMap('plaza');
      const collisionLayer = lobby?.layers.find(l => l.name === 'collision');

      expect(collisionLayer).toBeDefined();
      expect(collisionLayer?.width).toBe(64);
      expect(collisionLayer?.height).toBe(64);

      if (collisionLayer?.type === 'tilelayer' && collisionLayer.data) {
        expect(collisionLayer.data.length).toBe(64 * 64);
      }
    });
  });

  describe('NPC and facility assignment', () => {
    it('assigns NPCs to correct zones', () => {
      const loader = new WorldPackLoader(REAL_PACK_PATH);
      loader.loadPack();

      const lobby = loader.getZoneMap('plaza');
      expect(lobby?.npcs).toContain('receptionist');
      expect(lobby?.npcs).toContain('security-guard');

      const office = loader.getZoneMap('north-block');
      expect(office?.npcs).toContain('pm');

      const lounge = loader.getZoneMap('west-block');
      expect(lounge?.npcs).toContain('barista');
    });

    it('assigns facilities to correct zones', () => {
      const loader = new WorldPackLoader(REAL_PACK_PATH);
      loader.loadPack();

      const lobby = loader.getZoneMap('plaza');
      expect(lobby?.facilities).toContain('reception_desk');

      const office = loader.getZoneMap('north-block');
      expect(office?.facilities).toContain('kanban_terminal');

      const plaza = loader.getZoneMap('plaza');
      expect(plaza?.facilities).toContain('fountain');
    });
  });
});
