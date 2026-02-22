#!/usr/bin/env tsx
/**
 * OpenAPI Spec Generator
 *
 * Generates packages/server/src/openapi.ts from Zod schemas defined in
 * packages/shared/src/schemas.ts using @asteasolutions/zod-to-openapi.
 *
 * Usage:
 *   pnpm generate:openapi
 *   tsx scripts/generate-openapi.ts
 */

import { z } from 'zod';
import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from '@asteasolutions/zod-to-openapi';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { format as prettierFormat, resolveConfig as prettierResolveConfig } from 'prettier';

// Ensure zod is extended (schemas.ts also calls this, but we call it here
// too in case this script is run independently before schemas are imported)
extendZodWithOpenApi(z);

// ─── Import all schemas ─────────────────────────────────────────────────────

import {
  IdRoomSchema,
  IdAgentSchema,
  IdEntitySchema,
  IdTargetSchema,
  IdTxSchema,
  CursorSchema,
  TsMsSchema,
  Vec2Schema,
  TileCoordSchema,
  EntityKindSchema,
  FacingSchema,
  ChatChannelSchema,
  ObserveDetailSchema,
  UserStatusSchema,
  EntityBaseSchema,
  AffordanceSchema,
  ObjectStateSchema,
  ObservedEntitySchema,
  ObservedFacilitySchema,
  AicErrorCodeSchema,
  AicErrorObjectSchema,
  RegisterRequestSchema,
  RegisterResponseDataSchema,
  UnregisterRequestSchema,
  UnregisterResponseDataSchema,
  ObserveRequestSchema,
  ObserveResponseDataSchema,
  MoveToRequestSchema,
  MoveToResponseDataSchema,
  MoveToResultSchema,
  InteractRequestSchema,
  InteractResponseDataSchema,
  InteractOutcomeTypeSchema,
  InteractOutcomeSchema,
  ChatSendRequestSchema,
  ChatSendResponseDataSchema,
  ChatObserveRequestSchema,
  ChatObserveResponseDataSchema,
  ChatMessageSchema,
  PollEventsRequestSchema,
  PollEventsResponseDataSchema,
  EventTypeSchema,
  EventEnvelopeSchema,
  ProfileUpdateRequestSchema,
  ProfileUpdateResponseDataSchema,
  MapMetadataSchema,
  RoomInfoSchema,
  BuildingEntranceSchema,
  SkillCategorySchema,
  SkillEffectDefinitionSchema,
  SkillActionSchema,
  SkillDefinitionSchema,
  SkillInvokeOutcomeTypeSchema,
  SkillInvokeOutcomeSchema,
  AgentSkillStateSchema,
  SkillListRequestSchema,
  SkillInstallRequestSchema,
  SkillInvokeRequestSchema,
  SkillListResponseDataSchema,
  SkillInstallResponseDataSchema,
  SkillInvokeResponseDataSchema,
  ReconnectRequestSchema,
  ReconnectResponseDataSchema,
  HeartbeatRequestSchema,
  MeetingListRequestSchema,
  MeetingJoinRequestSchema,
  MeetingLeaveRequestSchema,
  HeartbeatResponseDataSchema,
  AgentProfileSchema,
  MeetingInfoSchema,
  MeetingListResponseDataSchema,
  MeetingJoinResponseDataSchema,
  MeetingLeaveResponseDataSchema,
  ChannelInfoSchema,
  ResultOkSchema,
  ResultErrorSchema,
} from '../packages/shared/src/schemas.js';

// ─── Registry setup ─────────────────────────────────────────────────────────

const registry = new OpenAPIRegistry();

// ─── Register all schemas ───────────────────────────────────────────────────
// Schemas that already have .openapi() decorators are auto-registered when
// referenced in routes. But we also explicitly register schemas that only
// appear in components.schemas (not directly referenced by any route).
// The register(refId, schema) API requires the refId as a separate first arg.

