#!/usr/bin/env tsx
import { existsSync, readFileSync } from 'fs';
import { basename, dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import type {
  Map as TiledMap,
  TileLayer,
  ObjectGroup,
  Tileset,
  AnyLayer,
  AnyTileset,
  AnyProperty,
} from '@kayahr/tiled';
import {
  ZONE_BOUNDS,
  DEFAULT_SPAWN_POINT,
  MAP_CONFIG,
  MAP_LAYERS,
  MAP_TILESETS,
} from '../packages/shared/dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');

const MAP_PATHS: Record<string, string> = {
  source: join(ROOT_DIR, 'world/packs/base/maps/grid_town_outdoor.json'),
  server: join(ROOT_DIR, 'packages/server/assets/maps/village.json'),
  client: join(ROOT_DIR, 'packages/client/public/assets/maps/village.json'),
};

interface ExpectedTileset {
  name: string;
  tilewidth: number;
  tileheight: number;
  image: string;
}

const EXPECTED_TILESETS: ExpectedTileset[] = MAP_TILESETS.map(name => ({
  name,
  tilewidth: 16,
  tileheight: 16,
  image: `${name}.png`,
}));

const CONTRACT_PATHS: Record<string, string> = {
  curation: join(ROOT_DIR, 'tools/kenney-curation.json'),
  tilesetMeta: join(ROOT_DIR, 'packages/client/public/assets/maps/tileset.json'),
  tileIdContract: join(ROOT_DIR, 'world/packs/base/assets/tilesets/village_tileset.json'),
  manifest: join(ROOT_DIR, 'world/packs/base/manifest.json'),
};

const VALID_ZONES: string[] = [
  'lobby',
  'office',
  'central-park',
  'arcade',
  'meeting',
  'lounge-cafe',
  'plaza',
  'lake',
];
const VALID_DIRECTIONS: string[] = ['north', 'south', 'east', 'west'];

/**
 * Validation severity levels
 * ERROR: Blocks CI - critical consistency violations
 * WARN: Allowed but reported - non-critical issues
 */
const Severity = {
  ERROR: 'ERROR',
  WARN: 'WARN',
} as const;

type SeverityLevel = (typeof Severity)[keyof typeof Severity];

/**
 * ERROR-level violations (CI blocking):
 * - zone mismatch (npc/facility referencing non-existent zone)
 * - unknown reference (npcId/facilityId not found)
 * - invalid zone id (zone referenced in entrance doesn't exist)
 * - invalid entrance contract (connectsTo references invalid zone)
 *
 * WARN-level violations (allowed but reported):
 * - high block percentage (>80% but intentional like water)
 * - mixed passable/blocked tiles at entrances
 * - missing optional fields
 */

interface ValidationErrorCode {
  code: string;
  severity: SeverityLevel;
  message: string;
}

const ValidationErrorCodes: Record<string, ValidationErrorCode> = {
  // ERROR codes
  ZONE_MISMATCH: {
    code: 'ZONE_MISMATCH',
    severity: Severity.ERROR,
    message: 'NPC/facility zone mismatch',
  },
  UNKNOWN_NPC_REFERENCE: {
    code: 'UNKNOWN_NPC_REF',
    severity: Severity.ERROR,
    message: 'NPC ID not found in zone mapping',
  },
  UNKNOWN_FACILITY_REFERENCE: {
    code: 'UNKNOWN_FACILITY_REF',
    severity: Severity.ERROR,
    message: 'Facility ID not found',
  },
  INVALID_ZONE_ID: {
    code: 'INVALID_ZONE_ID',
    severity: Severity.ERROR,
    message: 'Zone ID does not exist in manifest',
  },
  INVALID_ENTRANCE_CONTRACT: {
    code: 'INVALID_ENTRANCE_CONTRACT',
    severity: Severity.ERROR,
    message: 'Entrance connectsTo references invalid zone',
  },
  INVALID_ENTRANCE_ZONE: {
    code: 'INVALID_ENTRANCE_ZONE',
    severity: Severity.ERROR,
    message: 'Entrance zone property is invalid',
  },
  FACILITY_ZONE_CONFLICT: {
    code: 'FACILITY_ZONE_CONFLICT',
    severity: Severity.ERROR,
    message: 'Facility has conflicting zone assignments',
  },

  // WARN codes
  HIGH_BLOCK_PERCENTAGE: {
    code: 'HIGH_BLOCK_PCT',
    severity: Severity.WARN,
    message: 'Zone has high block percentage',
  },
  MIXED_ENTRANCE_TILES: {
    code: 'MIXED_ENTRANCE_TILES',
    severity: Severity.WARN,
    message: 'Entrance has mixed passable/blocked tiles',
  },
  MISSING_OPTIONAL_FIELD: {
    code: 'MISSING_OPTIONAL',
    severity: Severity.WARN,
    message: 'Optional field is missing',
  },
  NPC_ZONE_NOT_MAPPED: {
    code: 'NPC_ZONE_NOT_MAPPED',
    severity: Severity.WARN,
    message: 'NPC zone mapping not found',
  },
};

interface ValidationIssue {
  severity: SeverityLevel;
  code: string;
  message: string;
  detail: string;
  context: Record<string, unknown>;
}

class ValidationResult {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];

  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  addError(
    code: ValidationErrorCode,
    message: string,
    context: Record<string, unknown> = {}
  ): void {
    this.errors.push({
      severity: Severity.ERROR,
      code: code.code,
      message: code.message,
      detail: message,
      context,
    });
  }

  addWarning(
    code: ValidationErrorCode,
    message: string,
    context: Record<string, unknown> = {}
  ): void {
    this.warnings.push({
      severity: Severity.WARN,
      code: code.code,
      message: code.message,
      detail: message,
      context,
    });
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  getAllIssues(): ValidationIssue[] {
    return [...this.errors, ...this.warnings];
  }

  getErrors(): ValidationIssue[] {
    return this.errors;
  }

  getWarnings(): ValidationIssue[] {
    return this.warnings;
  }

  merge(other: ValidationResult): this {
    this.errors.push(...other.errors);
    this.warnings.push(...other.warnings);
    return this;
  }
}

interface LoadedMap {
  content: string;
  json: TiledMap;
  hash: string;
}

function md5(content: string): string {
  return createHash('md5').update(content).digest('hex');
}

function loadMap(path: string): LoadedMap | null {
  if (!existsSync(path)) {
    return null;
  }
  const content = readFileSync(path, 'utf-8');
  try {
    return { content, json: JSON.parse(content) as TiledMap, hash: md5(content) };
  } catch (e) {
    console.error(`\u274C Failed to parse JSON: ${path}\n  ${(e as Error).message}`);
    process.exit(1);
  }
}

