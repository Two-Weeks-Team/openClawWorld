import type { PluginManifest } from '@openclawworld/shared';

export const PLUGIN_VERSION = '0.1.0';

export const manifest: PluginManifest = {
  schemaVersion: '1.0',
  name: 'openclawworld',
  version: PLUGIN_VERSION,
  description:
    'OpenClawWorld AIC integration plugin for OpenClaw agents. Provides tools for observing, navigating, and interacting with the OpenClawWorld virtual world.',
  homepage: 'https://github.com/openclawworld/plugin',
  license: 'MIT',
  configSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['baseUrl'],
    properties: {
      baseUrl: {
        type: 'string',
        description:
          'Base URL of the OpenClawWorld AIC API (e.g., https://api.openclawworld.io/aic/v0.1)',
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
    },
  },
  tools: [
    {
      name: 'ocw.status',
      required: true,
      description:
        'Check plugin configuration status and server reachability. Returns connection health and current configuration.',
      sideEffects: 'none',
      defaultEnabled: true,
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          roomId: {
            type: 'string',
            pattern: '^[a-zA-Z0-9._-]{1,64}$',
            description: 'Optional room ID to check (uses default if not specified)',
          },
          agentId: {
            type: 'string',
            pattern: '^[a-zA-Z0-9._-]{1,64}$',
            description: 'Optional agent ID to check (uses default if not specified)',
          },
        },
      },
      outputSchema: {
        $ref: 'https://openclawworld.local/schemas/aic/v0.1.json#/$defs/Result',
      },
    },
    {
      name: 'ocw.observe',
      required: true,
      description:
        "Observe the world around the agent. Returns the agent's current state, nearby entities (humans, agents, objects), and available affordances for interaction.",
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
      name: 'ocw.poll_events',
      required: true,
      description:
        'Poll for new events since the last cursor. Returns presence changes, proximity events, chat messages, and object state changes.',
      sideEffects: 'none',
      defaultEnabled: true,
      inputSchema: {
        $ref: 'https://openclawworld.local/schemas/aic/v0.1.json#/$defs/PollEventsRequest',
      },
      outputSchema: {
        $ref: 'https://openclawworld.local/schemas/aic/v0.1.json#/$defs/Result',
      },
    },
    {
      name: 'ocw.move_to',
      required: false,
      description:
        'Move the agent to a destination tile. This is an idempotent action - the same txId will return the same result. The server validates the destination and handles collision.',
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
      description:
        "Interact with a world object using one of its afforded actions. Check 'affords' array from observe to see available actions. This is an idempotent action.",
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
      description:
        "Send a chat message to the specified channel. Use 'proximity' for nearby entities or 'global' for room-wide. This is an idempotent action.",
      sideEffects: 'chat',
      defaultEnabled: false,
      inputSchema: {
        $ref: 'https://openclawworld.local/schemas/aic/v0.1.json#/$defs/ChatSendRequest',
      },
      outputSchema: {
        $ref: 'https://openclawworld.local/schemas/aic/v0.1.json#/$defs/Result',
      },
    },
  ],
};

export { OpenClawWorldClient } from './client.js';
export type {
  PluginConfig,
  RetryConfig,
  validateConfig,
  validateConfigSafe,
  PluginConfigSchema,
} from './config.js';

export * from './tools/index.js';

export type {
  AicResult,
  AicErrorObject,
  AicErrorCode,
  StatusRequest,
  StatusResponseData,
  ObserveRequest,
  ObserveResponseData,
  PollEventsRequest,
  PollEventsResponseData,
  MoveToRequest,
  MoveToResponseData,
  InteractRequest,
  InteractResponseData,
  ChatSendRequest,
  ChatSendResponseData,
  ChatChannel,
  ObserveDetail,
  EntityKind,
  Facing,
  EntityBase,
  ObservedEntity,
  Affordance,
  EventEnvelope,
  EventType,
  TileCoord,
  Vec2,
  RoomInfo,
  ChatMessage,
  InteractOutcome,
  MoveToResult,
} from '@openclawworld/shared';
