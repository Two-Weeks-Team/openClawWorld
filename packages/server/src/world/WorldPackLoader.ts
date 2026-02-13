import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import {
  MAP_CONFIG,
  ZoneIdSchema,
  EntranceDirectionSchema,
  ZONE_BOUNDS,
  type ZoneId,
  type NpcDefinition,
  type Vec2,
  type TiledLayer,
  type TiledObject,
  type ZoneBounds,
  type BuildingEntrance,
} from '@openclawworld/shared';

export type PackManifest = {
  name: string;
  version: string;
  description: string;
  zones: ZoneId[];
  entryZone: ZoneId;
};

export type { ZoneBounds } from '@openclawworld/shared';

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
  entrances: BuildingEntrance[];
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

/**
 * Validation severity levels
 * ERROR: Blocks CI - critical consistency violations
 * WARN: Allowed but reported - non-critical issues
 */
export enum ValidationSeverity {
  ERROR = 'ERROR',
  WARN = 'WARN',
}

/**
 * Validation error codes with severity classification
 */
export enum ValidationErrorCode {
  // ERROR codes (CI blocking)
  ZONE_MISMATCH = 'ZONE_MISMATCH',
  UNKNOWN_NPC_REFERENCE = 'UNKNOWN_NPC_REF',
  UNKNOWN_FACILITY_REFERENCE = 'UNKNOWN_FACILITY_REF',
  INVALID_ZONE_ID = 'INVALID_ZONE_ID',
  INVALID_ENTRANCE_CONTRACT = 'INVALID_ENTRANCE_CONTRACT',
  FACILITY_ZONE_CONFLICT = 'FACILITY_ZONE_CONFLICT',

  // WARN codes (allowed but reported)
  HIGH_BLOCK_PERCENTAGE = 'HIGH_BLOCK_PCT',
  MIXED_ENTRANCE_TILES = 'MIXED_ENTRANCE_TILES',
  MISSING_OPTIONAL_FIELD = 'MISSING_OPTIONAL',
  NPC_ZONE_NOT_MAPPED = 'NPC_ZONE_NOT_MAPPED',
}

/**
 * Validation issue with severity and code
 */
export interface ValidationIssue {
  severity: ValidationSeverity;
  code: ValidationErrorCode;
  message: string;
  detail: string;
  context?: Record<string, unknown>;
}

/**
 * Validation result collector
 */
export class ValidationResult {
  private errors: ValidationIssue[] = [];
  private warnings: ValidationIssue[] = [];

  addError(
    code: ValidationErrorCode,
    message: string,
    detail: string,
    context?: Record<string, unknown>
  ): void {
    this.errors.push({
      severity: ValidationSeverity.ERROR,
      code,
      message,
      detail,
      context,
    });
  }

  addWarning(
    code: ValidationErrorCode,
    message: string,
    detail: string,
    context?: Record<string, unknown>
  ): void {
    this.warnings.push({
      severity: ValidationSeverity.WARN,
      code,
      message,
      detail,
      context,
    });
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  getErrors(): ValidationIssue[] {
    return this.errors;
  }

  getWarnings(): ValidationIssue[] {
    return this.warnings;
  }

  getAllIssues(): ValidationIssue[] {
    return [...this.errors, ...this.warnings];
  }
}

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

type RawUnifiedMap = {
  zoneId?: string;
  name?: string;
  bounds?: { x?: number; y?: number; width?: number; height?: number };
  spawnPoints?: Array<{ x?: number; y?: number; zone?: string }>;
  npcs?: string[];
  facilities?: string[];
  width?: number;
  height?: number;
  tilewidth?: number;
  tileheight?: number;
  layers?: TiledLayer[];
};

export class WorldPackLoader {
  private packPath: string;
  private pack: WorldPack | null = null;
  private npcZoneCache: Map<string, ZoneId> = new Map();
  private warnedMissingNpcZones: Set<string> = new Set();
  private warnedUnknownNpcZoneRefs: Set<string> = new Set();
  private warnedUnknownFacilityZoneRefs: Set<string> = new Set();
  private validationResult: ValidationResult = new ValidationResult();

