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
  pixelWidth: 1024,
  pixelHeight: 1024,
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
  return { content, json: JSON.parse(content), hash: md5(content) };
}

function validateMapDimensions(map, name) {
  const errors = [];

  if (map.json.width !== MAP_CONFIG.width) {
    errors.push(`${name}: width=${map.json.width}, expected=${MAP_CONFIG.width}`);
  }
  if (map.json.height !== MAP_CONFIG.height) {
    errors.push(`${name}: height=${map.json.height}, expected=${MAP_CONFIG.height}`);
  }
  if (map.json.tilewidth !== MAP_CONFIG.tileSize) {
    errors.push(`${name}: tilewidth=${map.json.tilewidth}, expected=${MAP_CONFIG.tileSize}`);
  }
  if (map.json.tileheight !== MAP_CONFIG.tileSize) {
    errors.push(`${name}: tileheight=${map.json.tileheight}, expected=${MAP_CONFIG.tileSize}`);
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

  const tileset = tilesets[0];

  if (tileset.name !== EXPECTED_TILESET.name) {
    errors.push(`${name}: tileset.name=${tileset.name}, expected=${EXPECTED_TILESET.name}`);
  }
  if (tileset.tilewidth !== EXPECTED_TILESET.tilewidth) {
    errors.push(
      `${name}: tileset.tilewidth=${tileset.tilewidth}, expected=${EXPECTED_TILESET.tilewidth}`
    );
  }
  if (tileset.tileheight !== EXPECTED_TILESET.tileheight) {
    errors.push(
      `${name}: tileset.tileheight=${tileset.tileheight}, expected=${EXPECTED_TILESET.tileheight}`
    );
  }
  if (tileset.image !== EXPECTED_TILESET.image) {
    errors.push(`${name}: tileset.image=${tileset.image}, expected=${EXPECTED_TILESET.image}`);
  }

  return errors;
}

function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     Map Stack Consistency Verification                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const results = {
    passed: [],
    failed: [],
  };

  const maps = {};
  for (const [name, path] of Object.entries(MAP_PATHS)) {
    maps[name] = loadMap(path);
    if (!maps[name]) {
      results.failed.push(`[MISSING] ${name}: ${path}`);
    } else {
      results.passed.push(`[EXISTS] ${name}: ${path}`);
    }
  }

  if (results.failed.length > 0) {
    console.log('❌ FILE EXISTENCE CHECK FAILED\n');
    results.failed.forEach(msg => console.log(`  ${msg}`));
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

  console.log('Validating map dimensions...');
  const dimensionErrors = [];
  for (const [name, map] of Object.entries(maps)) {
    dimensionErrors.push(...validateMapDimensions(map, name));
  }

  if (dimensionErrors.length > 0) {
    console.log('❌ DIMENSION VALIDATION FAILED\n');
    dimensionErrors.forEach(msg => console.log(`  ${msg}`));
    process.exit(1);
  }

  console.log(
    `✅ All maps: ${MAP_CONFIG.width}x${MAP_CONFIG.height} tiles @ ${MAP_CONFIG.tileSize}px\n`
  );

  console.log('Validating tileset configuration...');
  const tilesetErrors = [];
  for (const [name, map] of Object.entries(maps)) {
    tilesetErrors.push(...validateTileset(map, name));
  }

  if (tilesetErrors.length > 0) {
    console.log('❌ TILESET VALIDATION FAILED\n');
    tilesetErrors.forEach(msg => console.log(`  ${msg}`));
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
