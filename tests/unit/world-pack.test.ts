import { describe, it, expect, afterEach } from 'vitest';
import { resolve } from 'path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import {
  WorldPackLoader,
  WorldPackError,
  ZoneMapError,
  type PackManifest,
} from '../../packages/server/src/world/WorldPackLoader.js';
import { MapLoader } from '../../packages/server/src/map/MapLoader.js';
import type { ZoneId } from '@openclawworld/shared';

const TEST_PACK_PATH = resolve(process.cwd(), 'tests/fixtures/test-pack');
const REAL_PACK_PATH = resolve(process.cwd(), 'world/packs/base');

function createTestPack(
  overrides: {
    manifest?: Partial<PackManifest>;
    zones?: string[];
    skipManifest?: boolean;
    skipMaps?: boolean;
    invalidMapJson?: boolean;
    unifiedMap?: Record<string, unknown>;
  } = {}
) {
  if (existsSync(TEST_PACK_PATH)) {
    rmSync(TEST_PACK_PATH, { recursive: true });
  }

  mkdirSync(TEST_PACK_PATH, { recursive: true });
  mkdirSync(resolve(TEST_PACK_PATH, 'maps'), { recursive: true });
  mkdirSync(resolve(TEST_PACK_PATH, 'npcs'), { recursive: true });

  if (!overrides.skipManifest) {
    const manifest = {
      name: 'test-pack',
      version: '1.0.0',
      description: 'Test pack',
      zones: (overrides.zones ?? ['plaza']) as ZoneId[],
      entryZone: 'plaza' as ZoneId,
      ...overrides.manifest,
    };
    writeFileSync(resolve(TEST_PACK_PATH, 'manifest.json'), JSON.stringify(manifest, null, 2));
  }

  if (!overrides.skipMaps) {
    const zones = overrides.zones ?? ['plaza'];
    for (const zoneId of zones) {
      if (overrides.invalidMapJson) {
        writeFileSync(resolve(TEST_PACK_PATH, 'maps', `${zoneId}.json`), 'invalid json');
      } else {
        const mapData = {
          zoneId,
          name: zoneId.charAt(0).toUpperCase() + zoneId.slice(1),
          bounds: { x: 0, y: 0, width: 320, height: 320 },
          spawnPoints: [{ x: 160, y: 160 }],
          npcs: [],
          facilities: [],
          width: 10,
          height: 10,
          tilewidth: 16,
          tileheight: 16,
          layers: [
            {
              id: 1,
              name: 'floor',
              type: 'tilelayer',
              width: 10,
              height: 10,
              data: Array(100).fill(1),
              visible: true,
              opacity: 1,
              x: 0,
              y: 0,
            },
            {
              id: 2,
              name: 'collision',
              type: 'tilelayer',
              width: 10,
              height: 10,
              data: Array(100).fill(0),
              visible: true,
              opacity: 1,
              x: 0,
              y: 0,
            },
          ],
        };
        writeFileSync(
          resolve(TEST_PACK_PATH, 'maps', `${zoneId}.json`),
          JSON.stringify(mapData, null, 2)
        );
      }
    }
  }

  if (overrides.unifiedMap) {
    writeFileSync(
      resolve(TEST_PACK_PATH, 'maps', 'grid_town_outdoor.json'),
      JSON.stringify(overrides.unifiedMap, null, 2)
    );
  }

  writeFileSync(resolve(TEST_PACK_PATH, 'npcs', 'index.json'), JSON.stringify({ npcs: [] }));
}

function cleanupTestPack() {
  if (existsSync(TEST_PACK_PATH)) {
    rmSync(TEST_PACK_PATH, { recursive: true });
  }
}