function loadRequiredJson<T = unknown>(path: string, label: string): T {
  if (!existsSync(path)) {
    console.error(`\u274C Missing required file (${label}): ${path}`);
    process.exit(1);
  }

  const content = readFileSync(path, 'utf-8');
  try {
    return JSON.parse(content) as T;
  } catch (e) {
    console.error(`\u274C Failed to parse JSON (${label}): ${path}\n  ${(e as Error).message}`);
    process.exit(1);
  }
}

function validateMapDimensions(map: LoadedMap, name: string): string[] {
  const errors: string[] = [];
  const dimensions: Record<string, number> = {
    width: MAP_CONFIG.width,
    height: MAP_CONFIG.height,
    tilewidth: MAP_CONFIG.tileSize,
    tileheight: MAP_CONFIG.tileSize,
  };

  for (const [key, expected] of Object.entries(dimensions)) {
    if ((map.json as unknown as Record<string, unknown>)[key] !== expected) {
      errors.push(
        `${name}: ${key}=${(map.json as unknown as Record<string, unknown>)[key]}, expected=${expected}`
      );
    }
  }

  return errors;
}

function validateTileset(map: LoadedMap, name: string): string[] {
  const errors: string[] = [];
  const tilesets: AnyTileset[] = map.json.tilesets || [];

  if (tilesets.length === 0) {
    errors.push(`${name}: no tilesets found`);
    return errors;
  }

  if (tilesets.length > EXPECTED_TILESETS.length) {
    errors.push(
      `${name}: expected at most ${EXPECTED_TILESETS.length} tilesets, found ${tilesets.length}`
    );
  }

  for (let i = 0; i < Math.min(tilesets.length, EXPECTED_TILESETS.length); i++) {
    const tileset = tilesets[i] as unknown as Record<string, unknown>;
    const expected = EXPECTED_TILESETS[i];
    for (const [key, expectedVal] of Object.entries(expected)) {
      if (tileset[key] !== expectedVal) {
        errors.push(`${name}: tilesets[${i}].${key}=${tileset[key]}, expected=${expectedVal}`);
      }
    }
  }

  return errors;
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function collectUsedTileIds(mapJson: TiledMap): Set<number> {
  const used = new Set<number>();
  for (const layer of mapJson.layers || []) {
    if (!('data' in layer) || !Array.isArray((layer as TileLayer).data)) {
      continue;
    }
    for (const tileId of (layer as TileLayer).data as number[]) {
      if (Number.isInteger(tileId)) {
        used.add(tileId);
      }
    }
  }
  return used;
}

interface TiledObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: Array<{ name: string; type: string; value: unknown }>;
}

function getObjectStringProperty(obj: TiledObject, name: string): string | undefined {
  const prop = (obj.properties || []).find(p => p.name === name);
  return typeof prop?.value === 'string' ? prop.value : undefined;
}

function normalizeFacilityId(value: string): string {
  return value.trim().replace(/_/g, '-');
}

interface FacilityInfo {
  ids: string[];
  name: string;
  zone: string | undefined;
}

function resolveFacilityObjectIds(obj: TiledObject): string[] {
  const ids: string[] = [];
  const addId = (raw: unknown): void => {
    if (typeof raw !== 'string') {
      return;
    }
    const normalized = normalizeFacilityId(raw);
    if (normalized.length > 0 && !ids.includes(normalized)) {
      ids.push(normalized);
    }
  };

  const explicitId = getObjectStringProperty(obj, 'facilityId');
  if (explicitId && explicitId.length > 0) {
    addId(explicitId);
  }

  const explicitType = getObjectStringProperty(obj, 'facilityType');
  if (explicitType && explicitType.length > 0) {
    addId(explicitType);
  }

  if (typeof obj.name === 'string' && obj.name.includes('.')) {
    const suffix = obj.name.split('.').pop();
    if (suffix && suffix.length > 0) {
      addId(suffix);
    }
  }

  if (typeof obj.type === 'string' && obj.type.length > 0 && obj.type !== 'facility') {
    addId(obj.type);
  }

  if (typeof obj.name === 'string' && obj.name.length > 0) {
    addId(obj.name);
  }

  return ids;
}

function extractFacilityObjects(mapJson: TiledMap): FacilityInfo[] {
  const facilities: FacilityInfo[] = [];

  for (const layer of mapJson.layers || []) {
    if (layer.type !== 'objectgroup' || !Array.isArray((layer as ObjectGroup).objects)) {
      continue;
    }

    for (const obj of (layer as ObjectGroup).objects) {
      const tiledObj = obj as unknown as TiledObject;
      if (getObjectStringProperty(tiledObj, 'type') !== 'facility') {
        continue;
      }

      facilities.push({
        ids: resolveFacilityObjectIds(tiledObj),
        name: tiledObj.name,
        zone: getObjectStringProperty(tiledObj, 'zone'),
      });
    }
  }

  return facilities;
}

interface FacilityValidationResult {
  result: ValidationResult;
  count: number;
  aliasCount: number;
}

function validateFacilityZoneContracts(
  mapJson: TiledMap,
  validZones: Set<string>
): FacilityValidationResult {
  const result = new ValidationResult();
  const facilities = extractFacilityObjects(mapJson);
  const mappedFacilityIds = new Map<string, string>();
  let validFacilityObjects = 0;

  for (const facility of facilities) {
    if (facility.ids.length === 0) {
      result.addError(
        ValidationErrorCodes.UNKNOWN_FACILITY_REFERENCE,
        `facility object "${facility.name}" missing facility identifier`,
        { facilityName: facility.name }
      );
      continue;
    }

    if (!facility.zone) {
      result.addError(
        ValidationErrorCodes.INVALID_ZONE_ID,
        `facility object "${facility.name}" missing zone property`,
        { facilityName: facility.name }
      );
      continue;
    }

    if (!validZones.has(facility.zone)) {
      result.addError(
        ValidationErrorCodes.INVALID_ZONE_ID,
        `facility object "${facility.name}" has invalid zone "${facility.zone}"`,
        { facilityName: facility.name, zone: facility.zone }
      );
      continue;
    }

    const zoneFromNamePrefix = facility.name.includes('.') ? facility.name.split('.')[0] : null;
    if (zoneFromNamePrefix && zoneFromNamePrefix !== facility.zone) {
      result.addError(
        ValidationErrorCodes.ZONE_MISMATCH,
        `facility object "${facility.name}" has zone prefix "${zoneFromNamePrefix}" but zone property "${facility.zone}"`,
        { facilityName: facility.name, zonePrefix: zoneFromNamePrefix, zoneProperty: facility.zone }
      );
    }

    for (const facilityId of facility.ids) {
      const existing = mappedFacilityIds.get(facilityId);
      if (existing && existing !== facility.zone) {
        result.addError(
          ValidationErrorCodes.FACILITY_ZONE_CONFLICT,
          `facility id "${facilityId}" has conflicting zones ("${existing}" vs "${facility.zone}")`,
          { facilityId, existingZone: existing, newZone: facility.zone }
        );
        continue;
      }

      mappedFacilityIds.set(facilityId, facility.zone);
    }

    validFacilityObjects += 1;
  }

  const mapJsonAny = mapJson as unknown as Record<string, unknown>;
  const listedFacilities: unknown[] = Array.isArray(mapJsonAny.facilities)
    ? (mapJsonAny.facilities as unknown[])
    : [];
  for (const listedFacility of listedFacilities) {
    if (typeof listedFacility !== 'string') {
      result.addError(
        ValidationErrorCodes.UNKNOWN_FACILITY_REFERENCE,
        `map facilities entry must be a string, got ${typeof listedFacility}`,
        { listedFacility }
      );
      continue;
    }

    const normalized = normalizeFacilityId(listedFacility);
    if (!mappedFacilityIds.has(normalized)) {
      result.addError(
        ValidationErrorCodes.UNKNOWN_FACILITY_REFERENCE,
        `map facilities entry "${listedFacility}" has no matching facility object mapping`,
        { facilityId: listedFacility }
      );
    }
  }

  return { result, count: validFacilityObjects, aliasCount: mappedFacilityIds.size };
}