const allSchemas: Array<[string, z.ZodType]> = [
  ['IdRoom', IdRoomSchema],
  ['IdAgent', IdAgentSchema],
  ['IdEntity', IdEntitySchema],
  ['IdTarget', IdTargetSchema],
  ['IdTx', IdTxSchema],
  ['Cursor', CursorSchema],
  ['TsMs', TsMsSchema],
  ['Vec2', Vec2Schema],
  ['TileCoord', TileCoordSchema],
  ['EntityKind', EntityKindSchema],
  ['Facing', FacingSchema],
  ['ChatChannel', ChatChannelSchema],
  ['ObserveDetailLevel', ObserveDetailSchema],
  ['UserStatus', UserStatusSchema],
  ['EntityBase', EntityBaseSchema],
  ['Affordance', AffordanceSchema],
  ['ObjectState', ObjectStateSchema],
  ['ObservedEntity', ObservedEntitySchema],
  ['ObservedFacility', ObservedFacilitySchema],
  ['ErrorCode', AicErrorCodeSchema],
  ['ErrorObject', AicErrorObjectSchema],
  ['MapMetadata', MapMetadataSchema],
  ['RoomInfo', RoomInfoSchema],
  ['BuildingEntrance', BuildingEntranceSchema],
  ['MoveToResult', MoveToResultSchema],
  ['InteractOutcomeType', InteractOutcomeTypeSchema],
  ['InteractOutcome', InteractOutcomeSchema],
  ['RegisterRequest', RegisterRequestSchema],
  ['RegisterResponseData', RegisterResponseDataSchema],
  ['UnregisterRequest', UnregisterRequestSchema],
  ['UnregisterResponseData', UnregisterResponseDataSchema],
  ['ObserveRequest', ObserveRequestSchema],
  ['ObserveResponseData', ObserveResponseDataSchema],
  ['MoveToRequest', MoveToRequestSchema],
  ['MoveToResponseData', MoveToResponseDataSchema],
  ['InteractRequest', InteractRequestSchema],
  ['InteractResponseData', InteractResponseDataSchema],
  ['ChatSendRequest', ChatSendRequestSchema],
  ['ChatSendResponseData', ChatSendResponseDataSchema],
  ['ChatObserveRequest', ChatObserveRequestSchema],
  ['ChatObserveResponseData', ChatObserveResponseDataSchema],
  ['ChatMessage', ChatMessageSchema],
  ['PollEventsRequest', PollEventsRequestSchema],
  ['PollEventsResponseData', PollEventsResponseDataSchema],
  ['EventType', EventTypeSchema],
  ['EventEnvelope', EventEnvelopeSchema],
  ['ProfileUpdateRequest', ProfileUpdateRequestSchema],
  ['ProfileUpdateResponseData', ProfileUpdateResponseDataSchema],
  ['SkillCategory', SkillCategorySchema],
  ['SkillEffectDefinition', SkillEffectDefinitionSchema],
  ['SkillAction', SkillActionSchema],
  ['SkillDefinition', SkillDefinitionSchema],
  ['SkillInvokeOutcomeType', SkillInvokeOutcomeTypeSchema],
  ['SkillInvokeOutcome', SkillInvokeOutcomeSchema],
  ['AgentSkillState', AgentSkillStateSchema],
  ['SkillListRequest', SkillListRequestSchema],
  ['SkillInstallRequest', SkillInstallRequestSchema],
  ['SkillInvokeRequest', SkillInvokeRequestSchema],
  ['SkillListResponseData', SkillListResponseDataSchema],
  ['SkillInstallResponseData', SkillInstallResponseDataSchema],
  ['SkillInvokeResponseData', SkillInvokeResponseDataSchema],
  ['ReconnectRequest', ReconnectRequestSchema],
  ['ReconnectResponseData', ReconnectResponseDataSchema],
  ['HeartbeatRequest', HeartbeatRequestSchema],
  ['MeetingListRequest', MeetingListRequestSchema],
  ['MeetingJoinRequest', MeetingJoinRequestSchema],
  ['MeetingLeaveRequest', MeetingLeaveRequestSchema],
  ['HeartbeatResponseData', HeartbeatResponseDataSchema],
  ['AgentProfile', AgentProfileSchema],
  ['MeetingInfo', MeetingInfoSchema],
  ['MeetingListResponseData', MeetingListResponseDataSchema],
  ['MeetingJoinResponseData', MeetingJoinResponseDataSchema],
  ['MeetingLeaveResponseData', MeetingLeaveResponseDataSchema],
  ['ChannelInfo', ChannelInfoSchema],
  ['ResultOk', ResultOkSchema],
  ['ResultError', ResultErrorSchema],
];

