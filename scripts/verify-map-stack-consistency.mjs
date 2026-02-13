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

function validateCurationStructure(curation) {
  const errors = [];
  const warnings = [];

  if (!curation || typeof curation !== 'object') {
    return { errors: ['curation: manifest root must be an object'], warnings };
  }

  const sourceRootRel = curation.sourceRoot;
  if (typeof sourceRootRel !== 'string' || sourceRootRel.length === 0) {
    errors.push('curation: sourceRoot must be a non-empty string');
  }

  let sourceRootAbs = '';
  if (typeof sourceRootRel === 'string' && sourceRootRel.length > 0) {
    sourceRootAbs = join(ROOT_DIR, sourceRootRel);
    if (!existsSync(sourceRootAbs)) {
      warnings.push(`curation: sourceRoot not found (asset path check skipped): ${sourceRootAbs}`);
    }
  }

  const packs = curation.packs;
  if (!packs || typeof packs !== 'object' || Array.isArray(packs)) {
    errors.push('curation: packs must be an object');
  }

  const tileset = curation.tileset;
  if (!tileset || typeof tileset !== 'object' || Array.isArray(tileset)) {
    errors.push('curation: tileset must be an object');
  }

  return { errors, warnings, sourceRootAbs, packs, tileset };
}

function validateTilesetFields(tileset) {
  const errors = [];

  const tileSize = tileset?.tileSize;
  const columns = tileset?.columns;
  const rows = tileset?.rows;
  const outputPng = tileset?.outputPng;
  const outputMeta = tileset?.outputMeta;
  const slots = tileset?.slots;

  if (!isPositiveInt(tileSize)) {
    errors.push(`curation.tileset.tileSize must be a positive integer, got ${tileSize}`);
  } else if (tileSize !== MAP_CONFIG.tileSize) {
    errors.push(
      `curation.tileset.tileSize=${tileSize} must match MAP_CONFIG.tileSize=${MAP_CONFIG.tileSize}`
    );
  }

  if (!isPositiveInt(columns)) {
    errors.push(`curation.tileset.columns must be a positive integer, got ${columns}`);
  }

  if (!isPositiveInt(rows)) {
    errors.push(`curation.tileset.rows must be a positive integer, got ${rows}`);
  }

  if (typeof outputPng !== 'string' || outputPng.length === 0) {
    errors.push('curation.tileset.outputPng must be a non-empty string');
  }

  if (typeof outputMeta !== 'string' || outputMeta.length === 0) {
    errors.push('curation.tileset.outputMeta must be a non-empty string');
  }

  const expectedSlots = isPositiveInt(columns) && isPositiveInt(rows) ? columns * rows : null;
  if (!Array.isArray(slots)) {
    errors.push('curation.tileset.slots must be an array');
  } else if (expectedSlots !== null && slots.length !== expectedSlots) {
    errors.push(
      `curation.tileset.slots expected=${expectedSlots}, actual=${slots.length} (must define 32-slot contract)`
    );
  }

  return { errors, tileSize, columns, rows, outputPng, outputMeta, slots, expectedSlots };
}