interface CollisionValidationResult {
  errors: string[];
  collisionData?: number[];
}

function validateCollisionLayer(mapJson: TiledMap): CollisionValidationResult {
  const errors: string[] = [];
  const collisionLayer = (mapJson.layers || []).find(
    (l: AnyLayer) => l.name === MAP_LAYERS.COLLISION
  );

  if (!collisionLayer) {
    errors.push(`${MAP_LAYERS.COLLISION} layer not found`);
    return { errors };
  }

  if (!('data' in collisionLayer) || !Array.isArray((collisionLayer as TileLayer).data)) {
    errors.push(`${MAP_LAYERS.COLLISION} layer data is not an array`);
    return { errors };
  }

  const data = (collisionLayer as TileLayer).data as number[];

  const invalidValues: Array<{ index: number; value: number }> = [];
  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    if (value !== 0 && value !== 1) {
      invalidValues.push({ index: i, value });
    }
  }

  if (invalidValues.length > 0) {
    const sample = invalidValues
      .slice(0, 5)
      .map(v => `[${v.index}]=${v.value}`)
      .join(', ');
    errors.push(
      `${MAP_LAYERS.COLLISION} layer contains non-binary values: ${sample}${invalidValues.length > 5 ? ` (+${invalidValues.length - 5} more)` : ''}`
    );
  }

  return { errors, collisionData: data };
}

interface SpawnValidationResult {
  errors: string[];
}

function validateSpawnPoint(
  mapJson: TiledMap,
  collisionData: number[] | undefined
): SpawnValidationResult {
  const errors: string[] = [];
  const { tx, ty } = DEFAULT_SPAWN_POINT;
  const width = mapJson.width || 0;
  const height = mapJson.height || 0;

  if (tx < 0 || tx >= width || ty < 0 || ty >= height) {
    errors.push(`spawn point (${tx}, ${ty}) is outside map bounds (${width}x${height})`);
    return { errors };
  }

  if (collisionData) {
    const index = ty * width + tx;
    const collisionValue = collisionData[index];
    if (collisionValue === 1) {
      errors.push(`spawn point (${tx}, ${ty}) is blocked by collision`);
    }
  }

  return { errors };
}

interface EntranceValidationResult {
  result: ValidationResult;
  entranceCount: number;
}

function validateEntrances(mapJson: TiledMap): EntranceValidationResult {
  const result = new ValidationResult();
  const objectsLayer = (mapJson.layers || []).find((l: AnyLayer) => l.name === MAP_LAYERS.OBJECTS);

  if (
    !objectsLayer ||
    !('objects' in objectsLayer) ||
    !Array.isArray((objectsLayer as ObjectGroup).objects)
  ) {
    return { result, entranceCount: 0 };
  }

  const objects = (objectsLayer as ObjectGroup).objects as unknown as TiledObject[];
  const entrances = objects.filter(obj => obj.type === 'building_entrance');

  for (const entrance of entrances) {
    const name = entrance.name || 'unnamed';
    const props = entrance.properties || [];
    const getProp = (key: string): unknown => props.find(p => p.name === key)?.value;

    const zone = getProp('zone') as string | undefined;
    const direction = getProp('direction') as string | undefined;
    const connectsTo = getProp('connectsTo') as string | undefined;

    if (!zone) {
      result.addError(
        ValidationErrorCodes.INVALID_ENTRANCE_ZONE,
        `entrance "${name}": missing zone property`,
        { entranceName: name }
      );
    } else if (!VALID_ZONES.includes(zone)) {
      result.addError(
        ValidationErrorCodes.INVALID_ENTRANCE_ZONE,
        `entrance "${name}": invalid zone "${zone}"`,
        { entranceName: name, zone }
      );
    }

    if (!direction) {
      result.addWarning(
        ValidationErrorCodes.MISSING_OPTIONAL_FIELD,
        `entrance "${name}": missing direction property`,
        { entranceName: name, field: 'direction' }
      );
    } else if (!VALID_DIRECTIONS.includes(direction)) {
      result.addError(
        ValidationErrorCodes.INVALID_ENTRANCE_CONTRACT,
        `entrance "${name}": invalid direction "${direction}"`,
        { entranceName: name, direction }
      );
    }

    if (!connectsTo) {
      result.addError(
        ValidationErrorCodes.INVALID_ENTRANCE_CONTRACT,
        `entrance "${name}": missing connectsTo property`,
        { entranceName: name }
      );
    } else if (!VALID_ZONES.includes(connectsTo)) {
      result.addError(
        ValidationErrorCodes.INVALID_ENTRANCE_CONTRACT,
        `entrance "${name}": invalid connectsTo "${connectsTo}"`,
        { entranceName: name, connectsTo }
      );
    }

    if (zone && connectsTo && zone === connectsTo) {
      result.addError(
        ValidationErrorCodes.INVALID_ENTRANCE_CONTRACT,
        `entrance "${name}": zone and connectsTo are the same ("${zone}")`,
        { entranceName: name, zone, connectsTo }
      );
    }
  }

  return { result, entranceCount: entrances.length };
}

interface ZoneEntranceValidationResult {
  result: ValidationResult;
  blockedEntrances: number;
  entranceCount: number;
}

