import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import type { ZoneId, NpcDefinition, Vec2, TiledLayer, TiledObject } from '@openclawworld/shared';

export type PackManifest = {
  name: string;
  version: string;
  description: string;
  zones: ZoneId[];
  entryZone: ZoneId;
};

export type ZoneBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SpawnPoint = {
  x: number;
  y: number;
};

export type ZoneMapData = {
  zoneId: ZoneId;
  name: string;
  bounds: ZoneBounds;
  spawnPoints: SpawnPoint[];
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  layers: TiledLayer[];
  objects: TiledObject[];
  npcs: string[];
  facilities: string[];
};

export type FacilityDefinition = {
  id: string;
  type: string;
  name: string;
  zone: ZoneId;
  position: Vec2;
  interactionRadius: number;
};

export type WorldPack = {
  manifest: PackManifest;
  maps: Map<ZoneId, ZoneMapData>;
  npcs: NpcDefinition[];
  facilities: FacilityDefinition[];
};

export class WorldPackError extends Error {
  constructor(
    message: string,
    public readonly packPath: string,
    public readonly cause?: Error
  ) {
    super(`[WorldPackLoader] ${message} (pack: ${packPath})`);
    this.name = 'WorldPackError';
  }
}

export class ZoneMapError extends Error {
  constructor(
    message: string,
    public readonly zoneId: ZoneId,
    public readonly packPath: string
  ) {
    super(`[WorldPackLoader] Failed to load zone "${zoneId}": ${message}`);
    this.name = 'ZoneMapError';
  }
}

type RawManifest = {
  name?: string;
  version?: string;
  description?: string;
  zones?: string[];
  entryZone?: string;
};

type RawZoneMap = {
  zoneId?: string;
  name?: string;
  bounds?: { x?: number; y?: number; width?: number; height?: number };
  spawnPoints?: Array<{ x?: number; y?: number }>;
  width?: number;
  height?: number;
  tilewidth?: number;
  tileheight?: number;
  layers?: TiledLayer[];
  objects?: TiledObject[];
  npcs?: string[];
  facilities?: string[];
};

type RawNpcDefinition = {
  id?: string;
  name?: string;
  role?: string;
  zone?: string;
  defaultPosition?: { x?: number; y?: number };
  spawnPosition?: { x?: number; y?: number };
  dialogue?: unknown;
  schedule?: unknown[];
};

export class WorldPackLoader {
  private packPath: string;
  private pack: WorldPack | null = null;

  constructor(packPath: string) {
    this.packPath = resolve(packPath);
  }

  loadPack(): WorldPack {
    if (!existsSync(this.packPath)) {
      throw new WorldPackError('Pack directory not found', this.packPath);
    }

    const manifest = this.loadManifest();
    const maps = this.loadAllZoneMaps(manifest.zones);
    const npcs = this.loadNpcs();
    const facilities = this.loadFacilities(maps);

    this.pack = {
      manifest,
      maps,
      npcs,
      facilities,
    };

    console.log(
      `[WorldPackLoader] Loaded pack "${manifest.name}" v${manifest.version} with ${maps.size} zones`
    );

    return this.pack;
  }

  getPack(): WorldPack {
    if (!this.pack) {
      throw new WorldPackError('Pack not loaded. Call loadPack() first.', this.packPath);
    }
    return this.pack;
  }

  getZoneMap(zoneId: ZoneId): ZoneMapData | undefined {
    return this.pack?.maps.get(zoneId);
  }

  getAllZoneMaps(): Map<ZoneId, ZoneMapData> {
    return this.pack?.maps ?? new Map();
  }

  getManifest(): PackManifest | undefined {
    return this.pack?.manifest;
  }

  getPackPath(): string {
    return this.packPath;
  }