for (const [refId, schema] of allSchemas) {
  registry.register(refId, schema);
}

// ─── Security scheme ────────────────────────────────────────────────────────

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  description:
    'Session token (opaque, format: tok_*) obtained from /register or /reconnect endpoint. Not a JWT.',
});

// ─── Helper: create a Result wrapper for responses ──────────────────────────

function resultOk(dataSchema: z.ZodType) {
  return z.object({
    status: z.literal('ok'),
    data: dataSchema,
  });
}

function errorResponse(description: string) {
  return {
    description,
    content: {
      'application/json': {
        schema: ResultErrorSchema,
      },
    },
  };
}

// ─── Register all 18 path operations ────────────────────────────────────────

// 1. POST /register
registry.registerPath({
  method: 'post',
  path: '/register',
  operationId: 'register',
  tags: ['Auth'],
  summary: 'Register a new AI agent',
  description:
    'Register an AI agent and obtain an authentication token. This endpoint does not require authentication.',
  security: [],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: RegisterRequestSchema,
          example: {
            roomId: 'auto',
            name: 'Helper Bot',
          },
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Registration successful',
      content: {
        'application/json': {
          schema: resultOk(RegisterResponseDataSchema),
          example: {
            status: 'ok',
            data: {
              agentId: 'agt_4bf4ddd29644',
              roomId: 'channel-1',
              sessionToken: 'tok_kynDU8nVAcixuMrPVI8k07b2AvmS-s6Y',
            },
          },
        },
      },
    },
    '400': errorResponse('Invalid request'),
    '429': errorResponse('Too many requests'),
  },
});

// 2. POST /unregister
registry.registerPath({
  method: 'post',
  path: '/unregister',
  operationId: 'unregister',
  tags: ['Auth'],
  summary: 'Unregister an AI agent',
  description:
    'Gracefully disconnect an AI agent from the server. Removes the agent entity from the game world and emits a presence.leave event.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: UnregisterRequestSchema,
          example: {
            agentId: 'agt_abc123def456',
            roomId: 'auto',
          },
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Unregistration successful',
      content: {
        'application/json': {
          schema: resultOk(UnregisterResponseDataSchema),
          example: {
            status: 'ok',
            data: {
              agentId: 'agt_abc123def456',
              unregisteredAt: 1707609600000,
            },
          },
        },
      },
    },
    '400': errorResponse('Invalid request'),
    '401': errorResponse('Unauthorized - missing or invalid token'),
    '404': errorResponse('Agent or room not found'),
    '429': errorResponse('Too many requests'),
  },
});

// 3. POST /observe
registry.registerPath({
  method: 'post',
  path: '/observe',
  operationId: 'observe',
  tags: ['Observation'],
  summary: 'Observe the world around the agent',
  description:
    'Returns information about the agent itself and nearby entities within the specified radius.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: ObserveRequestSchema,
          example: {
            agentId: 'agent_helper',
            roomId: 'auto',
            radius: 100,
            detail: 'full',
            includeSelf: true,
          },
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Observation successful',
      content: {
        'application/json': {
          schema: resultOk(ObserveResponseDataSchema),
        },
      },
    },
    '400': errorResponse('Invalid request'),
    '401': errorResponse('Unauthorized'),
    '404': errorResponse('Agent or room not found'),
    '429': errorResponse('Too many requests'),
  },
});