  constructor(packPath: string) {
    this.packPath = resolve(packPath);
  }

  loadPack(): WorldPack {
    if (!existsSync(this.packPath)) {
      throw new WorldPackError('Pack directory not found', this.packPath);
    }

    this.validationResult = new ValidationResult();

    const manifest = this.loadManifest();
    this.loadNpcZoneMapping();
    const maps = this.loadAllZoneMaps(manifest.zones);
    this.validateNpcObjectConsistency(maps);
    this.validateFacilityObjectConsistency(maps);
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

  getValidationResult(): ValidationResult {
    return this.validationResult;
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

    const unifiedMapPath = join(mapsDir, 'grid_town_outdoor.json');
    if (existsSync(unifiedMapPath)) {
      return this.loadUnifiedMap(unifiedMapPath, zones);
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

  private loadUnifiedMap(mapPath: string, zones: ZoneId[]): Map<ZoneId, ZoneMapData> {
    let content: string;
    try {
      content = readFileSync(mapPath, 'utf-8');
    } catch (error) {
      throw new WorldPackError(
        `Failed to read unified map: ${error instanceof Error ? error.message : String(error)}`,
        this.packPath
      );
    }

    let raw: RawUnifiedMap;
    try {
      raw = JSON.parse(content) as RawUnifiedMap;
    } catch (error) {
      throw new WorldPackError(
        `Invalid JSON in unified map: ${error instanceof Error ? error.message : String(error)}`,
        this.packPath
      );
    }

    const maps = new Map<ZoneId, ZoneMapData>();
    const spawnPoints = this.extractSpawnPointsFromUnified(raw);
    const objects = this.extractObjects(raw.layers ?? []);
    const { mapWidth, mapHeight, mapTileWidth, mapTileHeight } =
      this.resolveUnifiedMapDimensions(raw);

    const allEntrances = this.extractBuildingEntrances(objects);
    const facilityZoneAssignments = this.extractFacilityZoneAssignments(objects, zones);

    for (const zoneId of zones) {
      const zoneSpawns = spawnPoints.filter(sp => sp.zone === zoneId);
      const zoneObjects = this.filterObjectsByZone(objects, zoneId);
      const zoneEntrances = allEntrances.filter(e => e.zone === zoneId);

      maps.set(zoneId, {
        zoneId,
        name: this.formatZoneName(zoneId),
        bounds: this.getDefaultZoneBounds(zoneId),
        spawnPoints: zoneSpawns.map(sp => ({ x: sp.x, y: sp.y })),
        width: mapWidth,
        height: mapHeight,
        tileWidth: mapTileWidth,
        tileHeight: mapTileHeight,
        layers: raw.layers ?? [],
        objects: zoneObjects,
        npcs: (raw.npcs ?? []).filter(npcId => {
          const npcZone = this.getNpcZone(npcId);
          if (!npcZone) {
            if (!this.warnedUnknownNpcZoneRefs.has(npcId)) {
              this.warnedUnknownNpcZoneRefs.add(npcId);
              console.warn(
                `[WorldPackLoader] Unified map references unknown npcId "${npcId}" (zone mapping not found)`
              );
            }
            return false;
          }
          return npcZone === zoneId;
        }),
        facilities: this.resolveFacilitiesForZone(
          raw.facilities ?? [],
          zoneId,
          facilityZoneAssignments
        ),
        entrances: zoneEntrances,
      });
    }

    console.log(
      `[WorldPackLoader] Loaded unified map (${mapWidth}x${mapHeight}) for ${zones.length} zones`
    );
    return maps;
  }

  private resolveUnifiedMapDimensions(raw: RawUnifiedMap): {
    mapWidth: number;
    mapHeight: number;
    mapTileWidth: number;
    mapTileHeight: number;
  } {
    const mapWidth = raw.width ?? MAP_CONFIG.width;
    const mapHeight = raw.height ?? MAP_CONFIG.height;
    const mapTileWidth = raw.tilewidth ?? MAP_CONFIG.tileSize;
    const mapTileHeight = raw.tileheight ?? MAP_CONFIG.tileSize;

    const dimensions = {
      mapWidth,
      mapHeight,
      mapTileWidth,
      mapTileHeight,
    };

    for (const [label, value] of Object.entries(dimensions)) {
      if (!Number.isInteger(value) || value <= 0) {
        throw new WorldPackError(`Invalid unified map ${label}: ${value}`, this.packPath);
      }
    }

    return dimensions;
  }

  private extractSpawnPointsFromUnified(
    raw: RawUnifiedMap
  ): Array<{ x: number; y: number; zone: ZoneId }> {
    const spawns: Array<{ x: number; y: number; zone: ZoneId }> = [];

    if (raw.spawnPoints && Array.isArray(raw.spawnPoints)) {
      for (const sp of raw.spawnPoints) {
        if (typeof sp.x === 'number' && typeof sp.y === 'number' && sp.zone) {
          spawns.push({ x: sp.x, y: sp.y, zone: sp.zone as ZoneId });
        }
      }
    }

    if (raw.layers) {
      for (const layer of raw.layers) {
        if (layer.type === 'objectgroup' && layer.objects) {
          for (const obj of layer.objects) {
            if (obj.type === 'spawn' && obj.name) {
              const zoneName = obj.name.replace('spawn_', '') as ZoneId;
              spawns.push({
                x: obj.x + (obj.width ?? 0) / 2,
                y: obj.y + (obj.height ?? 0) / 2,
                zone: zoneName,
              });
            }
          }
        }
      }
    }

    return spawns;
  }

  private filterObjectsByZone(objects: TiledObject[], zoneId: ZoneId): TiledObject[] {
    const bounds = this.getDefaultZoneBounds(zoneId);
    return objects.filter(obj => {
      if (obj.type === 'spawn') return false;

      const zoneProp = obj.properties?.find(p => p.name === 'zone');
      if (typeof zoneProp?.value === 'string') {
        const zoneResult = ZoneIdSchema.safeParse(zoneProp.value);
        if (zoneResult.success) {
          return zoneResult.data === zoneId;
        }
      }

      const cx = obj.x + (obj.width ?? 0) / 2;
      const cy = obj.y + (obj.height ?? 0) / 2;
      return (
        cx >= bounds.x &&
        cx < bounds.x + bounds.width &&
        cy >= bounds.y &&
        cy < bounds.y + bounds.height
      );
    });
  }

  private loadNpcZoneMapping(): void {
    this.npcZoneCache.clear();
    this.warnedMissingNpcZones.clear();
    this.warnedUnknownNpcZoneRefs.clear();

    const npcsDir = join(this.packPath, 'npcs');
    if (!existsSync(npcsDir)) {
      return;
    }

    const npcIds = this.readNpcIndex(npcsDir, 'zone mapping');
    if (npcIds.length === 0) {
      return;
    }

    for (const npcId of npcIds) {
      const npcPath = join(npcsDir, `${npcId}.json`);
      if (!existsSync(npcPath)) {
        continue;
      }

      try {
        const npcContent = readFileSync(npcPath, 'utf-8');
        const raw = JSON.parse(npcContent) as { zone?: string };
        if (!raw.zone) {
          if (!this.warnedMissingNpcZones.has(npcId)) {
            this.warnedMissingNpcZones.add(npcId);
            console.warn(
              `[WorldPackLoader] NPC "${npcId}" has no zone. It will be excluded from zone NPC lists.`
            );
          }
          continue;
        }

        const zoneResult = ZoneIdSchema.safeParse(raw.zone);
        if (!zoneResult.success) {
          console.warn(
            `[WorldPackLoader] NPC "${npcId}" has invalid zone "${raw.zone}". It will be excluded from zone NPC lists.`
          );
          continue;
        }

        const existing = this.npcZoneCache.get(npcId);
        if (existing && existing !== zoneResult.data) {
          console.warn(
            `[WorldPackLoader] NPC "${npcId}" zone conflict detected (${existing} vs ${zoneResult.data}). Using latest value.`
          );
        }

        this.npcZoneCache.set(npcId, zoneResult.data);
      } catch (error) {
        console.warn(
          `[WorldPackLoader] Failed to load NPC "${npcId}" for zone mapping: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        continue;
      }
    }

    this.validateNpcZoneMappingCoverage(npcIds.length);
  }

  private validateNpcZoneMappingCoverage(expectedCount: number): void {
    if (expectedCount <= 0) {
      return;
    }

    const mappedCount = this.npcZoneCache.size;
    if (mappedCount === 0) {
      console.warn(
        `[WorldPackLoader] NPC zone mapping cache is empty (0/${expectedCount}). Check npcs/index.json and NPC zone fields.`
      );
      return;
    }

    if (mappedCount < expectedCount) {
      console.warn(
        `[WorldPackLoader] NPC zone mapping coverage is partial (${mappedCount}/${expectedCount}). NPCs without valid zone will be excluded from zone lists.`
      );
    }
  }

  private readNpcIndex(npcsDir: string, context: 'zone mapping' | 'npc loading'): string[] {
    const indexPath = join(npcsDir, 'index.json');
    if (!existsSync(indexPath)) {
      if (context === 'npc loading') {
        console.log('[WorldPackLoader] No npcs/index.json found');
      }
      return [];
    }

    let indexContent: string;
    try {
      indexContent = readFileSync(indexPath, 'utf-8');
    } catch (error) {
      console.warn(
        `[WorldPackLoader] Failed to read npcs/index.json for ${context}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return [];
    }

    let index: { npcs?: string[] };
    try {
      index = JSON.parse(indexContent) as { npcs?: string[] };
    } catch (error) {
      console.warn(
        `[WorldPackLoader] Failed to parse npcs/index.json for ${context}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return [];
    }

    if (!index.npcs || !Array.isArray(index.npcs)) {
      console.warn(`[WorldPackLoader] npcs/index.json missing "npcs" array for ${context}`);
      return [];
    }

    return index.npcs;
  }

  private validateNpcObjectConsistency(maps: Map<ZoneId, ZoneMapData>): void {
    const referencedNpcIds = new Set<string>();

    for (const [zoneId, zoneMap] of maps) {
      for (const npcId of zoneMap.npcs) {
        referencedNpcIds.add(npcId);
        const mappedZone = this.npcZoneCache.get(npcId);

        if (!mappedZone) {
          this.validationResult.addError(
            ValidationErrorCode.UNKNOWN_NPC_REFERENCE,
            'NPC zone mapping not found',
            `Zone "${zoneId}" references unknown npcId "${npcId}" (zone mapping not found)`,
            { zoneId, npcId }
          );
          console.warn(
            `[WorldPackLoader] Zone "${zoneId}" references unknown npcId "${npcId}" (zone mapping not found)`
          );
          continue;
        }

        if (mappedZone !== zoneId) {
          this.validationResult.addError(
            ValidationErrorCode.ZONE_MISMATCH,
            'NPC zone mismatch',
            `NPC "${npcId}" zone mismatch: npc json zone="${mappedZone}" but zone map assignment is "${zoneId}"`,
            { npcId, npcZone: mappedZone, assignedZone: zoneId }
          );
          console.warn(
            `[WorldPackLoader] NPC "${npcId}" zone mismatch: npc json zone="${mappedZone}" but zone map assignment is "${zoneId}"`
          );
        }
      }

      for (const obj of zoneMap.objects) {
        const typeProp = obj.properties?.find(p => p.name === 'type');
        if (typeProp?.value !== 'npc') continue;

        const npcIdProp = obj.properties?.find(p => p.name === 'npcId');
        const npcId = typeof npcIdProp?.value === 'string' ? npcIdProp.value : '';

        if (!npcId) {
          this.validationResult.addWarning(
            ValidationErrorCode.MISSING_OPTIONAL_FIELD,
            'NPC ID property missing',
            `NPC object "${obj.name}" in zone "${zoneId}" is missing npcId property`,
            { objectName: obj.name, zoneId }
          );
          console.warn(
            `[WorldPackLoader] NPC object "${obj.name}" in zone "${zoneId}" is missing npcId property`
          );
          continue;
        }

        referencedNpcIds.add(npcId);

        const mappedZone = this.npcZoneCache.get(npcId);
        if (!mappedZone) {
          this.validationResult.addError(
            ValidationErrorCode.UNKNOWN_NPC_REFERENCE,
            'NPC zone mapping not found',
            `NPC object "${obj.name}" references unknown npcId "${npcId}" (zone mapping not found)`,
            { objectName: obj.name, npcId }
          );
          console.warn(
            `[WorldPackLoader] NPC object "${obj.name}" references unknown npcId "${npcId}" (zone mapping not found)`
          );
          continue;
        }

        if (mappedZone !== zoneId) {
          this.validationResult.addError(
            ValidationErrorCode.ZONE_MISMATCH,
            'NPC zone mismatch',
            `NPC "${npcId}" zone mismatch: npc json zone="${mappedZone}" but map object "${obj.name}" is in zone "${zoneId}"`,
            { npcId, npcZone: mappedZone, objectName: obj.name, mapZone: zoneId }
          );
          console.warn(
            `[WorldPackLoader] NPC "${npcId}" zone mismatch: npc json zone="${mappedZone}" but map object "${obj.name}" is in zone "${zoneId}"`
          );
        }
      }
    }

    // Unreferenced NPCs are allowed (e.g., dynamically spawned or future content),
    // so we only validate explicit references from maps/object layers.
  }

  private getNpcZone(npcId: string): ZoneId | undefined {
    return this.npcZoneCache.get(npcId);
  }

  private normalizeFacilityId(facilityId: string): string {
    return facilityId.trim().replace(/_/g, '-');
  }

  private getFacilityObjectIdCandidates(obj: TiledObject): string[] {
    const candidates: string[] = [];

    const addCandidate = (value: string | undefined): void => {
      if (!value) {
        return;
      }
      const normalized = this.normalizeFacilityId(value);
      if (normalized.length > 0 && !candidates.includes(normalized)) {
        candidates.push(normalized);
      }
    };

    const facilityIdProp = obj.properties?.find(
      p => p.name === 'facilityId' || p.name === 'facilityType'
    );
    if (typeof facilityIdProp?.value === 'string' && facilityIdProp.value.trim().length > 0) {
      addCandidate(facilityIdProp.value);
    }

    if (obj.name.includes('.')) {
      const suffix = obj.name.split('.').pop();
      addCandidate(suffix);
    }

    if (obj.type && obj.type !== 'facility') {
      addCandidate(obj.type);
    }

    if (obj.name.trim().length > 0) {
      addCandidate(obj.name);
    }

    return candidates;
  }

  private getFacilityObjectZone(obj: TiledObject): ZoneId | undefined {
    const zoneProp = obj.properties?.find(p => p.name === 'zone');
    if (typeof zoneProp?.value === 'string') {
      const zoneResult = ZoneIdSchema.safeParse(zoneProp.value);
      if (zoneResult.success) {
        return zoneResult.data;
      }
    }

    const centerX = obj.x + (obj.width ?? 0) / 2;
    const centerY = obj.y + (obj.height ?? 0) / 2;

    for (const [zoneId, bounds] of Object.entries(ZONE_BOUNDS) as [ZoneId, ZoneBounds][]) {
      const inZone =
        centerX >= bounds.x &&
        centerX < bounds.x + bounds.width &&
        centerY >= bounds.y &&
        centerY < bounds.y + bounds.height;
      if (inZone) {
        return zoneId;
      }
    }

    return undefined;
  }

  private extractFacilityZoneAssignments(
    objects: TiledObject[],
    zones: ZoneId[]
  ): Map<string, ZoneId> {
    const assignments = new Map<string, ZoneId>();
    const zoneSet = new Set(zones);

    for (const obj of objects) {
      const typeProp = obj.properties?.find(p => p.name === 'type');
      if (typeProp?.value !== 'facility') {
        continue;
      }

      const facilityIds = this.getFacilityObjectIdCandidates(obj);
      if (facilityIds.length === 0) {
        this.validationResult.addWarning(
          ValidationErrorCode.MISSING_OPTIONAL_FIELD,
          'Facility ID missing',
          `Facility object "${obj.name}" is missing a resolvable facility ID`,
          { objectName: obj.name }
        );
        console.warn(
          `[WorldPackLoader] Facility object "${obj.name}" is missing a resolvable facility ID`
        );
        continue;
      }

      const zoneId = this.getFacilityObjectZone(obj);
      if (!zoneId) {
        this.validationResult.addError(
          ValidationErrorCode.INVALID_ZONE_ID,
          'Facility has no valid zone',
          `Facility object "${obj.name}" has no valid zone and is outside known zone bounds`,
          { objectName: obj.name }
        );
        console.warn(
          `[WorldPackLoader] Facility object "${obj.name}" has no valid zone and is outside known zone bounds`
        );
        continue;
      }

      if (!zoneSet.has(zoneId)) {
        this.validationResult.addError(
          ValidationErrorCode.INVALID_ZONE_ID,
          'Facility zone not in manifest',
          `Facility object "${obj.name}" mapped to zone "${zoneId}" not present in manifest.zones`,
          { objectName: obj.name, zoneId }
        );
        console.warn(
          `[WorldPackLoader] Facility object "${obj.name}" mapped to zone "${zoneId}" not present in manifest.zones`
        );
        continue;
      }

      for (const facilityId of facilityIds) {
        const existing = assignments.get(facilityId);
        if (existing && existing !== zoneId) {
          this.validationResult.addError(
            ValidationErrorCode.FACILITY_ZONE_CONFLICT,
            'Facility zone conflict',
            `Facility "${facilityId}" zone conflict detected (${existing} vs ${zoneId}). Using latest value.`,
            { facilityId, existingZone: existing, newZone: zoneId }
          );
          console.warn(
            `[WorldPackLoader] Facility "${facilityId}" zone conflict detected (${existing} vs ${zoneId}). Using latest value.`
          );
        }

        assignments.set(facilityId, zoneId);
      }
    }

    return assignments;
  }

  private resolveFacilitiesForZone(
    facilityIds: string[],
    zoneId: ZoneId,
    assignments: Map<string, ZoneId>
  ): string[] {
    const filtered: string[] = [];
    const seen = new Set<string>();

    for (const facilityId of facilityIds) {
      const normalizedId = this.normalizeFacilityId(facilityId);
      const mappedZone = assignments.get(normalizedId);
      if (!mappedZone) {
        if (!this.warnedUnknownFacilityZoneRefs.has(normalizedId)) {
          this.warnedUnknownFacilityZoneRefs.add(normalizedId);
          this.validationResult.addWarning(
            ValidationErrorCode.UNKNOWN_FACILITY_REFERENCE,
            'Facility zone mapping not found',
            `Unified map references unknown facilityId "${facilityId}" (zone mapping not found)`,
            { facilityId }
          );
          console.warn(
            `[WorldPackLoader] Unified map references unknown facilityId "${facilityId}" (zone mapping not found)`
          );
        }
        continue;
      }

      if (mappedZone !== zoneId) {
        continue;
      }

      if (seen.has(facilityId)) {
        continue;
      }

      seen.add(facilityId);
      filtered.push(facilityId);
    }

    return filtered;
  }

  private validateFacilityObjectConsistency(maps: Map<ZoneId, ZoneMapData>): void {
    for (const [zoneId, zoneMap] of maps) {
      const assignments = this.extractFacilityZoneAssignments(zoneMap.objects, [zoneId]);

      for (const facilityId of zoneMap.facilities) {
        const normalizedId = this.normalizeFacilityId(facilityId);
        const mappedZone = assignments.get(normalizedId);
        if (!mappedZone) {
          this.validationResult.addError(
            ValidationErrorCode.UNKNOWN_FACILITY_REFERENCE,
            'Facility zone mapping not found',
            `Zone "${zoneId}" references facilityId "${facilityId}" but no matching facility object mapping was found`,
            { zoneId, facilityId }
          );
          console.warn(
            `[WorldPackLoader] Zone "${zoneId}" references facilityId "${facilityId}" but no matching facility object mapping was found`
          );
          continue;
        }

        if (mappedZone !== zoneId) {
          this.validationResult.addError(
            ValidationErrorCode.ZONE_MISMATCH,
            'Facility zone mismatch',
            `Facility "${facilityId}" zone mismatch: mapped zone="${mappedZone}" but zone map assignment is "${zoneId}"`,
            { facilityId, mappedZone, assignedZone: zoneId }
          );
          console.warn(
            `[WorldPackLoader] Facility "${facilityId}" zone mismatch: mapped zone="${mappedZone}" but zone map assignment is "${zoneId}"`
          );
        }
      }
    }
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

    const entrances = this.extractBuildingEntrances(objects);

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
      entrances,
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
      const tileWidth = raw.tilewidth ?? 16;
      const tileHeight = raw.tileheight ?? 16;
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

  private extractBuildingEntrances(objects: TiledObject[]): BuildingEntrance[] {
    const entrances: BuildingEntrance[] = [];

    for (const obj of objects) {
      if (obj.type !== 'building_entrance') continue;

      const zoneProp = obj.properties?.find(p => p.name === 'zone');
      const directionProp = obj.properties?.find(p => p.name === 'direction');
      const connectsToProp = obj.properties?.find(p => p.name === 'connectsTo');

      if (!zoneProp?.value || !directionProp?.value || !connectsToProp?.value) continue;

      const zoneResult = ZoneIdSchema.safeParse(zoneProp.value);
      const directionResult = EntranceDirectionSchema.safeParse(directionProp.value);
      const connectsToResult = ZoneIdSchema.safeParse(connectsToProp.value);

      if (!zoneResult.success || !directionResult.success || !connectsToResult.success) continue;

      entrances.push({
        id: String(obj.id),
        name: obj.name,
        position: { x: obj.x, y: obj.y },
        size: { width: obj.width, height: obj.height },
        zone: zoneResult.data,
        direction: directionResult.data,
        connectsTo: connectsToResult.data,
      });
    }

    return entrances;
  }

  private getDefaultZoneBounds(zoneId: ZoneId): ZoneBounds {
    return ZONE_BOUNDS[zoneId] ?? { x: 0, y: 0, width: 160, height: 160 };
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

    const npcIds = this.readNpcIndex(npcsDir, 'npc loading');
    if (npcIds.length === 0) {
      return [];
    }

    const npcs: NpcDefinition[] = [];

    for (const npcId of npcIds) {
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
      zone: (raw.zone as ZoneId) ?? 'plaza',
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
      const hasFacilityObjects = zoneMap.objects.some(obj => {
        const typeProp = obj.properties?.find(p => p.name === 'type');
        return typeProp?.value === 'facility';
      });

      if (!hasFacilityObjects) {
        for (const facilityId of zoneMap.facilities) {
          facilities.push({
            id: `${zoneId}-${facilityId}`,
            type: facilityId,
            name: facilityId,
            zone: zoneId,
            position: { x: 0, y: 0 },
            interactionRadius: 64,
          });
        }
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
