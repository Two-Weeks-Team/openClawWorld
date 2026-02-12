#!/usr/bin/env tsx
import { openApiSpec } from '../../server/src/openapi.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_DIR = path.resolve(__dirname, '../src/generated');

const CLIENT_METHODS: Record<
  string,
  {
    clientMethod: string;
    requestType: string;
    responseType: string;
    fields: string[];
  }
> = {
  observe: {
    clientMethod: 'observe',
    requestType: 'ObserveRequest',
    responseType: 'ObserveResponseData',
    fields: ['agentId', 'roomId', 'radius', 'detail', 'includeSelf'],
  },
  pollEvents: {
    clientMethod: 'pollEvents',
    requestType: 'PollEventsRequest',
    responseType: 'PollEventsResponseData',
    fields: ['agentId', 'roomId', 'sinceCursor', 'limit', 'waitMs'],
  },
  moveTo: {
    clientMethod: 'moveTo',
    requestType: 'MoveToRequest',
    responseType: 'MoveToResponseData',
    fields: ['agentId', 'roomId', 'txId', 'dest', 'mode'],
  },
  interact: {
    clientMethod: 'interact',
    requestType: 'InteractRequest',
    responseType: 'InteractResponseData',
    fields: ['agentId', 'roomId', 'txId', 'targetId', 'action', 'params'],
  },
  chatSend: {
    clientMethod: 'chatSend',
    requestType: 'ChatSendRequest',
    responseType: 'ChatSendResponseData',
    fields: ['agentId', 'roomId', 'txId', 'channel', 'message'],
  },
  chatObserve: {
    clientMethod: 'chatObserve',
    requestType: 'ChatObserveRequest',
    responseType: 'ChatObserveResponseData',
    fields: ['agentId', 'roomId', 'windowSec', 'channel'],
  },
};

interface ToolMapping {
  operationId: string;
  toolName: string;
  path: string;
  tag: string;
  summary: string;
  description: string;
  clientMethod: string;
  requestType: string;
  responseType: string;
  fields: string[];
  requiresAuth: boolean;
}