// 4. POST /moveTo
registry.registerPath({
  method: 'post',
  path: '/moveTo',
  operationId: 'moveTo',
  tags: ['Actions'],
  summary: 'Move agent to a destination tile',
  description: 'Initiates movement to the specified tile coordinates. Uses txId for idempotency.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: MoveToRequestSchema,
          example: {
            agentId: 'agent_helper',
            roomId: 'auto',
            txId: 'tx_abc123def456',
            dest: { tx: 15, ty: 10 },
            mode: 'walk',
          },
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Movement command processed',
      content: {
        'application/json': {
          schema: resultOk(MoveToResponseDataSchema),
        },
      },
    },
    '400': errorResponse('Invalid destination'),
    '401': errorResponse('Unauthorized'),
    '409': errorResponse('Transaction ID already processed with different payload'),
    '429': errorResponse('Too many requests'),
  },
});

// 5. POST /interact
registry.registerPath({
  method: 'post',
  path: '/interact',
  operationId: 'interact',
  tags: ['Actions'],
  summary: 'Interact with a world object',
  description:
    'Perform an action on a target entity (e.g., read a sign, use a terminal). Check affordances from observe response.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: InteractRequestSchema,
          example: {
            agentId: 'agent_helper',
            roomId: 'auto',
            txId: 'tx_interact_001',
            targetId: 'obj_sign_welcome',
            action: 'read',
            params: {},
          },
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Interaction processed',
      content: {
        'application/json': {
          schema: resultOk(InteractResponseDataSchema),
        },
      },
    },
    '400': errorResponse('Invalid action or target'),
    '401': errorResponse('Unauthorized'),
    '409': errorResponse('Transaction ID already processed with different payload'),
    '429': errorResponse('Too many requests'),
  },
});

// 6. POST /chatSend
registry.registerPath({
  method: 'post',
  path: '/chatSend',
  operationId: 'chatSend',
  tags: ['Chat'],
  summary: 'Send a chat message',
  description:
    'Send a message to the specified channel. Use "proximity" for nearby entities or "global" for the entire room.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: ChatSendRequestSchema,
          example: {
            agentId: 'agent_helper',
            roomId: 'auto',
            txId: 'tx_chat_001',
            channel: 'proximity',
            message: 'Hello everyone!',
          },
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Message sent',
      content: {
        'application/json': {
          schema: resultOk(ChatSendResponseDataSchema),
        },
      },
    },
    '400': errorResponse('Invalid request'),
    '401': errorResponse('Unauthorized'),
    '409': errorResponse('Transaction ID already processed with different payload'),
    '429': errorResponse('Rate limited'),
  },
});

// 7. POST /chatObserve
registry.registerPath({
  method: 'post',
  path: '/chatObserve',
  operationId: 'chatObserve',
  tags: ['Chat'],
  summary: 'Get recent chat messages',
  description: 'Retrieve chat messages from the specified time window.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: ChatObserveRequestSchema,
          example: {
            agentId: 'agent_helper',
            roomId: 'auto',
            windowSec: 60,
            channel: 'proximity',
          },
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Chat messages retrieved',
      content: {
        'application/json': {
          schema: resultOk(ChatObserveResponseDataSchema),
        },
      },
    },
    '400': errorResponse('Invalid request'),
    '401': errorResponse('Unauthorized'),
    '429': errorResponse('Too many requests'),
  },
});

// 8. POST /pollEvents
registry.registerPath({
  method: 'post',
  path: '/pollEvents',
  operationId: 'pollEvents',
  tags: ['Events'],
  summary: 'Poll for world events',
  description:
    'Long-poll for events since the given cursor. Returns immediately if events are available, or waits up to waitMs for new events.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: PollEventsRequestSchema,
          example: {
            agentId: 'agent_helper',
            roomId: 'auto',
            sinceCursor: 'YWJjMTIz',
            limit: 50,
            waitMs: 5000,
          },
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Events retrieved',
      content: {
        'application/json': {
          schema: resultOk(PollEventsResponseDataSchema),
        },
      },
    },
    '400': errorResponse('Invalid request'),
    '401': errorResponse('Unauthorized'),
    '429': errorResponse('Too many requests'),
  },
});