function validateTilesetSlots({ slots, packs, expectedSlots }) {
  const errors = [];
  const slotSet = new Set();

  if (!Array.isArray(slots) || expectedSlots === null || !packs || typeof packs !== 'object') {
    return { errors, slotSet };
  }

  for (const [index, slot] of slots.entries()) {
    const base = `curation.tileset.slots[${index}]`;
    if (!slot || typeof slot !== 'object' || Array.isArray(slot)) {
      errors.push(`${base} must be an object`);
      continue;
    }

    if (!isNonNegativeInt(slot.slot)) {
      errors.push(`${base}.slot must be a non-negative integer, got ${slot.slot}`);
    } else {
      if (slot.slot >= expectedSlots) {
        errors.push(`${base}.slot=${slot.slot} out of range (0..${expectedSlots - 1})`);
      }
      if (slotSet.has(slot.slot)) {
        errors.push(`${base}.slot duplicate value: ${slot.slot}`);
      }
      slotSet.add(slot.slot);
    }

    if (typeof slot.semantic !== 'string' || slot.semantic.length === 0) {
      errors.push(`${base}.semantic must be a non-empty string`);
    }

    const source = slot.source;
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      errors.push(`${base}.source must be an object`);
      continue;
    }

    if (typeof source.pack !== 'string' || source.pack.length === 0) {
      errors.push(`${base}.source.pack must be a non-empty string`);
    } else if (!(source.pack in packs)) {
      errors.push(`${base}.source.pack references unknown pack: ${source.pack}`);
    }

    if (!isNonNegativeInt(source.col)) {
      errors.push(`${base}.source.col must be a non-negative integer, got ${source.col}`);
    }
    if (!isNonNegativeInt(source.row)) {
      errors.push(`${base}.source.row must be a non-negative integer, got ${source.row}`);
    }
  }

  if (slotSet.size !== expectedSlots) {
    errors.push(`curation.tileset.slots defines ${slotSet.size}/${expectedSlots} unique slot indexes`);
  }

  return { errors, slotSet };
}

function validatePackDefinitions({ packs, sourceRootAbs, tileSize }) {
  const errors = [];
  const warnings = [];

  if (!packs || typeof packs !== 'object' || Array.isArray(packs)) {
    return { errors, warnings };
  }

  if (typeof sourceRootAbs !== 'string' || sourceRootAbs.length === 0 || !existsSync(sourceRootAbs)) {
    warnings.push('curation: skipped pack path existence checks because sourceRoot is unavailable');
    return { errors, warnings };
  }

  for (const [packName, pack] of Object.entries(packs)) {
    if (!pack || typeof pack !== 'object' || Array.isArray(pack)) {
      errors.push(`curation.packs.${packName} must be an object`);
      continue;
    }

    if (!isPositiveInt(pack.tileSize)) {
      errors.push(`curation.packs.${packName}.tileSize must be a positive integer`);
    } else if (isPositiveInt(tileSize) && pack.tileSize !== tileSize) {
      errors.push(
        `curation.packs.${packName}.tileSize=${pack.tileSize} must match curation.tileset.tileSize=${tileSize}`
      );
    }

    const spacing = pack.spacing ?? 0;
    if (!isNonNegativeInt(spacing)) {
      errors.push(`curation.packs.${packName}.spacing must be a non-negative integer`);
    }

    if (typeof pack.path !== 'string' || pack.path.length === 0) {
      errors.push(`curation.packs.${packName}.path must be a non-empty string`);
    } else {
      const absolutePackPath = join(sourceRootAbs, pack.path);
      if (!existsSync(absolutePackPath)) {
        errors.push(`curation.packs.${packName}.path not found: ${absolutePackPath}`);
      }
    }
  }

  return { errors, warnings };
}

function validateTilesetMetaConsistency({ tilesetMeta, tileSize, columns, rows, outputPng }) {
  const errors = [];

  if (!tilesetMeta || typeof tilesetMeta !== 'object') {
    return { errors: ['tileset.json metadata must be a JSON object'] };
  }

  if (isPositiveInt(tileSize)) {
    if (tilesetMeta.tilewidth !== tileSize) {
      errors.push(`tileset.json: tilewidth=${tilesetMeta.tilewidth}, expected=${tileSize}`);
    }
    if (tilesetMeta.tileheight !== tileSize) {
      errors.push(`tileset.json: tileheight=${tilesetMeta.tileheight}, expected=${tileSize}`);
    }
  }

  if (isPositiveInt(columns) && isPositiveInt(rows)) {
    const tileCount = columns * rows;
    if (tilesetMeta.columns !== columns) {
      errors.push(`tileset.json: columns=${tilesetMeta.columns}, expected=${columns}`);
    }
    if (tilesetMeta.tilecount !== tileCount) {
      errors.push(`tileset.json: tilecount=${tilesetMeta.tilecount}, expected=${tileCount}`);
    }
    if (isPositiveInt(tileSize)) {
      const expectedWidth = columns * tileSize;
      const expectedHeight = rows * tileSize;
      if (tilesetMeta.imagewidth !== expectedWidth) {
        errors.push(`tileset.json: imagewidth=${tilesetMeta.imagewidth}, expected=${expectedWidth}`);
      }
      if (tilesetMeta.imageheight !== expectedHeight) {
        errors.push(`tileset.json: imageheight=${tilesetMeta.imageheight}, expected=${expectedHeight}`);
      }
    }
  }

  if (typeof outputPng === 'string' && outputPng.length > 0) {
    const expectedImageName = basename(outputPng);
    if (tilesetMeta.image !== expectedImageName) {
      errors.push(`tileset.json: image=${tilesetMeta.image}, expected=${expectedImageName}`);
    }
  }

  return { errors };
}

