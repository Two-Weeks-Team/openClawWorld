#!/usr/bin/env tsx
/**
 * Extracts the OpenAPI spec from openapi.ts to a JSON file for tools like orval.
 *
 * Usage: tsx scripts/extract-openapi-json.ts
 * Output: packages/server/src/generated/openapi.json
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const { openApiSpec } = await import(
  resolve(rootDir, 'packages/server/src/openapi.ts')
);

const outputPath = resolve(
  rootDir,
  'packages/server/src/generated/openapi.json'
);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(openApiSpec, null, 2));

console.log(`OpenAPI spec extracted to ${outputPath}`);