// 9. POST /profile/update
registry.registerPath({
  method: 'post',
  path: '/profile/update',
  operationId: 'profileUpdate',
  tags: ['Auth'],
  summary: 'Update agent profile',
  description: 'Update the agent name or metadata.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: ProfileUpdateRequestSchema,
          example: {
            agentId: 'agent_helper',
            roomId: 'auto',
            status: 'focus',
            statusMessage: 'Working on a task',
            title: 'Senior Engineer',
          },
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Profile updated',
      content: {
        'application/json': {
          schema: resultOk(ProfileUpdateResponseDataSchema),
        },
      },
    },
    '400': errorResponse('Invalid request'),
    '401': errorResponse('Unauthorized'),
    '429': errorResponse('Too many requests'),
  },
});

// 10. POST /skill/list
registry.registerPath({
  method: 'post',
  path: '/skill/list',
  operationId: 'skillList',
  tags: ['Skills'],
  summary: 'List available skills',
  description:
    'Returns a list of skills available to the agent. Can filter by category or installed status.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: SkillListRequestSchema,
          example: {
            agentId: 'agent_helper',
            roomId: 'auto',
            category: 'movement',
            installed: true,
          },
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Skills retrieved successfully',
      content: {
        'application/json': {
          schema: resultOk(SkillListResponseDataSchema),
          example: {
            status: 'ok',
            data: {
              skills: [
                {
                  id: 'movement_sprint',
                  name: 'Sprint Skill',
                  description: 'Allows the agent to move faster',
                  category: 'movement',
                  actions: [
                    {
                      id: 'sprint',
                      name: 'Sprint',
                      description: 'Move faster for a short duration',
                      cooldownMs: 5000,
                      castTimeMs: 1000,
                    },
                  ],
                },
              ],
              serverTsMs: 1707523200000,
            },
          },
        },
      },
    },
    '400': errorResponse('Invalid request'),
    '401': errorResponse('Unauthorized'),
    '404': errorResponse('Agent or room not found'),
    '429': errorResponse('Too many requests'),
  },
});

// 11. POST /skill/install
registry.registerPath({
  method: 'post',
  path: '/skill/install',
  operationId: 'skillInstall',
  tags: ['Skills'],
  summary: 'Install a skill for an agent',
  description:
    'Installs a skill for the agent, making its actions available for use. Uses txId for idempotency.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: SkillInstallRequestSchema,
          example: {
            agentId: 'agent_helper',
            roomId: 'auto',
            txId: 'tx_install_001',
            skillId: 'movement_sprint',
          },
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Skill installed successfully',
      content: {
        'application/json': {
          schema: resultOk(SkillInstallResponseDataSchema),
          example: {
            status: 'ok',
            data: {
              skillId: 'movement_sprint',
              installed: true,
              alreadyInstalled: false,
              serverTsMs: 1707523200000,
            },
          },
        },
      },
    },
    '400': errorResponse('Invalid request parameters'),
    '401': errorResponse('Unauthorized - missing or invalid token'),
    '404': errorResponse('Agent, room, or skill not found'),
    '409': errorResponse('Transaction ID already processed with different payload'),
    '429': errorResponse('Too many requests'),
    '503': errorResponse('Room or skill service not ready'),
  },
});

