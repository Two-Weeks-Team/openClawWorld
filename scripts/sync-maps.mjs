#!/usr/bin/env node
import { copyFileSync, existsSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');

const SOURCE_MAP = join(ROOT_DIR, 'world/packs/base/maps/grid_town_outdoor.json');
const SERVER_MAP = join(ROOT_DIR, 'packages/server/assets/maps/village.json');
const CLIENT_MAP = join(ROOT_DIR, 'packages/client/public/assets/maps/village.json');

function md5(filePath) {
  const content = readFileSync(filePath);
  return createHash('md5').update(content).digest('hex');
}

if (!existsSync(SOURCE_MAP)) {
  console.error(`ERROR: Source map not found: ${SOURCE_MAP}`);
  process.exit(1);
}

console.log('Syncing maps from world pack...');
copyFileSync(SOURCE_MAP, SERVER_MAP);
copyFileSync(SOURCE_MAP, CLIENT_MAP);

console.log('Maps synced successfully:');
console.log(`  Source: ${SOURCE_MAP}`);
console.log(`  -> Server: ${SERVER_MAP}`);
console.log(`  -> Client: ${CLIENT_MAP}`);
console.log('');
console.log('MD5 checksums:');
console.log(`  ${md5(SOURCE_MAP)}  ${SOURCE_MAP}`);
console.log(`  ${md5(SERVER_MAP)}  ${SERVER_MAP}`);
console.log(`  ${md5(CLIENT_MAP)}  ${CLIENT_MAP}`);