/**
 * Validates that building_entrance objects have passable collision tiles (value=0)
 * at their entrance tile coordinates.
 */
function validateZoneEntrances(
  mapJson: TiledMap,
  collisionData: number[] | undefined
): ZoneEntranceValidationResult {
  const result = new ValidationResult();
  const objectsLayer = (mapJson.layers || []).find((l: AnyLayer) => l.name === MAP_LAYERS.OBJECTS);

  if (
    !objectsLayer ||
    !('objects' in objectsLayer) ||
    !Array.isArray((objectsLayer as ObjectGroup).objects)
  ) {
    return { result, blockedEntrances: 0, entranceCount: 0 };
  }

  const objects = (objectsLayer as ObjectGroup).objects as unknown as TiledObject[];
  const entrances = objects.filter(obj => obj.type === 'building_entrance');
  let blockedEntrances = 0;

  for (const entrance of entrances) {
    const name = entrance.name || 'unnamed';
    const { x, y, width, height } = entrance;
    const tileSize = MAP_CONFIG.tileSize;

    // Convert pixel coordinates to tile coordinates
    const startTx = Math.floor(x / tileSize);
    const startTy = Math.floor(y / tileSize);
    const endTx = Math.floor((x + width) / tileSize);
    const endTy = Math.floor((y + height) / tileSize);

    // Skip entrances that are completely outside the map bounds
    // These are markers for external zone transitions
    if (startTx >= MAP_CONFIG.width || startTy >= MAP_CONFIG.height || endTx <= 0 || endTy <= 0) {
      continue;
    }

    // Clamp to map bounds for partial overlaps
    const clampedStartTx = Math.max(0, startTx);
    const clampedStartTy = Math.max(0, startTy);
    const clampedEndTx = Math.min(MAP_CONFIG.width, endTx);
    const clampedEndTy = Math.min(MAP_CONFIG.height, endTy);

    // Check all tiles under the entrance area
    let hasPassableTile = false;
    let hasBlockedTile = false;
    let tilesChecked = 0;

    for (let tx = clampedStartTx; tx < clampedEndTx; tx++) {
      for (let ty = clampedStartTy; ty < clampedEndTy; ty++) {
        tilesChecked++;
        const index = ty * MAP_CONFIG.width + tx;
        if (collisionData && index >= 0 && index < collisionData.length) {
          if (collisionData[index] === 0) {
            hasPassableTile = true;
          } else if (collisionData[index] === 1) {
            hasBlockedTile = true;
          }
        }
      }
    }

    // Only report error if we checked tiles and found none passable
    if (tilesChecked > 0 && !hasPassableTile) {
      result.addError(
        ValidationErrorCodes.INVALID_ENTRANCE_CONTRACT,
        `entrance "${name}" at tiles (${startTx},${startTy})-(${endTx},${endTy}) has no passable tiles (all blocked)`,
        { entranceName: name, startTx, startTy, endTx, endTy }
      );
      blockedEntrances++;
    } else if (hasBlockedTile && hasPassableTile) {
      // Warn if entrance area has mixed passable/blocked tiles
      result.addWarning(
        ValidationErrorCodes.MIXED_ENTRANCE_TILES,
        `entrance "${name}" at tiles (${startTx},${startTy})-(${endTx},${endTy}) has mixed passable/blocked tiles`,
        { entranceName: name, startTx, startTy, endTx, endTy }
      );
    }
  }

  return { result, blockedEntrances, entranceCount: entrances.length };
}

interface ReachabilityResult {
  errors: string[];
  reachableZones: string[];
  unreachableZones: string[];
  fullyBlockedZones?: string[];
  visitedTileCount?: number;
}

/**
 * Implements BFS from spawn point to verify zone reachability.
 * Returns reachable zones and any unreachable zones.
 */
function validateSpawnReachability(mapJson: TiledMap, collisionData: number[]): ReachabilityResult {
  const errors: string[] = [];
  const reachableZones = new Set<string>();
  const visited = new Set<string>();
  const queue: Array<{ tx: number; ty: number }> = [];

  const { tx, ty } = DEFAULT_SPAWN_POINT;
  const width = MAP_CONFIG.width;
  const height = MAP_CONFIG.height;

  // Start BFS from spawn point
  const startIndex = ty * width + tx;
  if (collisionData[startIndex] === 1) {
    errors.push('spawn point is blocked, cannot perform reachability check');
    return { errors, reachableZones: [], unreachableZones: Object.keys(ZONE_BOUNDS) };
  }

  queue.push({ tx, ty });
  visited.add(`${tx},${ty}`);

  // Pre-calculate tile-to-zone mapping for O(1) lookup during BFS
  const tileZoneMap = new Map<string, string>();
  for (const [zoneName, bounds] of Object.entries(ZONE_BOUNDS)) {
    const startTx = Math.floor(bounds.x / MAP_CONFIG.tileSize);
    const startTy = Math.floor(bounds.y / MAP_CONFIG.tileSize);
    const endTx = Math.floor((bounds.x + bounds.width) / MAP_CONFIG.tileSize);
    const endTy = Math.floor((bounds.y + bounds.height) / MAP_CONFIG.tileSize);

    for (let tileX = startTx; tileX < endTx; tileX++) {
      for (let tileY = startTy; tileY < endTy; tileY++) {
        tileZoneMap.set(`${tileX},${tileY}`, zoneName);
      }
    }
  }

  // Check initial spawn zone
  const spawnZone = tileZoneMap.get(`${tx},${ty}`);
  if (spawnZone) {
    reachableZones.add(spawnZone);
  }

  // BFS
  const directions = [
    { dx: 0, dy: -1 }, // north
    { dx: 0, dy: 1 }, // south
    { dx: -1, dy: 0 }, // west
    { dx: 1, dy: 0 }, // east
  ];

  let queueHead = 0;
  while (queueHead < queue.length) {
    const current = queue[queueHead++];
    const ctx = current.tx;
    const cty = current.ty;

    for (const { dx, dy } of directions) {
      const ntx = ctx + dx;
      const nty = cty + dy;

      // Bounds check
      if (ntx < 0 || ntx >= width || nty < 0 || nty >= height) {
        continue;
      }

      const key = `${ntx},${nty}`;
      if (visited.has(key)) {
        continue;
      }

      // Check collision
      const index = nty * width + ntx;
      if (collisionData[index] === 1) {
        continue; // Blocked tile
      }

      visited.add(key);
      queue.push({ tx: ntx, ty: nty });

      // O(1) zone lookup using pre-calculated map
      const zone = tileZoneMap.get(key);
      if (zone) {
        reachableZones.add(zone);
      }
    }
  }

  // Determine unreachable zones
  const allZones = Object.keys(ZONE_BOUNDS);

  // Pre-calculate isZoneFullyBlocked for all zones (avoid redundant computation)
  const isFullyBlockedMap = new Map<string, boolean>();
  for (const zoneName of allZones) {
    const bounds = ZONE_BOUNDS[zoneName as keyof typeof ZONE_BOUNDS];
    const startTx = Math.floor(bounds.x / MAP_CONFIG.tileSize);
    const startTy = Math.floor(bounds.y / MAP_CONFIG.tileSize);
    const endTx = Math.floor((bounds.x + bounds.width) / MAP_CONFIG.tileSize);
    const endTy = Math.floor((bounds.y + bounds.height) / MAP_CONFIG.tileSize);

    let isFullyBlocked = true;
    outer: for (let tileX = startTx; tileX < endTx; tileX++) {
      for (let tileY = startTy; tileY < endTy; tileY++) {
        const index = tileY * MAP_CONFIG.width + tileX;
        if (collisionData[index] === 0) {
          isFullyBlocked = false;
          break outer;
        }
      }
    }
    isFullyBlockedMap.set(zoneName, isFullyBlocked);
  }

  const unreachableZones = allZones.filter(z => {
    if (reachableZones.has(z)) return false;
    return !isFullyBlockedMap.get(z);
  });

  const fullyBlockedZones = allZones.filter(z => {
    return !reachableZones.has(z) && isFullyBlockedMap.get(z);
  });

  if (unreachableZones.length > 0) {
    errors.push(`unreachable zones from spawn: ${unreachableZones.join(', ')}`);
  }

  return {
    errors,
    reachableZones: [...reachableZones],
    unreachableZones,
    fullyBlockedZones,
    visitedTileCount: visited.size,
  };
}