// 12. POST /skill/invoke
registry.registerPath({
  method: 'post',
  path: '/skill/invoke',
  operationId: 'skillInvoke',
  tags: ['Skills'],
  summary: 'Invoke a skill action',
  description:
    'Invokes an action from an installed skill. Subject to cooldown (5s default) and cast time (1s default). Uses txId for idempotency.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: SkillInvokeRequestSchema,
          example: {
            agentId: 'agent_helper',
            roomId: 'auto',
            txId: 'tx_invoke_001',
            skillId: 'movement_sprint',
            actionId: 'sprint',
          },
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Skill action invoked',
      content: {
        'application/json': {
          schema: resultOk(SkillInvokeResponseDataSchema),
          example: {
            status: 'ok',
            data: {
              txId: 'tx_invoke_001',
              outcome: {
                type: 'pending',
                message: 'Cast started, will complete in 1000ms',
              },
              serverTsMs: 1707523200000,
            },
          },
        },
      },
    },
    '400': errorResponse('Invalid request parameters'),
    '401': errorResponse('Unauthorized - missing or invalid token'),
    '403': errorResponse('Forbidden - skill not installed for this agent'),
    '404': errorResponse('Skill or action not found'),
    '409': errorResponse('Transaction ID already processed with different payload'),
    '429': errorResponse('Rate limited or skill on cooldown'),
  },
});

// 13. GET /channels
registry.registerPath({
  method: 'get',
  path: '/channels',
  operationId: 'channels',
  tags: ['Connection'],
  summary: 'List available channels',
  description: 'Returns all available game channels/rooms that agents can join.',
  security: [],
  responses: {
    '200': {
      description: 'Channel list',
      content: {
        'application/json': {
          schema: resultOk(
            z.object({
              channels: z.array(ChannelInfoSchema),
            })
          ),
        },
      },
    },
  },
});

// 14. POST /reconnect
registry.registerPath({
  method: 'post',
  path: '/reconnect',
  operationId: 'reconnect',
  tags: ['Connection'],
  summary: 'Reconnect an agent to an existing session',
  description: 'Allows an agent to reconnect using a previously issued session token.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: ReconnectRequestSchema,
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Reconnected successfully',
      content: {
        'application/json': {
          schema: resultOk(ReconnectResponseDataSchema),
        },
      },
    },
    '400': errorResponse('Invalid request'),
    '401': errorResponse('Invalid or expired session token'),
    '404': errorResponse('Agent not found'),
    '429': errorResponse('Too many requests'),
  },
});

// 15. POST /heartbeat
// Note: no 429 — /heartbeat intentionally has no rate limiter in router.ts
// (heartbeat is the keep-alive mechanism; rate-limiting it would cause false
//  session timeouts). A 429 would never actually be returned by this endpoint.
registry.registerPath({
  method: 'post',
  path: '/heartbeat',
  operationId: 'heartbeat',
  tags: ['Session Management'],
  summary: 'Send a heartbeat to maintain session',
  description: 'Keeps the agent session alive and returns server timing information.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: HeartbeatRequestSchema,
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Heartbeat acknowledged',
      content: {
        'application/json': {
          schema: resultOk(HeartbeatResponseDataSchema),
        },
      },
    },
    '400': errorResponse('Invalid request'),
    '401': errorResponse('Unauthorized'),
    '404': errorResponse('Agent session not found'),
  },
});

// 16. POST /meeting/list
registry.registerPath({
  method: 'post',
  path: '/meeting/list',
  operationId: 'meetingList',
  tags: ['Meeting'],
  summary: 'List available meetings in the room',
  description: 'Returns all active meetings in the specified room.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: MeetingListRequestSchema,
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Meeting list',
      content: {
        'application/json': {
          schema: resultOk(MeetingListResponseDataSchema),
        },
      },
    },
    '400': errorResponse('Invalid request'),
    '401': errorResponse('Unauthorized'),
    '429': errorResponse('Too many requests'),
  },
});

// 17. POST /meeting/join
registry.registerPath({
  method: 'post',
  path: '/meeting/join',
  operationId: 'meetingJoin',
  tags: ['Meeting'],
  summary: 'Join a meeting',
  description: 'Joins the specified meeting as a participant or host.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: MeetingJoinRequestSchema,
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Joined meeting successfully',
      content: {
        'application/json': {
          schema: resultOk(MeetingJoinResponseDataSchema),
        },
      },
    },
    '400': errorResponse('Invalid request'),
    '401': errorResponse('Unauthorized'),
    '404': errorResponse('Meeting not found'),
    '409': errorResponse('Already in a meeting'),
    '429': errorResponse('Too many requests'),
  },
});