describe('WorldPackLoader', () => {
  afterEach(() => {
    cleanupTestPack();
  });

  describe('construction', () => {
    it('accepts a valid pack path', () => {
      const loader = new WorldPackLoader(REAL_PACK_PATH);
      expect(loader.getPackPath()).toBe(REAL_PACK_PATH);
    });

    it('resolves relative paths to absolute', () => {
      const loader = new WorldPackLoader('./world/packs/base');
      expect(loader.getPackPath()).toContain('world/packs/base');
    });
  });

  describe('loadPack', () => {
    it('loads a valid world pack', () => {
      createTestPack();
      const loader = new WorldPackLoader(TEST_PACK_PATH);
      const pack = loader.loadPack();

      expect(pack.manifest.name).toBe('test-pack');
      expect(pack.manifest.version).toBe('1.0.0');
      expect(pack.maps.size).toBe(1);
    });

    it('throws WorldPackError for non-existent pack', () => {
      const loader = new WorldPackLoader('/non/existent/path');
      expect(() => loader.loadPack()).toThrow(WorldPackError);
    });

    it('throws WorldPackError when manifest is missing', () => {
      createTestPack({ skipManifest: true });
      const loader = new WorldPackLoader(TEST_PACK_PATH);
      expect(() => loader.loadPack()).toThrow(WorldPackError);
    });

    it('loads pack with multiple zones', () => {
      createTestPack({ zones: ['plaza', 'office'] });
      const loader = new WorldPackLoader(TEST_PACK_PATH);
      const pack = loader.loadPack();

      expect(pack.maps.size).toBe(2);
      expect(pack.maps.has('plaza' as const)).toBe(true);
      expect(pack.maps.has('office' as const)).toBe(true);
    });
  });

  describe('manifest validation', () => {
    it('throws for missing name', () => {
      createTestPack({ manifest: { name: undefined as unknown as string } });
      const loader = new WorldPackLoader(TEST_PACK_PATH);
      expect(() => loader.loadPack()).toThrow('name');
    });

    it('throws for missing version', () => {
      createTestPack({ manifest: { version: undefined as unknown as string } });
      const loader = new WorldPackLoader(TEST_PACK_PATH);
      expect(() => loader.loadPack()).toThrow('version');
    });

    it('throws for empty zones array', () => {
      createTestPack({ zones: [] });
      const loader = new WorldPackLoader(TEST_PACK_PATH);
      expect(() => loader.loadPack()).toThrow('zones');
    });

    it('throws when entryZone not in zones list', () => {
      if (existsSync(TEST_PACK_PATH)) {
        rmSync(TEST_PACK_PATH, { recursive: true });
      }
      mkdirSync(TEST_PACK_PATH, { recursive: true });
      mkdirSync(resolve(TEST_PACK_PATH, 'maps'), { recursive: true });

      writeFileSync(
        resolve(TEST_PACK_PATH, 'manifest.json'),
        JSON.stringify({
          name: 'test',
          version: '1.0.0',
          zones: ['plaza'],
          entryZone: 'office',
        })
      );

      const loader = new WorldPackLoader(TEST_PACK_PATH);
      expect(() => loader.loadPack()).toThrow('entryZone');
    });
  });

  describe('zone map loading', () => {
    it('loads zone map with correct data', () => {
      createTestPack();
      const loader = new WorldPackLoader(TEST_PACK_PATH);
      loader.loadPack();

      const zoneMap = loader.getZoneMap('plaza');
      expect(zoneMap).toBeDefined();
      expect(zoneMap?.zoneId).toBe('plaza');
      expect(zoneMap?.width).toBe(10);
      expect(zoneMap?.height).toBe(10);
    });

    it('returns undefined for non-existent zone', () => {
      createTestPack();
      const loader = new WorldPackLoader(TEST_PACK_PATH);
      loader.loadPack();

      const zoneMap = loader.getZoneMap('nonexistent' as 'plaza');
      expect(zoneMap).toBeUndefined();
    });

    it('throws ZoneMapError for invalid JSON in map file', () => {
      createTestPack({ invalidMapJson: true });
      const loader = new WorldPackLoader(TEST_PACK_PATH);
      expect(() => loader.loadPack()).toThrow(ZoneMapError);
    });

    it('throws ZoneMapError for missing map file', () => {
      createTestPack({ skipMaps: true });
      const loader = new WorldPackLoader(TEST_PACK_PATH);
      expect(() => loader.loadPack()).toThrow(ZoneMapError);
    });
  });

  describe('getAllZoneMaps', () => {
    it('returns all loaded zone maps', () => {
      createTestPack({ zones: ['plaza', 'office'] });
      const loader = new WorldPackLoader(TEST_PACK_PATH);
      loader.loadPack();

      const allMaps = loader.getAllZoneMaps();
      expect(allMaps.size).toBe(2);
    });

    it('returns empty map before pack is loaded', () => {
      const loader = new WorldPackLoader(TEST_PACK_PATH);
      expect(loader.getAllZoneMaps().size).toBe(0);
    });
  });

  describe('getPack', () => {
    it('throws if pack not loaded', () => {
      createTestPack();
      const loader = new WorldPackLoader(TEST_PACK_PATH);
      expect(() => loader.getPack()).toThrow(WorldPackError);
    });

    it('returns pack after loading', () => {
      createTestPack();
      const loader = new WorldPackLoader(TEST_PACK_PATH);
      loader.loadPack();
      const pack = loader.getPack();
      expect(pack.manifest.name).toBe('test-pack');
    });
  });

  describe('real world pack', () => {
    it('loads the base pack successfully', () => {
      const loader = new WorldPackLoader(REAL_PACK_PATH);
      const pack = loader.loadPack();

      expect(pack.manifest.name).toBe('base');
      expect(pack.manifest.zones).toContain('plaza');
      expect(pack.manifest.zones).toContain('office');
      expect(pack.manifest.entryZone).toBe('central-park');
    });

    it('has correct zone data for plaza', () => {
      const loader = new WorldPackLoader(REAL_PACK_PATH);
      loader.loadPack();

      const plaza = loader.getZoneMap('plaza');
      expect(plaza).toBeDefined();
      expect(plaza?.name).toBe('Plaza');
    });

    it('uses MAP_CONFIG defaults for unified map dimensions when metadata is missing', () => {
      createTestPack({
        zones: ['plaza'],
        skipMaps: true,
        unifiedMap: {
          layers: [],
        },
      });

      const loader = new WorldPackLoader(TEST_PACK_PATH);
      loader.loadPack();

      const plaza = loader.getZoneMap('plaza');
      expect(plaza).toBeDefined();
      expect(plaza?.width).toBe(64);
      expect(plaza?.height).toBe(64);
      expect(plaza?.tileWidth).toBe(16);
      expect(plaza?.tileHeight).toBe(16);
    });
  });
});

