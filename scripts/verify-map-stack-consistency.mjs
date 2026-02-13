#!/usr/bin/env node
import { existsSync, readFileSync } from 'fs';
import { basename, dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');

const MAP_CONFIG = {
  width: 64,
  height: 64,
  tileSize: 16,
};

const MAP_PATHS = {
  source: join(ROOT_DIR, 'world/packs/base/maps/grid_town_outdoor.json'),
  server: join(ROOT_DIR, 'packages/server/assets/maps/village.json'),
  client: join(ROOT_DIR, 'packages/client/public/assets/maps/village.json'),
};

const EXPECTED_TILESET = {
  name: 'tileset',
  tilewidth: 16,
  tileheight: 16,
  image: 'tileset.png',
};

const CONTRACT_PATHS = {
  curation: join(ROOT_DIR, 'tools/kenney-curation.json'),
  tilesetMeta: join(ROOT_DIR, 'packages/client/public/assets/maps/tileset.json'),
  tileIdContract: join(ROOT_DIR, 'world/packs/base/assets/tilesets/village_tileset.json'),
  manifest: join(ROOT_DIR, 'world/packs/base/manifest.json'),
};

const DEFAULT_SPAWN_POINT = {
  x: 512,
  y: 512,
  tx: 32,
  ty: 32,
};

const VALID_ZONES = [
  'lobby',
  'office',
  'central-park',
  'arcade',
  'meeting',
  'lounge-cafe',
  'plaza',
  'lake',
];
const VALID_DIRECTIONS = ['north', 'south', 'east', 'west'];

// Zone bounds from packages/shared/src/world.ts
const ZONE_BOUNDS = {
  lobby: { x: 96, y: 32, width: 192, height: 192 },
  office: { x: 672, y: 32, width: 320, height: 224 },
  'central-park': { x: 320, y: 256, width: 384, height: 320 },
  arcade: { x: 704, y: 256, width: 288, height: 256 },
  meeting: { x: 32, y: 448, width: 256, height: 288 },
  'lounge-cafe': { x: 288, y: 608, width: 320, height: 224 },
  plaza: { x: 608, y: 608, width: 256, height: 256 },
  lake: { x: 32, y: 32, width: 64, height: 224 },
};

function md5(content) {
  return createHash('md5').update(content).digest('hex');
}

function loadMap(path) {
  if (!existsSync(path)) {
    return null;
  }
  const content = readFileSync(path, 'utf-8');
  try {
    return { content, json: JSON.parse(content), hash: md5(content) };
  } catch (e) {
    console.error(`❌ Failed to parse JSON: ${path}\n  ${e.message}`);
    process.exit(1);
  }
}

function loadRequiredJson(path, label) {
  if (!existsSync(path)) {
    console.error(`❌ Missing required file (${label}): ${path}`);
    process.exit(1);
  }

  const content = readFileSync(path, 'utf-8');
  try {
    return JSON.parse(content);
  } catch (e) {
    console.error(`❌ Failed to parse JSON (${label}): ${path}\n  ${e.message}`);
    process.exit(1);
  }
}

function validateMapDimensions(map, name) {
  const errors = [];
  const dimensions = {
    width: MAP_CONFIG.width,
    height: MAP_CONFIG.height,
    tilewidth: MAP_CONFIG.tileSize,
    tileheight: MAP_CONFIG.tileSize,
  };

  for (const [key, expected] of Object.entries(dimensions)) {
    if (map.json[key] !== expected) {
      errors.push(`${name}: ${key}=${map.json[key]}, expected=${expected}`);
    }
  }

  return errors;
}

function validateTileset(map, name) {
  const errors = [];
  const tilesets = map.json.tilesets || [];

  if (tilesets.length === 0) {
    errors.push(`${name}: no tilesets found`);
    return errors;
  }

  if (tilesets.length > 1) {
    errors.push(`${name}: expected 1 tileset, found ${tilesets.length}`);
  }

  const tileset = tilesets[0];
  for (const [key, expected] of Object.entries(EXPECTED_TILESET)) {
    if (tileset[key] !== expected) {
      errors.push(`${name}: tileset.${key}=${tileset[key]}, expected=${expected}`);
    }
  }

  return errors;
}

function isNonNegativeInt(value) {
  return Number.isInteger(value) && value >= 0;
}

function isPositiveInt(value) {
  return Number.isInteger(value) && value > 0;
}

function collectUsedTileIds(mapJson) {
  const used = new Set();
  for (const layer of mapJson.layers || []) {
    if (!Array.isArray(layer.data)) {
      continue;
    }
    for (const tileId of layer.data) {
      if (Number.isInteger(tileId)) {
        used.add(tileId);
      }
    }
  }
  return used;
}

function getObjectStringProperty(obj, name) {
  const prop = (obj.properties || []).find(p => p.name === name);
  return typeof prop?.value === 'string' ? prop.value : undefined;
}

function normalizeFacilityId(value) {
  return value.trim().replace(/_/g, '-');
}

function resolveFacilityObjectIds(obj) {
  const ids = [];
  const addId = raw => {
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

function extractFacilityObjects(mapJson) {
  const facilities = [];

  for (const layer of mapJson.layers || []) {
    if (layer.type !== 'objectgroup' || !Array.isArray(layer.objects)) {
      continue;
    }

    for (const obj of layer.objects) {
      if (getObjectStringProperty(obj, 'type') !== 'facility') {
        continue;
      }

      facilities.push({
        ids: resolveFacilityObjectIds(obj),
        name: obj.name,
        zone: getObjectStringProperty(obj, 'zone'),
      });
    }
  }

  return facilities;
}

function validateFacilityZoneContracts(mapJson, validZones) {
  const errors = [];
  const facilities = extractFacilityObjects(mapJson);
  const mappedFacilityIds = new Map();
  let validFacilityObjects = 0;

  for (const facility of facilities) {
    if (facility.ids.length === 0) {
      errors.push(`facility object "${facility.name}" missing facility identifier`);
      continue;
    }

    if (!facility.zone) {
      errors.push(`facility object "${facility.name}" missing zone property`);
      continue;
    }

    if (!validZones.has(facility.zone)) {
      errors.push(`facility object "${facility.name}" has invalid zone "${facility.zone}"`);
      continue;
    }

    const zoneFromNamePrefix = facility.name.includes('.') ? facility.name.split('.')[0] : null;
    if (zoneFromNamePrefix && zoneFromNamePrefix !== facility.zone) {
      errors.push(
        `facility object "${facility.name}" has zone prefix "${zoneFromNamePrefix}" but zone property "${facility.zone}"`
      );
    }

    for (const facilityId of facility.ids) {
      const existing = mappedFacilityIds.get(facilityId);
      if (existing && existing !== facility.zone) {
        errors.push(
          `facility id "${facilityId}" has conflicting zones ("${existing}" vs "${facility.zone}")`
        );
        continue;
      }

      mappedFacilityIds.set(facilityId, facility.zone);
    }

    validFacilityObjects += 1;
  }

  const listedFacilities = Array.isArray(mapJson.facilities) ? mapJson.facilities : [];
  for (const listedFacility of listedFacilities) {
    if (typeof listedFacility !== 'string') {
      errors.push(`map facilities entry must be a string, got ${typeof listedFacility}`);
      continue;
    }

    const normalized = normalizeFacilityId(listedFacility);
    if (!mappedFacilityIds.has(normalized)) {
      errors.push(
        `map facilities entry "${listedFacility}" has no matching facility object mapping`
      );
    }
  }

  return { errors, count: validFacilityObjects, aliasCount: mappedFacilityIds.size };
}

function validateCollisionLayer(mapJson) {
  const errors = [];
  const collisionLayer = (mapJson.layers || []).find(l => l.name === 'collision');

  if (!collisionLayer) {
    errors.push('collision layer not found');
    return { errors };
  }

  if (!Array.isArray(collisionLayer.data)) {
    errors.push('collision layer data is not an array');
    return { errors };
  }

  const invalidValues = [];
  for (let i = 0; i < collisionLayer.data.length; i++) {
    const value = collisionLayer.data[i];
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
      `collision layer contains non-binary values: ${sample}${invalidValues.length > 5 ? ` (+${invalidValues.length - 5} more)` : ''}`
    );
  }

  return { errors, collisionData: collisionLayer.data };
}

function validateSpawnPoint(mapJson, collisionData) {
  const errors = [];
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

function validateEntrances(mapJson) {
  const errors = [];
  const objectsLayer = (mapJson.layers || []).find(l => l.name === 'objects');

  if (!objectsLayer || !Array.isArray(objectsLayer.objects)) {
    return { errors };
  }

  const entrances = objectsLayer.objects.filter(obj => obj.type === 'building_entrance');

  for (const entrance of entrances) {
    const name = entrance.name || 'unnamed';
    const props = entrance.properties || [];
    const getProp = key => props.find(p => p.name === key)?.value;

    const zone = getProp('zone');
    const direction = getProp('direction');
    const connectsTo = getProp('connectsTo');

    if (!zone) {
      errors.push(`entrance "${name}": missing zone property`);
    } else if (!VALID_ZONES.includes(zone)) {
      errors.push(`entrance "${name}": invalid zone "${zone}"`);
    }

    if (!direction) {
      errors.push(`entrance "${name}": missing direction property`);
    } else if (!VALID_DIRECTIONS.includes(direction)) {
      errors.push(`entrance "${name}": invalid direction "${direction}"`);
    }

    if (!connectsTo) {
      errors.push(`entrance "${name}": missing connectsTo property`);
    } else if (!VALID_ZONES.includes(connectsTo)) {
      errors.push(`entrance "${name}": invalid connectsTo "${connectsTo}"`);
    }

    if (zone && connectsTo && zone === connectsTo) {
      errors.push(`entrance "${name}": zone and connectsTo are the same ("${zone}")`);
    }
  }

  return { errors, entranceCount: entrances.length };
}

/**
 * Validates that building_entrance objects have passable collision tiles (value=0)
 * at their entrance tile coordinates.
 */
function validateZoneEntrances(mapJson, collisionData) {
  const errors = [];
  const warnings = [];
  const objectsLayer = (mapJson.layers || []).find(l => l.name === 'objects');

  if (!objectsLayer || !Array.isArray(objectsLayer.objects)) {
    return { errors, warnings, blockedEntrances: 0 };
  }

  const entrances = objectsLayer.objects.filter(obj => obj.type === 'building_entrance');
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
      errors.push(
        `entrance "${name}" at tiles (${startTx},${startTy})-(${endTx},${endTy}) has no passable tiles (all blocked)`
      );
      blockedEntrances++;
    } else if (hasBlockedTile && hasPassableTile) {
      // Warn if entrance area has mixed passable/blocked tiles
      warnings.push(
        `entrance "${name}" at tiles (${startTx},${startTy})-(${endTx},${endTy}) has mixed passable/blocked tiles`
      );
    }
  }

  return { errors, warnings, blockedEntrances, entranceCount: entrances.length };
}

/**
 * Implements BFS from spawn point to verify zone reachability.
 * Returns reachable zones and any unreachable zones.
 */
function validateSpawnReachability(mapJson, collisionData) {
  const errors = [];
  const reachableZones = new Set();
  const visited = new Set();
  const queue = [];

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

  // Check if tile is in a zone
  function getZoneAtTile(tx, ty) {
    for (const [zoneName, bounds] of Object.entries(ZONE_BOUNDS)) {
      const tileX = tx * MAP_CONFIG.tileSize;
      const tileY = ty * MAP_CONFIG.tileSize;
      if (
        tileX >= bounds.x &&
        tileX < bounds.x + bounds.width &&
        tileY >= bounds.y &&
        tileY < bounds.y + bounds.height
      ) {
        return zoneName;
      }
    }
    return null;
  }

  // Check initial spawn zone
  const spawnZone = getZoneAtTile(tx, ty);
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

  while (queue.length > 0) {
    const { tx: ctx, ty: cty } = queue.shift();

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

      // Check if this tile is in a zone
      const zone = getZoneAtTile(ntx, nty);
      if (zone) {
        reachableZones.add(zone);
      }
    }
  }

  // Determine unreachable zones
  const allZones = Object.keys(ZONE_BOUNDS);

  // Check if each zone is 100% blocked (like decorative water)
  // If so, don't report as unreachable since it's intentional
  function isZoneFullyBlocked(zoneName) {
    const bounds = ZONE_BOUNDS[zoneName];
    const startTx = Math.floor(bounds.x / MAP_CONFIG.tileSize);
    const startTy = Math.floor(bounds.y / MAP_CONFIG.tileSize);
    const endTx = Math.floor((bounds.x + bounds.width) / MAP_CONFIG.tileSize);
    const endTy = Math.floor((bounds.y + bounds.height) / MAP_CONFIG.tileSize);

    for (let tx = startTx; tx < endTx; tx++) {
      for (let ty = startTy; ty < endTy; ty++) {
        const index = ty * MAP_CONFIG.width + tx;
        if (collisionData[index] === 0) {
          return false; // Has at least one passable tile
        }
      }
    }
    return true; // All tiles are blocked
  }

  const unreachableZones = allZones.filter(z => {
    if (reachableZones.has(z)) return false;
    // Skip zones that are 100% blocked (decorative/impassable by design)
    return !isZoneFullyBlocked(z);
  });

  const fullyBlockedZones = allZones.filter(z => {
    return !reachableZones.has(z) && isZoneFullyBlocked(z);
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

/**
 * Generates zone block statistics for each zone.
 * Reports total tiles, blocked tiles, and block percentage.
 * Warns if any zone has >80% blocked tiles.
 */
function generateZoneBlockStats(mapJson, collisionData) {
  const errors = [];
  const warnings = [];
  const stats = [];
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
      warnings.push(
        `zone "${zoneName}" has ${blockPercentage}% blocked tiles (${blockedTiles}/${totalTiles}) - possible misconfiguration`
      );
    }
  }

  return { errors, warnings, stats };
}

function validateCurationStructure(curation) {
  const errors = [];

  if (!curation || typeof curation !== 'object') {
    return { errors: ['curation: manifest root must be an object'] };
  }

  const sources = curation.sources;
  if (!sources || typeof sources !== 'object' || Array.isArray(sources)) {
    errors.push('curation: sources must be an object');
  }

  const outputs = curation.outputs;
  if (!outputs || typeof outputs !== 'object' || Array.isArray(outputs)) {
    errors.push('curation: outputs must be an object');
  }

  const tilesetOutput = outputs?.tileset;
  if (!tilesetOutput || typeof tilesetOutput !== 'object' || Array.isArray(tilesetOutput)) {
    errors.push('curation.outputs.tileset must be an object');
  }

  const tileset = curation.tileset;
  if (!tileset || typeof tileset !== 'object' || Array.isArray(tileset)) {
    errors.push('curation: tileset must be an object');
  }

  const tiles = tileset?.tiles;
  if (!Array.isArray(tiles)) {
    errors.push('curation.tileset.tiles must be an array');
  }

  return { errors, sources, tilesetOutput, tiles };
}

function validateSources(sources) {
  const errors = [];

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

function validateTilesetOutput(tilesetOutput) {
  const errors = [];

  if (!tilesetOutput || typeof tilesetOutput !== 'object' || Array.isArray(tilesetOutput)) {
    return { errors };
  }

  const requiredIntFields = ['width', 'height', 'tileSize', 'columns', 'rows'];
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

function validateTilesetTiles(tiles, sources, tilesetOutput) {
  const errors = [];
  const tileIndices = new Set();
  const tileIds = new Set();

  if (!Array.isArray(tiles)) {
    return { errors, tileIndices };
  }

  const expectedSlots =
    isPositiveInt(tilesetOutput?.columns) && isPositiveInt(tilesetOutput?.rows)
      ? tilesetOutput.columns * tilesetOutput.rows
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

function validateTilesetMetaConsistency(tilesetMeta, tilesetOutput) {
  const errors = [];

  if (!tilesetMeta || typeof tilesetMeta !== 'object') {
    return { errors: ['tileset.json metadata must be a JSON object'] };
  }

  if (isPositiveInt(tilesetOutput?.tileSize)) {
    if (tilesetMeta.tilewidth !== tilesetOutput.tileSize) {
      errors.push(
        `tileset.json: tilewidth=${tilesetMeta.tilewidth}, expected=${tilesetOutput.tileSize}`
      );
    }
    if (tilesetMeta.tileheight !== tilesetOutput.tileSize) {
      errors.push(
        `tileset.json: tileheight=${tilesetMeta.tileheight}, expected=${tilesetOutput.tileSize}`
      );
    }
  }

  if (isPositiveInt(tilesetOutput?.columns) && isPositiveInt(tilesetOutput?.rows)) {
    const tileCount = tilesetOutput.columns * tilesetOutput.rows;
    if (tilesetMeta.columns !== tilesetOutput.columns) {
      errors.push(
        `tileset.json: columns=${tilesetMeta.columns}, expected=${tilesetOutput.columns}`
      );
    }
    if (tilesetMeta.tilecount !== tileCount) {
      errors.push(`tileset.json: tilecount=${tilesetMeta.tilecount}, expected=${tileCount}`);
    }
  }

  if (isPositiveInt(tilesetOutput?.width) && tilesetMeta.imagewidth !== tilesetOutput.width) {
    errors.push(
      `tileset.json: imagewidth=${tilesetMeta.imagewidth}, expected=${tilesetOutput.width}`
    );
  }

  if (isPositiveInt(tilesetOutput?.height) && tilesetMeta.imageheight !== tilesetOutput.height) {
    errors.push(
      `tileset.json: imageheight=${tilesetMeta.imageheight}, expected=${tilesetOutput.height}`
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

function validateMapTileUsage(mapJson, tileIndices, tileIdContract) {
  const errors = [];
  const usedTileIds = collectUsedTileIds(mapJson);

  const tileContractIds = new Set();
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

function validateCurationContract({ map, curation, tilesetMeta, tileIdContract }) {
  const errors = [];

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

function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     Map Stack Consistency Verification                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const maps = {};
  const missingFiles = [];
  for (const [name, path] of Object.entries(MAP_PATHS)) {
    maps[name] = loadMap(path);
    if (!maps[name]) {
      missingFiles.push(`[MISSING] ${name}: ${path}`);
    }
  }

  if (missingFiles.length > 0) {
    console.log('❌ FILE EXISTENCE CHECK FAILED\n');
    missingFiles.forEach(msg => console.log(`  ${msg}`));
    process.exit(1);
  }

  console.log('✅ All map files exist\n');

  console.log('Checking hash consistency...');
  const hashes = Object.entries(maps).map(([name, map]) => ({
    name,
    hash: map.hash,
  }));

  const allSameHash = hashes.every(h => h.hash === hashes[0].hash);
  if (!allSameHash) {
    console.log('❌ HASH MISMATCH\n');
    hashes.forEach(({ name, hash }) => console.log(`  ${name}: ${hash}`));
    console.log('\n  Run: pnpm sync-maps to synchronize\n');
    process.exit(1);
  }

  console.log(`✅ All maps have same hash: ${hashes[0].hash}\n`);

  console.log('Validating map properties...');
  const sourceMap = maps.source;
  const validationErrors = [
    ...validateMapDimensions(sourceMap, 'source'),
    ...validateTileset(sourceMap, 'source'),
  ];

  if (validationErrors.length > 0) {
    console.log('❌ MAP PROPERTY VALIDATION FAILED\n');
    validationErrors.forEach(msg => console.log(`  ${msg}`));
    process.exit(1);
  }

  console.log(
    `✅ All maps use tileset: ${EXPECTED_TILESET.name} (${EXPECTED_TILESET.tilewidth}x${EXPECTED_TILESET.tileheight}px)\n`
  );

  console.log('Validating Kenney curation contract...');
  const curation = loadRequiredJson(CONTRACT_PATHS.curation, 'kenney-curation');
  const tilesetMeta = loadRequiredJson(CONTRACT_PATHS.tilesetMeta, 'tileset-meta');
  const tileIdContract = loadRequiredJson(CONTRACT_PATHS.tileIdContract, 'tile-id-contract');
  const manifest = loadRequiredJson(CONTRACT_PATHS.manifest, 'world-manifest');
  const validZones = new Set(Array.isArray(manifest.zones) ? manifest.zones : []);

  const { errors: curationErrors, usedTileIds } = validateCurationContract({
    map: sourceMap,
    curation,
    tilesetMeta,
    tileIdContract,
  });

  if (curationErrors.length > 0) {
    console.log('❌ TILESET CONTRACT VALIDATION FAILED\n');
    curationErrors.forEach(msg => console.log(`  ${msg}`));
    process.exit(1);
  }

  console.log('✅ Curation manifest and tileset metadata contract are valid');
  console.log(`✅ Map tile IDs are within contract: ${usedTileIds.join(', ')}\n`);

  console.log('Validating facility zone contracts...');
  const {
    errors: facilityErrors,
    count: facilityCount,
    aliasCount,
  } = validateFacilityZoneContracts(sourceMap.json, validZones);

  if (facilityErrors.length > 0) {
    console.log('❌ FACILITY CONTRACT VALIDATION FAILED\n');
    facilityErrors.forEach(msg => console.log(`  ${msg}`));
    process.exit(1);
  }

  console.log(
    `✅ Facility zone contracts are valid (${facilityCount} mapped facilities, ${aliasCount} resolvable IDs)\n`
  );

  console.log('Validating collision layer...');
  const collisionValidation = validateCollisionLayer(sourceMap.json);
  if (collisionValidation.errors.length > 0) {
    console.log('❌ COLLISION LAYER VALIDATION FAILED\n');
    collisionValidation.errors.forEach(msg => console.log(`  ${msg}`));
    process.exit(1);
  }
  console.log('✅ Collision layer contains only valid values (0/1)\n');

  console.log('Validating spawn point...');
  const spawnValidation = validateSpawnPoint(sourceMap.json, collisionValidation.collisionData);
  if (spawnValidation.errors.length > 0) {
    console.log('❌ SPAWN POINT VALIDATION FAILED\n');
    spawnValidation.errors.forEach(msg => console.log(`  ${msg}`));
    process.exit(1);
  }
  console.log(
    `✅ Spawn point (${DEFAULT_SPAWN_POINT.tx}, ${DEFAULT_SPAWN_POINT.ty}) is valid and unblocked\n`
  );

  console.log('Validating building entrances...');
  const entranceValidation = validateEntrances(sourceMap.json);
  if (entranceValidation.errors.length > 0) {
    console.log('❌ ENTRANCE VALIDATION FAILED\n');
    entranceValidation.errors.forEach(msg => console.log(`  ${msg}`));
    process.exit(1);
  }
  console.log(
    `✅ ${entranceValidation.entranceCount} building entrances have valid zone/direction/connectsTo\n`
  );

  console.log('Validating zone entrance collision...');
  const zoneEntranceValidation = validateZoneEntrances(
    sourceMap.json,
    collisionValidation.collisionData
  );
  if (zoneEntranceValidation.errors.length > 0) {
    console.log('❌ ZONE ENTRANCE COLLISION VALIDATION FAILED\n');
    zoneEntranceValidation.errors.forEach(msg => console.log(`  ${msg}`));
    process.exit(1);
  }
  if (zoneEntranceValidation.warnings.length > 0) {
    console.log('⚠️  Zone entrance warnings:\n');
    zoneEntranceValidation.warnings.forEach(msg => console.log(`  ${msg}`));
  }
  console.log(
    `✅ ${zoneEntranceValidation.entranceCount} zone entrances have passable collision tiles\n`
  );

  console.log('Validating spawn reachability (BFS)...');
  const reachabilityValidation = validateSpawnReachability(
    sourceMap.json,
    collisionValidation.collisionData
  );
  if (reachabilityValidation.errors.length > 0) {
    console.log('❌ SPAWN REACHABILITY VALIDATION FAILED\n');
    reachabilityValidation.errors.forEach(msg => console.log(`  ${msg}`));
    process.exit(1);
  }
  const reachableCount = reachabilityValidation.reachableZones.length;
  const totalZones = Object.keys(ZONE_BOUNDS).length;
  const blockedCount = reachabilityValidation.fullyBlockedZones?.length || 0;
  console.log(
    `✅ Spawn reachability: ${reachabilityValidation.visitedTileCount} tiles reachable, ${reachableCount}/${totalZones} zones accessible${blockedCount > 0 ? ` (${blockedCount} fully blocked: ${reachabilityValidation.fullyBlockedZones.join(', ')})` : ''}\n`
  );

  console.log('Generating zone block statistics...');
  const zoneStats = generateZoneBlockStats(sourceMap.json, collisionValidation.collisionData);
  if (zoneStats.errors.length > 0) {
    console.log('❌ ZONE BLOCK STATS GENERATION FAILED\n');
    zoneStats.errors.forEach(msg => console.log(`  ${msg}`));
    process.exit(1);
  }
  if (zoneStats.warnings.length > 0) {
    console.log('⚠️  Zone block warnings:\n');
    zoneStats.warnings.forEach(msg => console.log(`  ${msg}`));
  }
  console.log('✅ Zone block statistics:');
  console.log('  Zone              | Total | Blocked | Passable | Block%');
  console.log('  ------------------|-------|---------|----------|--------');
  for (const stat of zoneStats.stats) {
    const zoneName = stat.zone.padEnd(17);
    const total = String(stat.totalTiles).padStart(5);
    const blocked = String(stat.blockedTiles).padStart(7);
    const passable = String(stat.passableTiles).padStart(8);
    const pct = String(stat.blockPercentage).padStart(6);
    console.log(`  ${zoneName}| ${total} |   ${blocked} |    ${passable} |  ${pct}%`);
  }
  console.log();

  console.log('══════════════════════════════════════════════════════════════');
  console.log('✅ MAP STACK CONSISTENCY VERIFIED');
  console.log('══════════════════════════════════════════════════════════════\n');

  process.exit(0);
}

main();