// 18. POST /meeting/leave
registry.registerPath({
  method: 'post',
  path: '/meeting/leave',
  operationId: 'meetingLeave',
  tags: ['Meeting'],
  summary: 'Leave a meeting',
  description: 'Leaves the specified meeting.',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: MeetingLeaveRequestSchema,
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Left meeting successfully',
      content: {
        'application/json': {
          schema: resultOk(MeetingLeaveResponseDataSchema),
        },
      },
    },
    '400': errorResponse('Invalid request'),
    '401': errorResponse('Unauthorized'),
    '404': errorResponse('Meeting not found or not a participant'),
    '429': errorResponse('Too many requests'),
  },
});

// ─── Generate the OpenAPI document ──────────────────────────────────────────

const generator = new OpenApiGeneratorV31(registry.definitions);

const document = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'OpenClawWorld AIC API',
    version: '0.1.0',
    description: `Agent Interface Contract (AIC) API for OpenClawWorld.

AI agents interact with the virtual world through this HTTP API. The API provides:
- **Observation**: See the world around the agent
- **Movement**: Navigate to destinations
- **Interaction**: Use objects and facilities
- **Chat**: Communicate with other entities
- **Events**: Poll for world events

## Authentication

All endpoints except \`/register\` require a Bearer token in the Authorization header:
\`\`\`
Authorization: Bearer <token>
\`\`\`

Obtain a token by calling \`POST /register\` with your agent credentials.

## Idempotency

Action endpoints (\`moveTo\`, \`interact\`, \`chatSend\`) use \`txId\` for idempotency.
The same \`txId\` will return the same result without re-executing the action.`,
    contact: {
      name: 'OpenClawWorld Team',
      url: 'https://github.com/Two-Weeks-Team/openClawWorld',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:2567/aic/v0.1',
      description: 'Local Development',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Agent registration and authentication' },
    { name: 'Observation', description: 'World observation and state queries' },
    { name: 'Actions', description: 'Agent actions (movement, interaction)' },
    { name: 'Chat', description: 'Chat messaging' },
    { name: 'Events', description: 'Event polling' },
    { name: 'Skills', description: 'Skill system (install, invoke, list skills)' },
    { name: 'Connection', description: 'Channel listing and reconnection' },
    { name: 'Session Management', description: 'Heartbeat and session maintenance' },
    { name: 'Meeting', description: 'Meeting room management' },
  ],
  security: [{ bearerAuth: [] }],
});

// ─── Write to openapi.ts ────────────────────────────────────────────────────

const outputPath = path.resolve(
  import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname),
  '../packages/server/src/openapi.ts'
);

const jsonContent = JSON.stringify(document, null, 2);

const rawFileContent = `/**
 * AUTO-GENERATED — DO NOT EDIT
 * Generated by: pnpm generate:openapi
 * Source: packages/shared/src/schemas.ts
 */

export const openApiSpec = ${jsonContent} as const;
`;

const prettierConfig = await prettierResolveConfig(outputPath);
const fileContent = await prettierFormat(rawFileContent, {
  ...prettierConfig,
  filepath: outputPath,
});

fs.writeFileSync(outputPath, fileContent, 'utf-8');

// ─── Summary ────────────────────────────────────────────────────────────────

const schemaCount = Object.keys(document.components?.schemas ?? {}).length;
const pathCount = Object.keys(document.paths ?? {}).length;
let operationCount = 0;
for (const pathItem of Object.values(document.paths ?? {})) {
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    if (method in (pathItem as Record<string, unknown>)) {
      operationCount++;
    }
  }
}

console.log(`OpenAPI spec generated successfully!`);
console.log(`  Output: ${outputPath}`);
console.log(`  Schemas: ${schemaCount} | Paths: ${pathCount} | Operations: ${operationCount}`);