interface ZoneStat {
  zone: string;
  totalTiles: number;
  blockedTiles: number;
  passableTiles: number;
  blockPercentage: number;
}

interface ZoneBlockStatsResult {
  result: ValidationResult;
  stats: ZoneStat[];
}

/**
 * Generates zone block statistics for each zone.
 * Reports total tiles, blocked tiles, and block percentage.
 * Warns if any zone has >80% blocked tiles.
 */
function generateZoneBlockStats(
  mapJson: TiledMap,
  collisionData: number[] | undefined
): ZoneBlockStatsResult {
  const result = new ValidationResult();
  const stats: ZoneStat[] = [];
  const BLOCK_PERCENTAGE_WARNING_THRESHOLD = 80;

  for (const [zoneName, bounds] of Object.entries(ZONE_BOUNDS)) {
    // Convert pixel bounds to tile bounds
    const startTx = Math.floor(bounds.x / MAP_CONFIG.tileSize);
    const startTy = Math.floor(bounds.y / MAP_CONFIG.tileSize);
    const endTx = Math.floor((bounds.x + bounds.width) / MAP_CONFIG.tileSize);
    const endTy = Math.floor((bounds.y + bounds.height) / MAP_CONFIG.tileSize);

    let totalTiles = 0;
    let blockedTiles = 0;

    for (let tx = startTx; tx < endTx; tx++) {
      for (let ty = startTy; ty < endTy; ty++) {
        totalTiles++;
        const index = ty * MAP_CONFIG.width + tx;
        if (collisionData && index >= 0 && index < collisionData.length) {
          if (collisionData[index] === 1) {
            blockedTiles++;
          }
        }
      }
    }

    const passableTiles = totalTiles - blockedTiles;
    const blockPercentage = totalTiles > 0 ? Math.round((blockedTiles / totalTiles) * 100) : 0;

    stats.push({
      zone: zoneName,
      totalTiles,
      blockedTiles,
      passableTiles,
      blockPercentage,
    });

    if (blockPercentage >= BLOCK_PERCENTAGE_WARNING_THRESHOLD) {
      result.addWarning(
        ValidationErrorCodes.HIGH_BLOCK_PERCENTAGE,
        `zone "${zoneName}" has ${blockPercentage}% blocked tiles (${blockedTiles}/${totalTiles}) - possible misconfiguration`,
        { zone: zoneName, blockPercentage, blockedTiles, totalTiles }
      );
    }
  }

  return { result, stats };
}

interface CurationStructure {
  errors: string[];
  sources?: Record<string, CurationSource>;
  tilesetOutput?: CurationTilesetOutput;
  tiles?: CurationTile[];
}

interface CurationSource {
  path: string;
  tileSize: number;
  spacing?: number;
}

interface CurationTilesetOutput {
  width: number;
  height: number;
  tileSize: number;
  columns: number;
  rows: number;
  path: string;
}

interface CurationTile {
  id: string;
  index: number;
  source: string;
  col: number;
  row: number;
}

interface Curation {
  sources?: Record<string, CurationSource>;
  outputs?: {
    tileset?: CurationTilesetOutput;
  };
  tileset?: {
    tiles?: CurationTile[];
  };
}

function validateCurationStructure(curation: unknown): CurationStructure {
  const errors: string[] = [];

  if (!curation || typeof curation !== 'object') {
    return { errors: ['curation: manifest root must be an object'] };
  }

  const c = curation as Record<string, unknown>;

  const sources = c.sources;
  if (!sources || typeof sources !== 'object' || Array.isArray(sources)) {
    errors.push('curation: sources must be an object');
  }

  const outputs = c.outputs as Record<string, unknown> | undefined;
  if (!outputs || typeof outputs !== 'object' || Array.isArray(outputs)) {
    errors.push('curation: outputs must be an object');
  }

  const tilesetOutput = outputs?.tileset;
  if (!tilesetOutput || typeof tilesetOutput !== 'object' || Array.isArray(tilesetOutput)) {
    errors.push('curation.outputs.tileset must be an object');
  }

  const tileset = c.tileset as Record<string, unknown> | undefined;
  if (!tileset || typeof tileset !== 'object' || Array.isArray(tileset)) {
    errors.push('curation: tileset must be an object');
  }

  const tiles = tileset?.tiles;
  if (!Array.isArray(tiles)) {
    errors.push('curation.tileset.tiles must be an array');
  }

  return {
    errors,
    sources: sources as Record<string, CurationSource> | undefined,
    tilesetOutput: tilesetOutput as CurationTilesetOutput | undefined,
    tiles: tiles as CurationTile[] | undefined,
  };
}

