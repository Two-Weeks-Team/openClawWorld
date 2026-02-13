#!/usr/bin/env node
import { existsSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
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

  console.log('══════════════════════════════════════════════════════════════');
  console.log('✅ MAP STACK CONSISTENCY VERIFIED');
  console.log('══════════════════════════════════════════════════════════════\n');

  process.exit(0);
}

main();
