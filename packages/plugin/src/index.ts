import type { PluginManifest, PluginConfig } from '@openclawworld/shared';

export const PLUGIN_VERSION = '0.1.0';

export function createManifest(): PluginManifest {
  return {
    schemaVersion: '1.0',
    name: 'openclawworld',
    version: PLUGIN_VERSION,
    description: 'OpenClawWorld AIC integration plugin for OpenClaw agents',
    homepage: 'https://github.com/openclawworld/plugin',
    license: 'MIT',
    configSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['baseUrl'],
      properties: {
        baseUrl: {
          type: 'string',
          description: 'Base URL of the OpenClawWorld AIC API',
        },
        apiKey: {
          type: 'string',
          description: 'API key for authentication',
        },
        defaultRoomId: {
          type: 'string',
          description: 'Default room to join',
        },
        defaultAgentId: {
          type: 'string',
          description: 'Default agent identifier',
        },
      },
    },
    tools: [
      {
        name: 'ocw.status',
        required: true,
        description: 'Check plugin status and server reachability',
        sideEffects: 'none',
        defaultEnabled: true,
        inputSchema: {},
        outputSchema: {},
      },
      {
        name: 'ocw.observe',
        required: true,
        description: 'Observe the world around the agent',
        sideEffects: 'none',
        defaultEnabled: true,
        inputSchema: {},
        outputSchema: {},
      },
      {
        name: 'ocw.poll_events',
        required: true,
        description: 'Poll for new events since last cursor',
        sideEffects: 'none',
        defaultEnabled: true,
        inputSchema: {},
        outputSchema: {},
      },
      {
        name: 'ocw.move_to',
        required: false,
        description: 'Move agent to a destination tile',
        sideEffects: 'world',
        defaultEnabled: false,
        inputSchema: {},
        outputSchema: {},
      },
      {
        name: 'ocw.interact',
        required: false,
        description: 'Interact with a world object',
        sideEffects: 'world',
        defaultEnabled: false,
        inputSchema: {},
        outputSchema: {},
      },
      {
        name: 'ocw.chat_send',
        required: false,
        description: 'Send a chat message',
        sideEffects: 'chat',
        defaultEnabled: false,
        inputSchema: {},
        outputSchema: {},
      },
    ],
  };
}

export function initializePlugin(_config: PluginConfig): void {
  console.log('OpenClawWorld Plugin v' + PLUGIN_VERSION + ' - Placeholder');
  console.log('Plugin implementation pending (Phase 4)');
}