function validateSources(sources: Record<string, CurationSource> | undefined): {
  errors: string[];
} {
  const errors: string[] = [];

  if (!sources || typeof sources !== 'object' || Array.isArray(sources)) {
    return { errors };
  }

  for (const [sourceName, source] of Object.entries(sources)) {
    const base = `curation.sources.${sourceName}`;
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      errors.push(`${base} must be an object`);
      continue;
    }

    if (typeof source.path !== 'string' || source.path.length === 0) {
      errors.push(`${base}.path must be a non-empty string`);
    } else {
      const absolutePath = join(ROOT_DIR, source.path);
      if (!existsSync(absolutePath)) {
        errors.push(`${base}.path not found: ${absolutePath}`);
      }
      if (source.path.includes('docs/reference')) {
        errors.push(
          `${base}.path must use repo-tracked assets, not docs/reference: ${source.path}`
        );
      }
    }

    if (!isPositiveInt(source.tileSize)) {
      errors.push(`${base}.tileSize must be a positive integer, got ${source.tileSize}`);
    }

    if (!isNonNegativeInt(source.spacing ?? 0)) {
      errors.push(`${base}.spacing must be a non-negative integer, got ${source.spacing}`);
    }
  }

  return { errors };
}

function validateTilesetOutput(tilesetOutput: CurationTilesetOutput | undefined): {
  errors: string[];
} {
  const errors: string[] = [];

  if (!tilesetOutput || typeof tilesetOutput !== 'object' || Array.isArray(tilesetOutput)) {
    return { errors };
  }

  const requiredIntFields: Array<keyof CurationTilesetOutput> = [
    'width',
    'height',
    'tileSize',
    'columns',
    'rows',
  ];
  for (const field of requiredIntFields) {
    if (!isPositiveInt(tilesetOutput[field])) {
      errors.push(
        `curation.outputs.tileset.${field} must be a positive integer, got ${tilesetOutput[field]}`
      );
    }
  }

  if (typeof tilesetOutput.path !== 'string' || tilesetOutput.path.length === 0) {
    errors.push('curation.outputs.tileset.path must be a non-empty string');
  }

  if (isPositiveInt(tilesetOutput.columns) && isPositiveInt(tilesetOutput.tileSize)) {
    const expectedWidth = tilesetOutput.columns * tilesetOutput.tileSize;
    if (tilesetOutput.width !== expectedWidth) {
      errors.push(
        `curation.outputs.tileset.width=${tilesetOutput.width}, expected=${expectedWidth}`
      );
    }
  }

  if (isPositiveInt(tilesetOutput.rows) && isPositiveInt(tilesetOutput.tileSize)) {
    const expectedHeight = tilesetOutput.rows * tilesetOutput.tileSize;
    if (tilesetOutput.height !== expectedHeight) {
      errors.push(
        `curation.outputs.tileset.height=${tilesetOutput.height}, expected=${expectedHeight}`
      );
    }
  }

  return { errors };
}

function validateTilesetTiles(
  tiles: CurationTile[] | undefined,
  sources: Record<string, CurationSource> | undefined,
  tilesetOutput: CurationTilesetOutput | undefined
): { errors: string[]; tileIndices: Set<number> } {
  const errors: string[] = [];
  const tileIndices = new Set<number>();
  const tileIds = new Set<string>();

  if (!Array.isArray(tiles)) {
    return { errors, tileIndices };
  }

  const expectedSlots =
    isPositiveInt(tilesetOutput?.columns) && isPositiveInt(tilesetOutput?.rows)
      ? tilesetOutput!.columns * tilesetOutput!.rows
      : null;

  if (expectedSlots !== null && tiles.length !== expectedSlots) {
    errors.push(`curation.tileset.tiles expected=${expectedSlots}, actual=${tiles.length}`);
  }

  for (const [index, tile] of tiles.entries()) {
    const base = `curation.tileset.tiles[${index}]`;
    if (!tile || typeof tile !== 'object' || Array.isArray(tile)) {
      errors.push(`${base} must be an object`);
      continue;
    }

    if (typeof tile.id !== 'string' || tile.id.length === 0) {
      errors.push(`${base}.id must be a non-empty string`);
    } else if (tileIds.has(tile.id)) {
      errors.push(`${base}.id duplicate value: ${tile.id}`);
    } else {
      tileIds.add(tile.id);
    }

    if (!isNonNegativeInt(tile.index)) {
      errors.push(`${base}.index must be a non-negative integer, got ${tile.index}`);
    } else {
      if (expectedSlots !== null && tile.index >= expectedSlots) {
        errors.push(`${base}.index=${tile.index} out of range (0..${expectedSlots - 1})`);
      }
      if (tileIndices.has(tile.index)) {
        errors.push(`${base}.index duplicate value: ${tile.index}`);
      }
      tileIndices.add(tile.index);
    }

    if (typeof tile.source !== 'string' || tile.source.length === 0) {
      errors.push(`${base}.source must be a non-empty string`);
    } else if (!sources || !(tile.source in sources)) {
      errors.push(`${base}.source references unknown source: ${tile.source}`);
    }

    if (!isNonNegativeInt(tile.col)) {
      errors.push(`${base}.col must be a non-negative integer, got ${tile.col}`);
    }

    if (!isNonNegativeInt(tile.row)) {
      errors.push(`${base}.row must be a non-negative integer, got ${tile.row}`);
    }
  }

  if (expectedSlots !== null && tileIndices.size !== expectedSlots) {
    errors.push(
      `curation.tileset.tiles defines ${tileIndices.size}/${expectedSlots} unique indices`
    );
  }

  return { errors, tileIndices };
}

interface TilesetMeta {
  tilewidth: number;
  tileheight: number;
  columns: number;
  tilecount: number;
  imagewidth: number;
  imageheight: number;
  image: string;
}

function validateTilesetMetaConsistency(
  tilesetMeta: TilesetMeta,
  tilesetOutput: CurationTilesetOutput | undefined
): { errors: string[] } {
  const errors: string[] = [];

  if (!tilesetMeta || typeof tilesetMeta !== 'object') {
    return { errors: ['tileset.json metadata must be a JSON object'] };
  }

  if (isPositiveInt(tilesetOutput?.tileSize)) {
    if (tilesetMeta.tilewidth !== tilesetOutput!.tileSize) {
      errors.push(
        `tileset.json: tilewidth=${tilesetMeta.tilewidth}, expected=${tilesetOutput!.tileSize}`
      );
    }
    if (tilesetMeta.tileheight !== tilesetOutput!.tileSize) {
      errors.push(
        `tileset.json: tileheight=${tilesetMeta.tileheight}, expected=${tilesetOutput!.tileSize}`
      );
    }
  }

  if (isPositiveInt(tilesetOutput?.columns) && isPositiveInt(tilesetOutput?.rows)) {
    const tileCount = tilesetOutput!.columns * tilesetOutput!.rows;
    if (tilesetMeta.columns !== tilesetOutput!.columns) {
      errors.push(
        `tileset.json: columns=${tilesetMeta.columns}, expected=${tilesetOutput!.columns}`
      );
    }
    if (tilesetMeta.tilecount !== tileCount) {
      errors.push(`tileset.json: tilecount=${tilesetMeta.tilecount}, expected=${tileCount}`);
    }
  }

  if (isPositiveInt(tilesetOutput?.width) && tilesetMeta.imagewidth !== tilesetOutput!.width) {
    errors.push(
      `tileset.json: imagewidth=${tilesetMeta.imagewidth}, expected=${tilesetOutput!.width}`
    );
  }

  if (isPositiveInt(tilesetOutput?.height) && tilesetMeta.imageheight !== tilesetOutput!.height) {
    errors.push(
      `tileset.json: imageheight=${tilesetMeta.imageheight}, expected=${tilesetOutput!.height}`
    );
  }

  if (typeof tilesetOutput?.path === 'string' && tilesetOutput.path.length > 0) {
    const expectedImageName = basename(tilesetOutput.path);
    if (tilesetMeta.image !== expectedImageName) {
      errors.push(`tileset.json: image=${tilesetMeta.image}, expected=${expectedImageName}`);
    }
  }

  return { errors };
}

