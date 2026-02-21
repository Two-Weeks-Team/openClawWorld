#!/usr/bin/env tsx
/**
 * OpenAPI Spec Validation Script
 *
 * Validates packages/server/src/openapi.ts for:
 * - OpenAPI 3.1.0 structural requirements
 * - $ref resolution (all referenced schemas exist in components.schemas)
 * - Required operation fields (summary, responses)
 * - Path-level validity
 *
 * Usage:
 *   pnpm validate:openapi
 *   tsx scripts/validate-openapi.ts
 */

import { openApiSpec } from '../packages/server/src/openapi.js';

// ─── Types ───────────────────────────────────────────────────────────────────

type AnyObject = Record<string, unknown>;

// ─── State ───────────────────────────────────────────────────────────────────

const errors: string[] = [];
const warnings: string[] = [];

function error(msg: string): void {
  errors.push(`  ❌ ${msg}`);
}

function warn(msg: string): void {
  warnings.push(`  ⚠️  ${msg}`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Recursively collect all $ref values from any nested object */
function collectRefs(obj: unknown, path: string): string[] {
  if (!obj || typeof obj !== 'object') return [];
  if (Array.isArray(obj)) {
    return obj.flatMap((item, i) => collectRefs(item, `${path}[${i}]`));
  }
  const record = obj as AnyObject;
  const refs: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (key === '$ref' && typeof value === 'string') {
      refs.push(value);
    } else {
      refs.push(...collectRefs(value, `${path}.${key}`));
    }
  }
  return refs;
}

/** Extract schema name from a local $ref like '#/components/schemas/Foo' */
function extractSchemaName(ref: string): string | null {
  const match = ref.match(/^#\/components\/schemas\/([\w.-]+)$/);
  return match ? match[1] : null;
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];

// ─── Validation ───────────────────────────────────────────────────────────────

const spec = openApiSpec as AnyObject;

// 1. Top-level required fields
console.log('Checking top-level structure...');

if (typeof spec.openapi !== 'string') {
  error('Missing required field: openapi');
} else if (spec.openapi !== '3.1.0') {
  warn(`openapi version is "${spec.openapi}", expected "3.1.0"`);
} else {
  console.log(`  ✅ openapi: ${spec.openapi}`);
}

if (!spec.info || typeof spec.info !== 'object') {
  error('Missing required field: info');
} else {
  const info = spec.info as AnyObject;
  if (!info.title) error('info.title is required');
  if (!info.version) error('info.version is required');
  if (!info.title && !info.version) {
    /* already reported */
  } else {
    console.log(`  ✅ info: title="${info.title}", version="${info.version}"`);
  }
}

if (!spec.paths || typeof spec.paths !== 'object') {
  error('Missing required field: paths');
} else {
  console.log(`  ✅ paths: ${Object.keys(spec.paths as AnyObject).length} path(s) defined`);
}

if (!spec.components || typeof spec.components !== 'object') {
  error('Missing required field: components');
}

// 2. Components.schemas validation
console.log('\nChecking components.schemas...');

const components = (spec.components ?? {}) as AnyObject;
const schemas = (components.schemas ?? {}) as AnyObject;
const definedSchemas = new Set(Object.keys(schemas));

if (definedSchemas.size === 0) {
  error('components.schemas is empty — no schemas defined');
} else {
  console.log(`  ✅ ${definedSchemas.size} schema(s) defined`);
}

// 3. $ref resolution — collect all refs from paths and components
console.log('\nChecking $ref resolution...');

const allRefs = collectRefs(spec.paths, 'paths');
// Also check refs inside component schemas themselves (for schema composition)
allRefs.push(...collectRefs(spec.components, 'components'));

const localRefs = allRefs.filter(ref => ref.startsWith('#/components/schemas/'));
const externalRefs = allRefs.filter(ref => !ref.startsWith('#'));

if (externalRefs.length > 0) {
  warn(`${externalRefs.length} external $ref(s) found (not validated): ${externalRefs.join(', ')}`);
}

const unresolvedRefs = new Set<string>();
for (const ref of localRefs) {
  const schemaName = extractSchemaName(ref);
  if (schemaName && !definedSchemas.has(schemaName)) {
    unresolvedRefs.add(schemaName);
  }
}

if (unresolvedRefs.size > 0) {
  for (const name of [...unresolvedRefs].sort()) {
    error(`$ref '#/components/schemas/${name}' is not defined in components.schemas`);
  }
} else {
  console.log(`  ✅ All ${localRefs.length} local $ref(s) resolve correctly`);
}

// 4. Path operations validation
console.log('\nChecking path operations...');

let totalOps = 0;
let missingOps = 0;

if (spec.paths && typeof spec.paths === 'object') {
  for (const [pathKey, pathItem] of Object.entries(spec.paths as AnyObject)) {
    if (!pathItem || typeof pathItem !== 'object') {
      error(`Path "${pathKey}" has invalid definition`);
      continue;
    }

    const pathObj = pathItem as AnyObject;
    const operations = HTTP_METHODS.filter(m => m in pathObj);

    if (operations.length === 0) {
      error(`Path "${pathKey}" has no HTTP method operations`);
      missingOps++;
      continue;
    }

    for (const method of operations) {
      totalOps++;
      const op = pathObj[method] as AnyObject;

      if (!op.summary) {
        warn(`${method.toUpperCase()} ${pathKey}: missing "summary"`);
      }

      if (!op.responses || typeof op.responses !== 'object') {
        error(`${method.toUpperCase()} ${pathKey}: missing "responses"`);
      } else {
        const responses = op.responses as AnyObject;
        if (Object.keys(responses).length === 0) {
          error(`${method.toUpperCase()} ${pathKey}: "responses" is empty`);
        }
      }
    }
  }

  if (missingOps === 0) {
    console.log(
      `  ✅ ${totalOps} operation(s) across ${Object.keys(spec.paths as AnyObject).length} paths`
    );
  }
}

// 5. Security schemes referenced in operations
console.log('\nChecking security schemes...');

const securitySchemes = (components.securitySchemes ?? {}) as AnyObject;
const definedSecuritySchemes = new Set(Object.keys(securitySchemes));

const referencedSecuritySchemes = new Set<string>();
function collectSecurityRefs(obj: unknown): void {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach(collectSecurityRefs);
    return;
  }
  const record = obj as AnyObject;
  if ('security' in record && Array.isArray(record.security)) {
    for (const secObj of record.security as AnyObject[]) {
      Object.keys(secObj).forEach(k => referencedSecuritySchemes.add(k));
    }
  }
  Object.values(record).forEach(collectSecurityRefs);
}
collectSecurityRefs(spec);

const unresolvedSecurity = [...referencedSecuritySchemes].filter(
  s => !definedSecuritySchemes.has(s)
);
if (unresolvedSecurity.length > 0) {
  for (const name of unresolvedSecurity) {
    error(
      `Security scheme "${name}" referenced in operations but not defined in components.securitySchemes`
    );
  }
} else if (referencedSecuritySchemes.size > 0) {
  console.log(
    `  ✅ All ${referencedSecuritySchemes.size} security scheme reference(s) resolve correctly`
  );
} else {
  console.log('  ✅ No security scheme references to validate');
}

// ─── Results ─────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(60));

if (warnings.length > 0) {
  console.log(`\n⚠️  Warnings (${warnings.length}):`);
  warnings.forEach(w => console.log(w));
}

if (errors.length > 0) {
  console.error(`\n❌ Validation FAILED — ${errors.length} error(s) found:`);
  errors.forEach(e => console.error(e));
  console.error('\nFix the above errors in packages/server/src/openapi.ts');
  process.exit(1);
}

console.log(`\n✅ OpenAPI spec validation PASSED`);
console.log(
  `   Schemas: ${definedSchemas.size} | $refs: ${localRefs.length} | Operations: ${totalOps}`
);
if (warnings.length > 0) {
  console.log(`   Warnings: ${warnings.length} (non-blocking)`);
}
