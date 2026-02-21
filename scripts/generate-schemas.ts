#!/usr/bin/env tsx
/**
 * Generates client-side Colyseus schema classes from server schemas.
 * Uses @colyseus/schema's built-in schema-codegen CLI.
 *
 * Usage: pnpm generate:schemas
 */
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const input = resolve(rootDir, 'packages/server/src/schemas/RoomState.ts');
const output = resolve(rootDir, 'packages/client/src/generated/schemas/');

console.log('Generating Colyseus client schemas...');
console.log(`  Input: ${input}`);
console.log(`  Output: ${output}`);

execSync(
  `npx --package @colyseus/schema@^4.0.12 schema-codegen "${input}" --output "${output}" --ts`,
  {
    stdio: 'inherit',
    cwd: rootDir,
  }
);

console.log('Done! Client schemas generated successfully.');