  private loadManifest(): PackManifest {
    const manifestPath = join(this.packPath, 'manifest.json');

    if (!existsSync(manifestPath)) {
      throw new WorldPackError('manifest.json not found', this.packPath);
    }

    let content: string;
    try {
      content = readFileSync(manifestPath, 'utf-8');
    } catch (error) {
      throw new WorldPackError(
        'Failed to read manifest.json',
        this.packPath,
        error instanceof Error ? error : undefined
      );
    }

    let raw: RawManifest;
    try {
      raw = JSON.parse(content) as RawManifest;
    } catch (error) {
      throw new WorldPackError(
        'Invalid JSON in manifest.json',
        this.packPath,
        error instanceof Error ? error : undefined
      );
    }

    this.validateManifest(raw);

    return {
      name: raw.name!,
      version: raw.version!,
      description: raw.description ?? '',
      zones: raw.zones as ZoneId[],
      entryZone: raw.entryZone as ZoneId,
    };
  }

  private validateManifest(raw: RawManifest): void {
    if (!raw.name || typeof raw.name !== 'string') {
      throw new WorldPackError('Manifest missing required field: name', this.packPath);
    }
    if (!raw.version || typeof raw.version !== 'string') {
      throw new WorldPackError('Manifest missing required field: version', this.packPath);
    }
    if (!raw.zones || !Array.isArray(raw.zones) || raw.zones.length === 0) {
      throw new WorldPackError('Manifest missing or empty zones array', this.packPath);
    }
    if (!raw.entryZone || typeof raw.entryZone !== 'string') {
      throw new WorldPackError('Manifest missing required field: entryZone', this.packPath);
    }
    if (!raw.zones.includes(raw.entryZone)) {
      throw new WorldPackError(
        `entryZone "${raw.entryZone}" not found in zones list`,
        this.packPath
      );
    }
  }

  private loadAllZoneMaps(zones: ZoneId[]): Map<ZoneId, ZoneMapData> {
    const maps = new Map<ZoneId, ZoneMapData>();
    const mapsDir = join(this.packPath, 'maps');

    if (!existsSync(mapsDir)) {
      throw new WorldPackError('maps directory not found', this.packPath);
    }

    for (const zoneId of zones) {
      try {
        const zoneMap = this.loadZoneMap(zoneId);
        maps.set(zoneId, zoneMap);
        console.log(`[WorldPackLoader] Loaded zone map: ${zoneId}`);
      } catch (error) {
        if (error instanceof ZoneMapError) {
          throw error;
        }
        throw new ZoneMapError(
          error instanceof Error ? error.message : String(error),
          zoneId,
          this.packPath
        );
      }
    }

    return maps;
  }