interface TileIdContract {
  tilecount?: number;
  tiles?: Array<{ id: number }>;
}

function validateMapTileUsage(
  mapJson: TiledMap,
  tileIndices: Set<number>,
  tileIdContract: TileIdContract
): { errors: string[]; usedTileIds: Set<number> } {
  const errors: string[] = [];
  const usedTileIds = collectUsedTileIds(mapJson);

  const tileContractIds = new Set<number>();
  const tileCount = tileIdContract?.tilecount;
  if (isPositiveInt(tileCount)) {
    for (let id = 0; id < tileCount; id += 1) {
      tileContractIds.add(id);
    }
  }

  const contractTiles = tileIdContract?.tiles;
  if (!Array.isArray(contractTiles) && !isPositiveInt(tileCount)) {
    errors.push('village_tileset.json: tiles must be an array or tilecount must be present');
  } else if (Array.isArray(contractTiles)) {
    for (const tile of contractTiles) {
      if (tile && typeof tile === 'object' && isNonNegativeInt(tile.id)) {
        tileContractIds.add(tile.id);
      }
    }
  }

  for (const id of usedTileIds) {
    if (!tileIndices.has(id)) {
      errors.push(`map uses tile ID ${id} but curation.tileset.tiles does not define it`);
    }
    if (!tileContractIds.has(id)) {
      errors.push(`map uses tile ID ${id} but village_tileset.json contract does not define it`);
    }
  }

  return { errors, usedTileIds };
}

interface CurationContractInput {
  map: LoadedMap;
  curation: unknown;
  tilesetMeta: TilesetMeta;
  tileIdContract: TileIdContract;
}

function validateCurationContract({
  map,
  curation,
  tilesetMeta,
  tileIdContract,
}: CurationContractInput): {
  errors: string[];
  usedTileIds: number[];
} {
  const errors: string[] = [];

  const structure = validateCurationStructure(curation);
  errors.push(...structure.errors);
  if (structure.errors.length > 0) {
    return { errors, usedTileIds: [] };
  }

  const sourcesValidation = validateSources(structure.sources);
  errors.push(...sourcesValidation.errors);

  const outputValidation = validateTilesetOutput(structure.tilesetOutput);
  errors.push(...outputValidation.errors);

  const tilesValidation = validateTilesetTiles(
    structure.tiles,
    structure.sources,
    structure.tilesetOutput
  );
  errors.push(...tilesValidation.errors);

  const metaValidation = validateTilesetMetaConsistency(tilesetMeta, structure.tilesetOutput);
  errors.push(...metaValidation.errors);

  const usageValidation = validateMapTileUsage(
    map.json,
    tilesValidation.tileIndices,
    tileIdContract
  );
  errors.push(...usageValidation.errors);

  return { errors, usedTileIds: [...usageValidation.usedTileIds].sort((a, b) => a - b) };
}

