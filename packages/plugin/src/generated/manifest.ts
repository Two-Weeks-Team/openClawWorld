/**
 * Generated Plugin Manifest
 * AUTO-GENERATED from OpenAPI spec - DO NOT EDIT
 */

import type { PluginManifest } from '@openclawworld/shared';
import { PLUGIN_VERSION } from '../index.js';

export const generatedManifest: PluginManifest = {
  schemaVersion: '1.0',
  name: 'openclawworld',
  version: PLUGIN_VERSION,
  description: 'OpenClawWorld AIC integration plugin for OpenClaw agents. Provides tools for observing, navigating, and interacting with the OpenClawWorld virtual world.',
  homepage: 'https://github.com/openclawworld/plugin',
  license: 'MIT',
  configSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['baseUrl'],
    properties: {
      baseUrl: {
        type: 'string',
        description: 'Base URL of the OpenClawWorld AIC API (e.g., https://api.openclawworld.io/aic/v0.1)',
      },
      apiKey: {
        type: 'string',
        description: 'API key for authentication with the OpenClawWorld server',
      },
      defaultRoomId: {
        type: 'string',
        pattern: '^[a-zA-Z0-9._-]{1,64}$',
        description: 'Default room ID to join when not specified in tool calls',
      },
      defaultAgentId: {
        type: 'string',
        pattern: '^[a-zA-Z0-9._-]{1,64}$',
        description: 'Default agent identifier for this plugin instance',
      },
      retryMaxAttempts: {
        type: 'integer',
        minimum: 0,
        maximum: 10,
        default: 3,
        description: 'Maximum retry attempts for retryable errors',
      },
      retryBaseDelayMs: {
        type: 'integer',
        minimum: 100,
        maximum: 5000,
        default: 500,
        description: 'Base delay in milliseconds for exponential backoff retries',
      },
      enabledTools: {
        type: 'array',
        items: { type: 'string' },
        description: 'Whitelist of enabled optional tools. Required tools are always enabled regardless of this setting.',
      },
      deniedTools: {
        type: 'array',
        items: { type: 'string' },
        description: 'Explicit denylist of tools (takes precedence over enabledTools). Required tools cannot be denied.',
      },
    },
  },
  tools: [
    {
      name: 'ocw.observe',
      required: true,
      description: 'Observe the world around the agent',
      sideEffects: 'none',
      defaultEnabled: true,
      inputSchema: {
        $ref: 'https://openclawworld.local/schemas/aic/v0.1.json#/$defs/ObserveRequest',
      },
      outputSchema: {
        $ref: 'https://openclawworld.local/schemas/aic/v0.1.json#/$defs/Result',
      },
    },
    {
      name: 'ocw.move_to',
      required: false,
      description: 'Move agent to a destination tile',
      sideEffects: 'world',
      defaultEnabled: false,
      inputSchema: {
        $ref: 'https://openclawworld.local/schemas/aic/v0.1.json#/$defs/MoveToRequest',
      },
      outputSchema: {
        $ref: 'https://openclawworld.local/schemas/aic/v0.1.json#/$defs/Result',
      },
    },
    {
      name: 'ocw.interact',
      required: false,
      description: 'Interact with a world object',
      sideEffects: 'world',
      defaultEnabled: false,
      inputSchema: {
        $ref: 'https://openclawworld.local/schemas/aic/v0.1.json#/$defs/InteractRequest',
      },
      outputSchema: {
        $ref: 'https://openclawworld.local/schemas/aic/v0.1.json#/$defs/Result',
      },
    },
    {
      name: 'ocw.chat_send',
      required: false,
      description: 'Send a chat message',
      sideEffects: 'chat',
      defaultEnabled: false,
      inputSchema: {
        $ref: 'https://openclawworld.local/schemas/aic/v0.1.json#/$defs/ChatSendRequest',
      },
      outputSchema: {
        $ref: 'https://openclawworld.local/schemas/aic/v0.1.json#/$defs/Result',
      },
    },
    {
      name: 'ocw.chat_observe',
      required: false,
      description: 'Get recent chat messages',
      sideEffects: 'chat',
      defaultEnabled: false,
      inputSchema: {
        $ref: 'https://openclawworld.local/schemas/aic/v0.1.json#/$defs/ChatObserveRequest',
      },
      outputSchema: {
        $ref: 'https://openclawworld.local/schemas/aic/v0.1.json#/$defs/Result',
      },
    },
    {
      name: 'ocw.poll_events',
      required: true,
      description: 'Poll for world events',
      sideEffects: 'none',
      defaultEnabled: true,
      inputSchema: {
        $ref: 'https://openclawworld.local/schemas/aic/v0.1.json#/$defs/PollEventsRequest',
      },
      outputSchema: {
        $ref: 'https://openclawworld.local/schemas/aic/v0.1.json#/$defs/Result',
      },
    },
  ],
};