  private loadZoneMap(zoneId: ZoneId): ZoneMapData {
    const mapPath = join(this.packPath, 'maps', `${zoneId}.json`);

    if (!existsSync(mapPath)) {
      throw new ZoneMapError(`Map file not found: ${mapPath}`, zoneId, this.packPath);
    }

    let content: string;
    try {
      content = readFileSync(mapPath, 'utf-8');
    } catch (error) {
      throw new ZoneMapError(
        `Failed to read map file: ${error instanceof Error ? error.message : String(error)}`,
        zoneId,
        this.packPath
      );
    }

    let raw: RawZoneMap;
    try {
      raw = JSON.parse(content) as RawZoneMap;
    } catch (error) {
      throw new ZoneMapError(
        `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
        zoneId,
        this.packPath
      );
    }

    return this.parseZoneMap(raw, zoneId);
  }

  private parseZoneMap(raw: RawZoneMap, zoneId: ZoneId): ZoneMapData {
    if (typeof raw.width !== 'number' || raw.width <= 0) {
      throw new ZoneMapError('Invalid or missing map width', zoneId, this.packPath);
    }
    if (typeof raw.height !== 'number' || raw.height <= 0) {
      throw new ZoneMapError('Invalid or missing map height', zoneId, this.packPath);
    }
    if (typeof raw.tilewidth !== 'number' || raw.tilewidth <= 0) {
      throw new ZoneMapError('Invalid or missing tilewidth', zoneId, this.packPath);
    }
    if (typeof raw.tileheight !== 'number' || raw.tileheight <= 0) {
      throw new ZoneMapError('Invalid or missing tileheight', zoneId, this.packPath);
    }
    if (!raw.layers || !Array.isArray(raw.layers)) {
      throw new ZoneMapError('Invalid or missing layers array', zoneId, this.packPath);
    }

    const mapZoneId = (raw.zoneId as ZoneId) ?? zoneId;
    const name = raw.name ?? this.formatZoneName(zoneId);

    const bounds = raw.bounds
      ? {
          x: raw.bounds.x ?? 0,
          y: raw.bounds.y ?? 0,
          width: raw.bounds.width ?? raw.width * raw.tilewidth,
          height: raw.bounds.height ?? raw.height * raw.tileheight,
        }
      : this.getDefaultZoneBounds(zoneId);

    const spawnPoints = this.extractSpawnPoints(raw);
    const objects = this.extractObjects(raw.layers);

    return {
      zoneId: mapZoneId,
      name,
      bounds,
      spawnPoints,
      width: raw.width,
      height: raw.height,
      tileWidth: raw.tilewidth,
      tileHeight: raw.tileheight,
      layers: raw.layers,
      objects,
      npcs: raw.npcs ?? [],
      facilities: raw.facilities ?? [],
    };
  }

  private extractSpawnPoints(raw: RawZoneMap): SpawnPoint[] {
    if (raw.spawnPoints && Array.isArray(raw.spawnPoints) && raw.spawnPoints.length > 0) {
      return raw.spawnPoints
        .filter(sp => typeof sp.x === 'number' && typeof sp.y === 'number')
        .map(sp => ({ x: sp.x!, y: sp.y! }));
    }

    const spawnPoints: SpawnPoint[] = [];
    if (raw.layers) {
      for (const layer of raw.layers) {
        if (layer.type === 'objectgroup' && layer.objects) {
          for (const obj of layer.objects) {
            if (obj.type === 'spawn' || obj.name === 'spawn') {
              spawnPoints.push({
                x: obj.x + (obj.width ?? 0) / 2,
                y: obj.y + (obj.height ?? 0) / 2,
              });
            }
          }
        }
      }
    }

    if (spawnPoints.length === 0) {
      const tileWidth = raw.tilewidth ?? 32;
      const tileHeight = raw.tileheight ?? 32;
      const mapWidth = raw.width ?? 10;
      const mapHeight = raw.height ?? 10;

      spawnPoints.push({
        x: (mapWidth * tileWidth) / 2,
        y: (mapHeight * tileHeight) / 2,
      });
    }

    return spawnPoints;
  }

  private extractObjects(layers: TiledLayer[]): TiledObject[] {
    const objects: TiledObject[] = [];

    for (const layer of layers) {
      if (layer.type === 'objectgroup' && layer.objects) {
        objects.push(...layer.objects);
      }
    }

    return objects;
  }

  private getDefaultZoneBounds(zoneId: ZoneId): ZoneBounds {
    const defaultBounds: Record<ZoneId, ZoneBounds> = {
      lobby: { x: 0, y: 0, width: 533, height: 640 },
      office: { x: 533, y: 0, width: 534, height: 640 },
      'meeting-center': { x: 0, y: 640, width: 533, height: 640 },
      'lounge-cafe': { x: 533, y: 640, width: 534, height: 640 },
      arcade: { x: 1067, y: 0, width: 533, height: 1280 },
    };

    return defaultBounds[zoneId] ?? { x: 0, y: 0, width: 320, height: 320 };
  }

  private formatZoneName(zoneId: ZoneId): string {
    return zoneId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private loadNpcs(): NpcDefinition[] {
    const npcsDir = join(this.packPath, 'npcs');
    if (!existsSync(npcsDir)) {
      console.log('[WorldPackLoader] No npcs directory found');
      return [];
    }

    const indexPath = join(npcsDir, 'index.json');
    if (!existsSync(indexPath)) {
      console.log('[WorldPackLoader] No npcs/index.json found');
      return [];
    }

    let indexContent: string;
    try {
      indexContent = readFileSync(indexPath, 'utf-8');
    } catch {
      console.warn('[WorldPackLoader] Failed to read npcs/index.json');
      return [];
    }

    let index: { npcs?: string[] };
    try {
      index = JSON.parse(indexContent) as { npcs?: string[] };
    } catch {
      console.warn('[WorldPackLoader] Invalid JSON in npcs/index.json');
      return [];
    }

    if (!index.npcs || !Array.isArray(index.npcs)) {
      return [];
    }

    const npcs: NpcDefinition[] = [];

    for (const npcId of index.npcs) {
      const npcPath = join(npcsDir, `${npcId}.json`);
      if (!existsSync(npcPath)) {
        console.warn(`[WorldPackLoader] NPC file not found: ${npcId}.json`);
        continue;
      }

      try {
        const npcContent = readFileSync(npcPath, 'utf-8');
        const raw = JSON.parse(npcContent) as RawNpcDefinition;

        const npc = this.parseNpcDefinition(raw, npcId);
        if (npc) {
          npcs.push(npc);
        }
      } catch (error) {
        console.warn(
          `[WorldPackLoader] Failed to load NPC ${npcId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    console.log(`[WorldPackLoader] Loaded ${npcs.length} NPCs`);
    return npcs;
  }

  private parseNpcDefinition(raw: RawNpcDefinition, npcId: string): NpcDefinition | null {
    if (!raw.id && !raw.name) {
      return null;
    }

    const position = raw.defaultPosition ?? raw.spawnPosition ?? { x: 0, y: 0 };

    return {
      id: raw.id ?? npcId,
      name: raw.name ?? npcId,
      role: (raw.role as NpcDefinition['role']) ?? 'receptionist',
      zone: (raw.zone as ZoneId) ?? 'lobby',
      spawnPosition: {
        x: position.x ?? 0,
        y: position.y ?? 0,
      },
      dialogue: Array.isArray(raw.dialogue) ? raw.dialogue : [],
      schedule: Array.isArray(raw.schedule)
        ? raw.schedule.map(s => {
            const item = s as {
              time?: string;
              state?: string;
              location?: { x?: number; y?: number };
            };
            return {
              time: item.time ?? '00:00',
              state:
                (item.state as NpcDefinition['schedule'] extends Array<infer T>
                  ? T extends { state: infer S }
                    ? S
                    : never
                  : never) ?? 'idle',
              location: item.location
                ? { x: item.location.x ?? 0, y: item.location.y ?? 0 }
                : undefined,
            };
          })
        : undefined,
    };
  }

  private loadFacilities(maps: Map<ZoneId, ZoneMapData>): FacilityDefinition[] {
    const facilities: FacilityDefinition[] = [];

    for (const [zoneId, zoneMap] of maps) {
      for (const facilityId of zoneMap.facilities) {
        facilities.push({
          id: `${zoneId}-${facilityId}`,
          type: facilityId,
          name: this.formatZoneName(facilityId as ZoneId),
          zone: zoneId,
          position: { x: 0, y: 0 },
          interactionRadius: 64,
        });
      }

      for (const obj of zoneMap.objects) {
        const typeProp = obj.properties?.find(p => p.name === 'type');
        if (typeProp?.value === 'facility') {
          facilities.push({
            id: `${zoneId}-${obj.name}`,
            type: obj.type || obj.name,
            name: obj.name,
            zone: zoneId,
            position: { x: obj.x, y: obj.y },
            interactionRadius: Math.max(obj.width, obj.height) / 2 || 64,
          });
        }
      }
    }

    console.log(`[WorldPackLoader] Found ${facilities.length} facilities`);
    return facilities;
  }
}