function main(): void {
  console.log(
    '\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557'
  );
  console.log('\u2551     Map Stack Consistency Verification                       \u2551');
  console.log(
    '\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D\n'
  );

  const maps: Record<string, LoadedMap | null> = {};
  const missingFiles: string[] = [];
  for (const [name, path] of Object.entries(MAP_PATHS)) {
    maps[name] = loadMap(path);
    if (!maps[name]) {
      missingFiles.push(`[MISSING] ${name}: ${path}`);
    }
  }

  if (missingFiles.length > 0) {
    console.log('\u274C FILE EXISTENCE CHECK FAILED\n');
    missingFiles.forEach(msg => console.log(`  ${msg}`));
    process.exit(1);
  }

  console.log('\u2705 All map files exist\n');

  console.log('Checking hash consistency...');
  const hashes = Object.entries(maps).map(([name, map]) => ({
    name,
    hash: map!.hash,
  }));

  const allSameHash = hashes.every(h => h.hash === hashes[0].hash);
  if (!allSameHash) {
    console.log('\u274C HASH MISMATCH\n');
    hashes.forEach(({ name, hash }) => console.log(`  ${name}: ${hash}`));
    console.log('\n  Run: pnpm sync-maps to synchronize\n');
    process.exit(1);
  }

  console.log(`\u2705 All maps have same hash: ${hashes[0].hash}\n`);

  console.log('Validating map properties...');
  const sourceMap = maps.source!;
  const validationErrors: string[] = [
    ...validateMapDimensions(sourceMap, 'source'),
    ...validateTileset(sourceMap, 'source'),
  ];

  if (validationErrors.length > 0) {
    console.log('\u274C MAP PROPERTY VALIDATION FAILED\n');
    validationErrors.forEach(msg => console.log(`  ${msg}`));
    process.exit(1);
  }

  console.log(
    `\u2705 All maps use tilesets: ${EXPECTED_TILESETS.map(ts => ts.name).join(', ')} (16x16px)\n`
  );

  console.log('Validating Kenney curation contract...');
  const curation = loadRequiredJson(CONTRACT_PATHS.curation, 'kenney-curation');
  const tilesetMeta = loadRequiredJson<TilesetMeta>(CONTRACT_PATHS.tilesetMeta, 'tileset-meta');
  const tileIdContract = loadRequiredJson<TileIdContract>(
    CONTRACT_PATHS.tileIdContract,
    'tile-id-contract'
  );
  const manifest = loadRequiredJson<{ zones?: string[] }>(
    CONTRACT_PATHS.manifest,
    'world-manifest'
  );
  const validZones = new Set<string>(Array.isArray(manifest.zones) ? manifest.zones : []);

  const { errors: curationErrors, usedTileIds } = validateCurationContract({
    map: sourceMap,
    curation,
    tilesetMeta,
    tileIdContract,
  });

  if (curationErrors.length > 0) {
    console.log('\u274C TILESET CONTRACT VALIDATION FAILED\n');
    curationErrors.forEach(msg => console.log(`  ${msg}`));
    process.exit(1);
  }

  console.log('\u2705 Curation manifest and tileset metadata contract are valid');
  console.log(`\u2705 Map tile IDs are within contract: ${usedTileIds.join(', ')}\n`);

  console.log('Validating facility zone contracts...');
  const {
    result: facilityResult,
    count: facilityCount,
    aliasCount,
  } = validateFacilityZoneContracts(sourceMap.json, validZones);

  if (facilityResult.hasErrors()) {
    console.log('\u274C FACILITY CONTRACT VALIDATION FAILED\n');
    facilityResult.getErrors().forEach(err => {
      console.log(`  [${err.code}] ${err.detail}`);
    });
    process.exit(1);
  }
  if (facilityResult.hasWarnings()) {
    console.log('\u26A0\uFE0F  Facility zone warnings:\n');
    facilityResult.getWarnings().forEach(warn => {
      console.log(`  [${warn.code}] ${warn.detail}`);
    });
  }

  console.log(
    `\u2705 Facility zone contracts are valid (${facilityCount} mapped facilities, ${aliasCount} resolvable IDs)\n`
  );

  console.log('Validating collision layer...');
  const collisionValidation = validateCollisionLayer(sourceMap.json);
  if (collisionValidation.errors.length > 0) {
    console.log('\u274C COLLISION LAYER VALIDATION FAILED\n');
    collisionValidation.errors.forEach(msg => console.log(`  ${msg}`));
    process.exit(1);
  }
  console.log('\u2705 Collision layer contains only valid values (0/1)\n');

  console.log('Validating spawn point...');
  const spawnValidation = validateSpawnPoint(sourceMap.json, collisionValidation.collisionData);
  if (spawnValidation.errors.length > 0) {
    console.log('\u274C SPAWN POINT VALIDATION FAILED\n');
    spawnValidation.errors.forEach(msg => console.log(`  ${msg}`));
    process.exit(1);
  }
  console.log(
    `\u2705 Spawn point (${DEFAULT_SPAWN_POINT.tx}, ${DEFAULT_SPAWN_POINT.ty}) is valid and unblocked\n`
  );

  console.log('Validating building entrances...');
  const entranceValidation = validateEntrances(sourceMap.json);
  if (entranceValidation.result.hasErrors()) {
    console.log('\u274C ENTRANCE VALIDATION FAILED\n');
    entranceValidation.result.getErrors().forEach(err => {
      console.log(`  [${err.code}] ${err.detail}`);
    });
    process.exit(1);
  }
  if (entranceValidation.result.hasWarnings()) {
    console.log('\u26A0\uFE0F  Entrance warnings:\n');
    entranceValidation.result.getWarnings().forEach(warn => {
      console.log(`  [${warn.code}] ${warn.detail}`);
    });
  }
  console.log(
    `\u2705 ${entranceValidation.entranceCount} building entrances have valid zone/direction/connectsTo\n`
  );

  console.log('Validating zone entrance collision...');
  const zoneEntranceValidation = validateZoneEntrances(
    sourceMap.json,
    collisionValidation.collisionData
  );
  if (zoneEntranceValidation.result.hasErrors()) {
    console.log('\u274C ZONE ENTRANCE COLLISION VALIDATION FAILED\n');
    zoneEntranceValidation.result.getErrors().forEach(err => {
      console.log(`  [${err.code}] ${err.detail}`);
    });
    process.exit(1);
  }
  if (zoneEntranceValidation.result.hasWarnings()) {
    console.log('\u26A0\uFE0F  Zone entrance warnings:\n');
    zoneEntranceValidation.result.getWarnings().forEach(warn => {
      console.log(`  [${warn.code}] ${warn.detail}`);
    });
  }
  console.log(
    `\u2705 ${zoneEntranceValidation.entranceCount} zone entrances have passable collision tiles\n`
  );

  console.log('Validating spawn reachability (BFS)...');
  if (!collisionValidation.collisionData) {
    console.log('\n❌ COLLISION DATA MISSING\n');
    process.exit(1);
  }
  const reachabilityValidation = validateSpawnReachability(
    sourceMap.json,
    collisionValidation.collisionData
  );
  if (reachabilityValidation.errors.length > 0) {
    console.log('\u274C SPAWN REACHABILITY VALIDATION FAILED\n');
    reachabilityValidation.errors.forEach(msg => console.log(`  ${msg}`));
    process.exit(1);
  }
  const reachableCount = reachabilityValidation.reachableZones.length;
  const totalZones = Object.keys(ZONE_BOUNDS).length;
  const blockedCount = reachabilityValidation.fullyBlockedZones?.length || 0;
  console.log(
    `\u2705 Spawn reachability: ${reachabilityValidation.visitedTileCount} tiles reachable, ${reachableCount}/${totalZones} zones accessible${blockedCount > 0 ? ` (${blockedCount} fully blocked: ${reachabilityValidation.fullyBlockedZones!.join(', ')})` : ''}\n`
  );

  console.log('Generating zone block statistics...');
  const zoneStats = generateZoneBlockStats(sourceMap.json, collisionValidation.collisionData);
  if (zoneStats.result.hasErrors()) {
    console.log('\u274C ZONE BLOCK STATS GENERATION FAILED\n');
    zoneStats.result.getErrors().forEach(err => {
      console.log(`  [${err.code}] ${err.detail}`);
    });
    process.exit(1);
  }
  if (zoneStats.result.hasWarnings()) {
    console.log('\u26A0\uFE0F  Zone block warnings:\n');
    zoneStats.result.getWarnings().forEach(warn => {
      console.log(`  [${warn.code}] ${warn.detail}`);
    });
  }
  console.log('\u2705 Zone block statistics:');
  console.log('  Zone              | Total | Blocked | Passable | Block%');
  console.log('  ------------------|-------|---------|----------|--------');
  for (const stat of zoneStats.stats) {
    const zoneName = stat.zone.padEnd(18);
    const total = String(stat.totalTiles).padStart(5);
    const blocked = String(stat.blockedTiles).padStart(7);
    const passable = String(stat.passableTiles).padStart(8);
    const pct = (String(stat.blockPercentage) + '%').padStart(7);
    console.log(`  ${zoneName}|${total} |${blocked} |${passable} |${pct}`);
  }
  console.log();

  console.log(
    '\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550'
  );
  console.log('\u2705 MAP STACK CONSISTENCY VERIFIED');
  console.log(
    '\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n'
  );

  process.exit(0);
}

main();