function validateMapTileUsage({ mapJson, slotSet, tileIdContract }) {
  const errors = [];
  const usedTileIds = collectUsedTileIds(mapJson);

  const tileContractIds = new Set();
  const contractTiles = tileIdContract?.tiles;
  if (!Array.isArray(contractTiles)) {
    errors.push('village_tileset.json: tiles must be an array');
  } else {
    for (const tile of contractTiles) {
      if (tile && typeof tile === 'object' && isNonNegativeInt(tile.id)) {
        tileContractIds.add(tile.id);
      }
    }
  }

  for (const id of usedTileIds) {
    if (!slotSet.has(id)) {
      errors.push(`map uses tile ID ${id} but curation.tileset.slots does not define it`);
    }
    if (!tileContractIds.has(id)) {
      errors.push(`map uses tile ID ${id} but village_tileset.json contract does not define it`);
    }
  }

  return { errors, usedTileIds };
}

function validateCurationContract({ map, curation, tilesetMeta, tileIdContract }) {
  const structure = validateCurationStructure(curation);
  const { errors, warnings, sourceRootAbs, packs, tileset } = structure;

  if (!tileset || typeof tileset !== 'object' || Array.isArray(tileset)) {
    return { errors, warnings };
  }

  const tilesetFields = validateTilesetFields(tileset);
  errors.push(...tilesetFields.errors);

  const { tileSize, columns, rows, outputPng, slots, expectedSlots } = tilesetFields;

  const slotValidation = validateTilesetSlots({ slots, packs, expectedSlots });
  errors.push(...slotValidation.errors);

  const packValidation = validatePackDefinitions({ packs, sourceRootAbs, tileSize });
  errors.push(...packValidation.errors);
  warnings.push(...packValidation.warnings);

  const tilesetMetaValidation = validateTilesetMetaConsistency({
    tilesetMeta,
    tileSize,
    columns,
    rows,
    outputPng,
  });
  errors.push(...tilesetMetaValidation.errors);

  const mapUsageValidation = validateMapTileUsage({
    mapJson: map.json,
    slotSet: slotValidation.slotSet,
    tileIdContract,
  });
  errors.push(...mapUsageValidation.errors);

  return { errors, warnings };
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

  const { errors: curationErrors, warnings: curationWarnings } = validateCurationContract({
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

  if (curationWarnings.length > 0) {
    console.log('⚠️  Curation warnings');
    curationWarnings.forEach(msg => console.log(`  ${msg}`));
    console.log('');
  }

  const usedTileIds = [...collectUsedTileIds(sourceMap.json)].sort((a, b) => a - b);
  console.log(
    `✅ Curation manifest valid (${curation.tileset.columns}x${curation.tileset.rows}, ${curation.tileset.slots.length} slots)`
  );
  console.log(`✅ Map tile IDs are within contract: ${usedTileIds.join(', ')}\n`);

  console.log('══════════════════════════════════════════════════════════════');
  console.log('✅ MAP STACK CONSISTENCY VERIFIED');
  console.log('══════════════════════════════════════════════════════════════\n');

  process.exit(0);
}

main();