describe('MapLoader zone support', () => {
  afterEach(() => {
    cleanupTestPack();
  });

  describe('loadZoneMap', () => {
    it('loads zone map from pack path', () => {
      createTestPack();
      const loader = new MapLoader();
      const parsedMap = loader.loadZoneMap(TEST_PACK_PATH, 'plaza');

      expect(parsedMap.mapId).toBe('plaza');
      expect(parsedMap.width).toBe(10);
      expect(parsedMap.height).toBe(10);
    });

    it('throws for non-existent zone', () => {
      createTestPack();
      const loader = new MapLoader();
      expect(() => loader.loadZoneMap(TEST_PACK_PATH, 'nonexistent' as 'plaza')).toThrow();
    });
  });

  describe('loadZoneMapFromData', () => {
    it('creates ParsedMap from ZoneMapData', () => {
      createTestPack();
      const packLoader = new WorldPackLoader(TEST_PACK_PATH);
      packLoader.loadPack();

      const zoneMapData = packLoader.getZoneMap('plaza')!;
      const mapLoader = new MapLoader();
      const parsedMap = mapLoader.loadZoneMapFromData(zoneMapData);

      expect(parsedMap.mapId).toBe('plaza');
      expect(parsedMap.tileSize).toBe(16);
      expect(parsedMap.collisionGrid.length).toBe(10);
    });
  });

  describe('mergeZoneMaps', () => {
    it('merges multiple zone maps', () => {
      createTestPack({ zones: ['plaza', 'office'] });
      const packLoader = new WorldPackLoader(TEST_PACK_PATH);
      packLoader.loadPack();

      const mapLoader = new MapLoader();
      const mergedMap = mapLoader.mergeZoneMaps(packLoader.getAllZoneMaps());

      expect(mergedMap.mapId).toBe('world');
      expect(mergedMap.width).toBeGreaterThan(0);
      expect(mergedMap.height).toBeGreaterThan(0);
    });

    it('throws for empty zone maps', () => {
      const mapLoader = new MapLoader();
      expect(() => mapLoader.mergeZoneMaps(new Map())).toThrow();
    });
  });
});
