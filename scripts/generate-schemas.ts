#!/usr/bin/env tsx
/**
 * Generates client-side Colyseus schema classes from server schemas.
 * Uses @colyseus/schema's built-in schema-codegen CLI.
 *
 * Usage: pnpm generate:schemas
 */
import { execSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const input = resolve(rootDir, 'packages/server/src/schemas/RoomState.ts');
const output = resolve(rootDir, 'packages/client/src/generated/schemas/');

console.log('Generating Colyseus client schemas...');
console.log(`  Input: ${input}`);
console.log(`  Output: ${output}`);

// Resolve schema-codegen from the installed @colyseus/schema package
// to avoid network-dependent npx download on CI runners.
const req = createRequire(resolve(rootDir, 'packages/server/package.json'));
const schemaMain = req.resolve('@colyseus/schema');
let schemaRoot = dirname(schemaMain);
while (!existsSync(join(schemaRoot, 'package.json'))) {
  const parent = dirname(schemaRoot);
  if (parent === schemaRoot) break;
  schemaRoot = parent;
}
const schemaBin = join(schemaRoot, 'bin', 'schema-codegen');

execSync(`node "${schemaBin}" "${input}" --output "${output}" --ts`, {
  stdio: 'inherit',
  cwd: rootDir,
});

console.log('Done! Client schemas generated successfully.');