function pathToOperationId(apiPath: string): string {
  return apiPath.replace(/^\//, '').replace(/\/(.)/g, (_, char) => char.toUpperCase());
}

function operationIdToToolName(operationId: string): string {
  const snakeCase = operationId.replace(/([A-Z])/g, '_$1').toLowerCase();
  return `ocw.${snakeCase}`;
}

function isRequiredTool(tag: string): boolean {
  const requiredTags = ['Auth', 'Observation', 'Events'];
  return requiredTags.includes(tag);
}

function getSideEffects(tag: string): 'none' | 'world' | 'chat' {
  if (tag === 'Chat') return 'chat';
  if (tag === 'Actions' || tag === 'Skills') return 'world';
  return 'none';
}

function getDefaultEnabled(tag: string): boolean {
  return isRequiredTool(tag);
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function extractToolsFromOpenApi(): ToolMapping[] {
  const tools: ToolMapping[] = [];

  const paths = (openApiSpec as unknown as { paths: Record<string, unknown> }).paths;

  for (const [apiPath, methods] of Object.entries(paths)) {
    const methodMap = methods as Record<
      string,
      {
        tags?: readonly string[];
        summary?: string;
        description?: string;
        security?: readonly unknown[];
      }
    >;

    for (const [method, operation] of Object.entries(methodMap)) {
      if (method !== 'post') continue;

      const operationId = pathToOperationId(apiPath);

      // Only generate tools for operations that have client methods
      const clientMapping = CLIENT_METHODS[operationId];
      if (!clientMapping) {
        console.log(`   ⚠ Skipping ${operationId} - no client method available`);
        continue;
      }

      const tag = operation.tags?.[0] || 'Unknown';

      tools.push({
        operationId,
        toolName: operationIdToToolName(operationId),
        path: apiPath,
        tag,
        summary: operation.summary || `${operationId} operation`,
        description: operation.description || operation.summary || `${operationId} operation`,
        clientMethod: clientMapping.clientMethod,
        requestType: clientMapping.requestType,
        responseType: clientMapping.responseType,
        fields: clientMapping.fields,
        requiresAuth: !operation.security || operation.security.length > 0,
      });
    }
  }

  return tools;
}

function generateToolsFile(tools: ToolMapping[]): string {
  const lines: string[] = [];

  lines.push('/**');
  lines.push(' * Generated Tool Implementations');
  lines.push(' * AUTO-GENERATED from OpenAPI spec - DO NOT EDIT');
  lines.push(' */');
  lines.push('');

  // Collect imports
  const requestTypes = new Set<string>();
  const responseTypes = new Set<string>();

  for (const tool of tools) {
    requestTypes.add(tool.requestType);
    responseTypes.add(tool.responseType);
  }

  const allTypes = Array.from(new Set([...requestTypes, ...responseTypes]));
  lines.push(`import type { AicResult, ${allTypes.join(', ')} } from '@openclawworld/shared';`);

  const allSchemaTypes = allTypes.map(t => `${t}Schema`);
  lines.push(`import {`);
  lines.push(`  ${allSchemaTypes.join(',\n  ')},`);
  lines.push(`  createResultSchema,`);
  lines.push(`} from '@openclawworld/shared';`);

  lines.push(`import type { OpenClawWorldClient } from '../client.js';`);
  lines.push(`import type { PluginConfig } from '../config.js';`);
  lines.push(`import { isToolEnabled, createForbiddenError } from '../config.js';`);
  lines.push('');

  for (const tool of tools) {
    const functionName = `execute${capitalize(tool.operationId)}Tool`;
    const inputTypeName = `${capitalize(tool.operationId)}ToolInput`;
    const outputTypeName = `${capitalize(tool.operationId)}ToolOutput`;
    const inputSchemaName = `${capitalize(tool.operationId)}ToolInputSchema`;
    const outputSchemaName = `${capitalize(tool.operationId)}ToolOutputSchema`;
    const optionsName = `${capitalize(tool.operationId)}ToolOptions`;
    const toolNameConst = `${tool.operationId.toUpperCase()}_TOOL_NAME`;

    lines.push(`export type ${inputTypeName} = ${tool.requestType};`);
    lines.push(`export type ${outputTypeName} = AicResult<${tool.responseType}>;`);
    lines.push(`export const ${inputSchemaName} = ${tool.requestType}Schema;`);
    lines.push(
      `export const ${outputSchemaName} = createResultSchema(${tool.responseType}Schema);`
    );

    lines.push(`export interface ${optionsName} {`);
    lines.push(`  defaultRoomId?: string;`);
    lines.push(`  defaultAgentId?: string;`);
    if (!isRequiredTool(tool.tag)) {
      lines.push(`  config: PluginConfig;`);
    }
    lines.push(`}`);
    lines.push('');

    if (!isRequiredTool(tool.tag)) {
      lines.push(`const ${toolNameConst} = '${tool.toolName}';`);
      lines.push('');
    }

    lines.push(`export async function ${functionName}(`);
    lines.push(`  client: OpenClawWorldClient,`);
    lines.push(`  input: unknown,`);
    lines.push(`  options: ${optionsName},`);
    lines.push(`): Promise<${outputTypeName}> {`);

    if (!isRequiredTool(tool.tag)) {
      lines.push(`  if (!isToolEnabled(${toolNameConst}, options.config)) {`);
      lines.push(`    return createForbiddenError(${toolNameConst});`);
      lines.push(`  }`);
      lines.push('');
    }

    lines.push(`  const parseResult = ${inputSchemaName}.safeParse(input);`);
    lines.push(`  if (!parseResult.success) {`);
    lines.push(`    return {`);
    lines.push(`      status: 'error',`);
    lines.push(`      error: {`);
    lines.push(`        code: 'bad_request',`);
    lines.push(`        message: \`Invalid input: \${parseResult.error.message}\`,`);
    lines.push(`        retryable: false,`);
    lines.push(`      },`);
    lines.push(`    };`);
    lines.push(`  }`);
    lines.push('');
    lines.push(`  const validatedInput = parseResult.data;`);
    lines.push(`  const request: ${tool.requestType} = {`);

    for (const field of tool.fields) {
      if (field === 'agentId') {
        lines.push(`    agentId: validatedInput.agentId ?? options.defaultAgentId ?? '',`);
      } else if (field === 'roomId') {
        lines.push(`    roomId: validatedInput.roomId ?? options.defaultRoomId ?? '',`);
      } else {
        lines.push(`    ${field}: validatedInput.${field},`);
      }
    }

    lines.push(`  };`);
    lines.push('');

    lines.push(`  if (!request.agentId) {`);
    lines.push(`    return {`);
    lines.push(`      status: 'error',`);
    lines.push(`      error: {`);
    lines.push(`        code: 'bad_request',`);
    lines.push(`        message: 'agentId is required and no default is configured',`);
    lines.push(`        retryable: false,`);
    lines.push(`      },`);
    lines.push(`    };`);
    lines.push(`  }`);
    lines.push('');
    lines.push(`  if (!request.roomId) {`);
    lines.push(`    return {`);
    lines.push(`      status: 'error',`);
    lines.push(`      error: {`);
    lines.push(`        code: 'bad_request',`);
    lines.push(`        message: 'roomId is required and no default is configured',`);
    lines.push(`        retryable: false,`);
    lines.push(`      },`);
    lines.push(`    };`);
    lines.push(`  }`);
    lines.push('');

    lines.push(`  return client.${tool.clientMethod}(request);`);
    lines.push(`}`);
    lines.push('');
  }

  return lines.join('\n');
}

function generateManifestFile(tools: ToolMapping[]): string {
  const lines: string[] = [];

  lines.push('/**');
  lines.push(' * Generated Plugin Manifest');
  lines.push(' * AUTO-GENERATED from OpenAPI spec - DO NOT EDIT');
  lines.push(' */');
  lines.push('');
  lines.push(`import type { PluginManifest } from '@openclawworld/shared';`);
  lines.push(`import { PLUGIN_VERSION } from '../index.js';`);
  lines.push('');

  lines.push('export const generatedManifest: PluginManifest = {');
  lines.push(`  schemaVersion: '1.0',`);
  lines.push(`  name: 'openclawworld',`);
  lines.push(`  version: PLUGIN_VERSION,`);
  lines.push(
    `  description: 'OpenClawWorld AIC integration plugin for OpenClaw agents. Provides tools for observing, navigating, and interacting with the OpenClawWorld virtual world.',`
  );
  lines.push(`  homepage: 'https://github.com/openclawworld/plugin',`);
  lines.push(`  license: 'MIT',`);
  lines.push(`  configSchema: {`);
  lines.push(`    type: 'object',`);
  lines.push(`    additionalProperties: false,`);
  lines.push(`    required: ['baseUrl'],`);
  lines.push(`    properties: {`);
  lines.push(`      baseUrl: {`);
  lines.push(`        type: 'string',`);
  lines.push(
    `        description: 'Base URL of the OpenClawWorld AIC API (e.g., https://api.openclawworld.io/aic/v0.1)',`
  );
  lines.push(`      },`);
  lines.push(`      apiKey: {`);
  lines.push(`        type: 'string',`);
  lines.push(`        description: 'API key for authentication with the OpenClawWorld server',`);
  lines.push(`      },`);
  lines.push(`      defaultRoomId: {`);
  lines.push(`        type: 'string',`);
  lines.push(`        pattern: '^[a-zA-Z0-9._-]{1,64}$',`);
  lines.push(`        description: 'Default room ID to join when not specified in tool calls',`);
  lines.push(`      },`);
  lines.push(`      defaultAgentId: {`);
  lines.push(`        type: 'string',`);
  lines.push(`        pattern: '^[a-zA-Z0-9._-]{1,64}$',`);
  lines.push(`        description: 'Default agent identifier for this plugin instance',`);
  lines.push(`      },`);
  lines.push(`      retryMaxAttempts: {`);
  lines.push(`        type: 'integer',`);
  lines.push(`        minimum: 0,`);
  lines.push(`        maximum: 10,`);
  lines.push(`        default: 3,`);
  lines.push(`        description: 'Maximum retry attempts for retryable errors',`);
  lines.push(`      },`);
  lines.push(`      retryBaseDelayMs: {`);
  lines.push(`        type: 'integer',`);
  lines.push(`        minimum: 100,`);
  lines.push(`        maximum: 5000,`);
  lines.push(`        default: 500,`);
  lines.push(`        description: 'Base delay in milliseconds for exponential backoff retries',`);
  lines.push(`      },`);
  lines.push(`      enabledTools: {`);
  lines.push(`        type: 'array',`);
  lines.push(`        items: { type: 'string' },`);
  lines.push(
    `        description: 'Whitelist of enabled optional tools. Required tools are always enabled regardless of this setting.',`
  );
  lines.push(`      },`);
  lines.push(`      deniedTools: {`);
  lines.push(`        type: 'array',`);
  lines.push(`        items: { type: 'string' },`);
  lines.push(
    `        description: 'Explicit denylist of tools (takes precedence over enabledTools). Required tools cannot be denied.',`
  );
  lines.push(`      },`);
  lines.push(`    },`);
  lines.push(`  },`);
  lines.push(`  tools: [`);

  for (const tool of tools) {
    const required = isRequiredTool(tool.tag);
    const sideEffects = getSideEffects(tool.tag);
    const defaultEnabled = getDefaultEnabled(tool.tag);

    const schemaRef = `https://openclawworld.local/schemas/aic/v0.1.json#/$defs/${tool.requestType}`;

    lines.push(`    {`);
    lines.push(`      name: '${tool.toolName}',`);
    lines.push(`      required: ${required},`);
    lines.push(`      description: '${(tool.summary || tool.description).replace(/'/g, "\\'")}',`);
    lines.push(`      sideEffects: '${sideEffects}',`);
    lines.push(`      defaultEnabled: ${defaultEnabled},`);
    lines.push(`      inputSchema: {`);
    lines.push(`        $ref: '${schemaRef}',`);
    lines.push(`      },`);
    lines.push(`      outputSchema: {`);
    lines.push(`        $ref: 'https://openclawworld.local/schemas/aic/v0.1.json#/$defs/Result',`);
    lines.push(`      },`);
    lines.push(`    },`);
  }

  lines.push(`  ],`);
  lines.push(`};`);
  lines.push('');

  return lines.join('\n');
}

function generateTypesFile(tools: ToolMapping[]): string {
  const lines: string[] = [];

  lines.push('/**');
  lines.push(' * Generated Types');
  lines.push(' * AUTO-GENERATED from OpenAPI spec - DO NOT EDIT');
  lines.push(' */');
  lines.push('');

  if (tools.length === 0) {
    lines.push(`export type GeneratedToolName = never;`);
  } else if (tools.length === 1) {
    lines.push(`export type GeneratedToolName = '${tools[0].toolName}';`);
  } else {
    lines.push(`export type GeneratedToolName =`);
    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      if (i === 0) {
        lines.push(`  | '${tool.toolName}'`);
      } else if (i === tools.length - 1) {
        lines.push(`  | '${tool.toolName}';`);
      } else {
        lines.push(`  | '${tool.toolName}'`);
      }
    }
  }
  lines.push('');

  lines.push(`export interface GeneratedToolInfo {`);
  lines.push(`  name: GeneratedToolName;`);
  lines.push(`  operationId: string;`);
  lines.push(`  path: string;`);
  lines.push(`  tag: string;`);
  lines.push(`  required: boolean;`);
  lines.push(`  sideEffects: 'none' | 'world' | 'chat';`);
  lines.push(`}`);
  lines.push('');

  lines.push(`export const GENERATED_TOOLS: GeneratedToolInfo[] = [`);
  for (const tool of tools) {
    lines.push(`  {`);
    lines.push(`    name: '${tool.toolName}',`);
    lines.push(`    operationId: '${tool.operationId}',`);
    lines.push(`    path: '${tool.path}',`);
    lines.push(`    tag: '${tool.tag}',`);
    lines.push(`    required: ${isRequiredTool(tool.tag)},`);
    lines.push(`    sideEffects: '${getSideEffects(tool.tag)}',`);
    lines.push(`  },`);
  }
  lines.push(`];`);
  lines.push('');

  return lines.join('\n');
}

function generateIndexFile(tools: ToolMapping[]): string {
  const lines: string[] = [];

  lines.push('/**');
  lines.push(' * Generated Tools Index');
  lines.push(' * AUTO-GENERATED from OpenAPI spec - DO NOT EDIT');
  lines.push(' */');
  lines.push('');

  for (const tool of tools) {
    const capitalizedName = capitalize(tool.operationId);
    lines.push(`export {`);
    lines.push(`  execute${capitalizedName}Tool,`);
    lines.push(`  ${capitalizedName}ToolInputSchema,`);
    lines.push(`  ${capitalizedName}ToolOutputSchema,`);
    lines.push(`  type ${capitalizedName}ToolInput,`);
    lines.push(`  type ${capitalizedName}ToolOutput,`);
    lines.push(`  type ${capitalizedName}ToolOptions,`);
    lines.push(`} from './tools.js';`);
    lines.push('');
  }

  lines.push(`export { generatedManifest } from './manifest.js';`);
  lines.push(`export type { GeneratedToolName, GeneratedToolInfo } from './types.js';`);
  lines.push(`export { GENERATED_TOOLS } from './types.js';`);
  lines.push('');

  return lines.join('\n');
}

async function main() {
  console.log('🔧 OpenAPI → Plugin Tools Generator');
  console.log('=====================================\n');

  if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
    console.log(`📁 Created directory: ${GENERATED_DIR}`);
  }

  console.log('📋 Extracting tools from OpenAPI spec...');
  const tools = extractToolsFromOpenApi();
  console.log(`\n   Found ${tools.length} operations with client methods:\n`);

  for (const tool of tools) {
    const required = isRequiredTool(tool.tag) ? 'required' : 'optional';
    console.log(`   • ${tool.toolName} (${tool.tag}, ${required})`);
  }
  console.log('');

  console.log('📝 Generating files...\n');

  const toolsContent = generateToolsFile(tools);
  fs.writeFileSync(path.join(GENERATED_DIR, 'tools.ts'), toolsContent);
  console.log(`   ✓ tools.ts (${toolsContent.split('\n').length} lines)`);

  const manifestContent = generateManifestFile(tools);
  fs.writeFileSync(path.join(GENERATED_DIR, 'manifest.ts'), manifestContent);
  console.log(`   ✓ manifest.ts (${manifestContent.split('\n').length} lines)`);

  const typesContent = generateTypesFile(tools);
  fs.writeFileSync(path.join(GENERATED_DIR, 'types.ts'), typesContent);
  console.log(`   ✓ types.ts (${typesContent.split('\n').length} lines)`);

  const indexContent = generateIndexFile(tools);
  fs.writeFileSync(path.join(GENERATED_DIR, 'index.ts'), indexContent);
  console.log(`   ✓ index.ts (${indexContent.split('\n').length} lines)`);

  console.log('\n✅ Generation complete!');
  console.log(`\n📂 Output directory: ${GENERATED_DIR}`);
  console.log('\nNext steps:');
  console.log('  1. Run typecheck: pnpm typecheck');
  console.log('  2. Build project: pnpm build');
}

main().catch(error => {
  console.error('❌ Generation failed:', error);
  process.exit(1);
});
