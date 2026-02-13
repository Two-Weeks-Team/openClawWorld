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

function resolveFacilityObjectId(obj) {
  const explicitId = getObjectStringProperty(obj, 'facilityId');
  if (explicitId && explicitId.length > 0) {
    return normalizeFacilityId(explicitId);
  }

  const explicitType = getObjectStringProperty(obj, 'facilityType');
  if (explicitType && explicitType.length > 0) {
    return normalizeFacilityId(explicitType);
  }

  if (typeof obj.type === 'string' && obj.type.length > 0 && obj.type !== 'facility') {
    return normalizeFacilityId(obj.type);
  }

  if (typeof obj.name === 'string' && obj.name.includes('.')) {
    const suffix = obj.name.split('.').pop();
    if (suffix && suffix.length > 0) {
      return normalizeFacilityId(suffix);
    }
  }

  if (typeof obj.name === 'string' && obj.name.length > 0) {
    return normalizeFacilityId(obj.name);
  }

  return undefined;
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
        id: resolveFacilityObjectId(obj),
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

  for (const facility of facilities) {
    if (!facility.id) {
      errors.push(`facility object "${facility.name}" missing facility identifier`);
      continue;
    }

    if (!facility.zone) {
      errors.push(`facility object "${facility.name}" (${facility.id}) missing zone property`);
      continue;
    }

    if (!validZones.has(facility.zone)) {
      errors.push(
        `facility object "${facility.name}" (${facility.id}) has invalid zone "${facility.zone}"`
      );
      continue;
    }

    const zoneFromNamePrefix = facility.name.includes('.') ? facility.name.split('.')[0] : null;
    if (zoneFromNamePrefix && zoneFromNamePrefix !== facility.zone) {
      errors.push(
        `facility object "${facility.name}" has zone prefix "${zoneFromNamePrefix}" but zone property "${facility.zone}"`
      );
    }

    const existing = mappedFacilityIds.get(facility.id);
    if (existing && existing !== facility.zone) {
      errors.push(
        `facility id "${facility.id}" has conflicting zones ("${existing}" vs "${facility.zone}")`
      );
      continue;
    }

    mappedFacilityIds.set(facility.id, facility.zone);
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

  return { errors, count: mappedFacilityIds.size };
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
  const { errors: facilityErrors, count: facilityCount } = validateFacilityZoneContracts(
    sourceMap.json,
    validZones
  );

  if (facilityErrors.length > 0) {
    console.log('❌ FACILITY CONTRACT VALIDATION FAILED\n');
    facilityErrors.forEach(msg => console.log(`  ${msg}`));
    process.exit(1);
  }

  console.log(`✅ Facility zone contracts are valid (${facilityCount} mapped facilities)\n`);

  console.log('══════════════════════════════════════════════════════════════');
  console.log('✅ MAP STACK CONSISTENCY VERIFIED');
  console.log('══════════════════════════════════════════════════════════════\n');

  process.exit(0);
}

main();
