/**
 * OpenClawWorld AIC v0.1 - Zod Schemas
 *
 * Runtime validation schemas corresponding to types.ts
 */

import { z } from 'zod';

// ============================================================================
// ID Schemas
// ============================================================================

export const IdRoomSchema = z.string().regex(/^[a-zA-Z0-9._-]{1,64}$/, 'Invalid roomId format');

export const IdAgentSchema = z.string().regex(/^[a-zA-Z0-9._-]{1,64}$/, 'Invalid agentId format');

export const IdEntitySchema = z
  .string()
  .regex(/^(hum|agt|obj)_[a-zA-Z0-9._-]{1,64}$/, 'Invalid entityId format');

export const IdTxSchema = z.string().regex(/^tx_[a-zA-Z0-9._-]{8,128}$/, 'Invalid txId format');

export const IdMessageSchema = z
  .string()
  .regex(/^msg_[A-Za-z0-9._-]{8,128}$/, 'Invalid messageId format');

export const CursorSchema = z.string().regex(/^[A-Za-z0-9=_-]{1,256}$/, 'Invalid cursor format');

export const TsMsSchema = z.number().int().min(0);

// ============================================================================
// Core Schemas
// ============================================================================

export const Vec2Schema = z.object({
  x: z.number(),
  y: z.number(),
});

export const TileCoordSchema = z.object({
  tx: z.number().int().min(0).max(100000),
  ty: z.number().int().min(0).max(100000),
});

export const EntityKindSchema = z.enum(['human', 'agent', 'object']);

export const FacingSchema = z.enum(['up', 'down', 'left', 'right']);

export const ChatChannelSchema = z.enum(['proximity', 'global']);

export const ObserveDetailSchema = z.enum(['lite', 'full']);

export const EntityBaseSchema = z.object({
  id: IdEntitySchema,
  kind: EntityKindSchema,
  name: z.string().min(1).max(64),
  roomId: IdRoomSchema,
  pos: Vec2Schema,
  tile: TileCoordSchema.optional(),
  facing: FacingSchema.optional(),
  speed: z.number().min(0).max(1000).optional(),
  meta: z.record(z.unknown()).optional(),
});

export const AffordanceSchema = z.object({
  action: z.string().min(1).max(64),
  label: z.string().min(1).max(128),
  paramsSchema: z.record(z.unknown()).optional(),
});

export const ObjectStateSchema = z.object({
  objectType: z.string().min(1).max(64),
  state: z.record(z.unknown()),
});

export const ObservedEntitySchema = z.object({
  entity: EntityBaseSchema,
  distance: z.number().min(0).max(1000000),
  affords: z.array(AffordanceSchema).max(50),
  object: ObjectStateSchema.optional(),
});

// ============================================================================
// Error Schemas
// ============================================================================

export const AicErrorCodeSchema = z.enum([
  'bad_request',
  'unauthorized',
  'forbidden',
  'not_found',
  'room_not_ready',
  'agent_not_in_room',
  'invalid_destination',
  'collision_blocked',
  'rate_limited',
  'conflict',
  'timeout',
  'internal',
]);

export const AicErrorObjectSchema = z.object({
  code: AicErrorCodeSchema,
  message: z.string().min(1).max(2000),
  retryable: z.boolean(),
  details: z.record(z.unknown()).optional(),
});

export function createResultSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.union([
    z.object({
      status: z.literal('ok'),
      data: dataSchema,
    }),
    z.object({
      status: z.literal('error'),
      error: AicErrorObjectSchema,
    }),
  ]);
}

// ============================================================================
// Request Schemas
// ============================================================================

export const ObserveRequestSchema = z.object({
  agentId: IdAgentSchema,
  roomId: IdRoomSchema,
  radius: z.number().min(1).max(2000),
  detail: ObserveDetailSchema,
  includeSelf: z.boolean().optional(),
});

export const MoveToRequestSchema = z.object({
  agentId: IdAgentSchema,
  roomId: IdRoomSchema,
  txId: IdTxSchema,
  dest: TileCoordSchema,
  mode: z.literal('walk').optional(),
});

export const InteractRequestSchema = z.object({
  agentId: IdAgentSchema,
  roomId: IdRoomSchema,
  txId: IdTxSchema,
  targetId: IdEntitySchema,
  action: z.string().min(1).max(64),
  params: z.record(z.unknown()).optional(),
});

export const ChatSendRequestSchema = z.object({
  agentId: IdAgentSchema,
  roomId: IdRoomSchema,
  txId: IdTxSchema,
  channel: ChatChannelSchema,
  message: z.string().min(1).max(500),
});

export const ChatObserveRequestSchema = z.object({
  agentId: IdAgentSchema,
  roomId: IdRoomSchema,
  windowSec: z.number().int().min(1).max(300),
  channel: ChatChannelSchema.optional(),
});

export const PollEventsRequestSchema = z.object({
  agentId: IdAgentSchema,
  roomId: IdRoomSchema,
  sinceCursor: CursorSchema,
  limit: z.number().int().min(1).max(200).optional(),
  waitMs: z.number().int().min(0).max(25000).optional(),
});

// ============================================================================
// Response Data Schemas
// ============================================================================

export const RoomInfoSchema = z.object({
  roomId: IdRoomSchema,
  mapId: z.string().min(1).max(64),
  tickRate: z.number().int().min(1).max(60),
});

export const ObserveResponseDataSchema = z.object({
  self: EntityBaseSchema,
  nearby: z.array(ObservedEntitySchema).max(500),
  serverTsMs: TsMsSchema,
  room: RoomInfoSchema,
});

export const MoveToResultSchema = z.enum(['accepted', 'rejected', 'no_op']);

export const MoveToResponseDataSchema = z.object({
  txId: IdTxSchema,
  applied: z.boolean(),
  serverTsMs: TsMsSchema,
  result: MoveToResultSchema,
});

export const InteractOutcomeTypeSchema = z.enum(['ok', 'no_effect', 'invalid_action', 'too_far']);

export const InteractOutcomeSchema = z.object({
  type: InteractOutcomeTypeSchema,
  message: z.string().max(2000).optional(),
});

export const InteractResponseDataSchema = z.object({
  txId: IdTxSchema,
  applied: z.boolean(),
  serverTsMs: TsMsSchema,
  outcome: InteractOutcomeSchema,
});

export const ChatSendResponseDataSchema = z.object({
  txId: IdTxSchema,
  applied: z.boolean(),
  serverTsMs: TsMsSchema,
  chatMessageId: IdMessageSchema,
});

export const ChatMessageSchema = z.object({
  id: IdMessageSchema,
  roomId: IdRoomSchema,
  channel: ChatChannelSchema,
  fromEntityId: IdEntitySchema,
  fromName: z.string().min(1).max(64),
  message: z.string().min(1).max(500),
  tsMs: TsMsSchema,
});

export const ChatObserveResponseDataSchema = z.object({
  messages: z.array(ChatMessageSchema).max(500),
  serverTsMs: TsMsSchema,
});

// ============================================================================
// Event Schemas
// ============================================================================

export const EventTypeSchema = z.enum([
  'presence.join',
  'presence.leave',
  'proximity.enter',
  'proximity.exit',
  'chat.message',
  'object.state_changed',
]);

export const EventEnvelopeSchema = z.object({
  cursor: CursorSchema,
  type: EventTypeSchema,
  roomId: IdRoomSchema,
  tsMs: TsMsSchema,
  payload: z.record(z.unknown()),
});

export const PollEventsResponseDataSchema = z.object({
  events: z.array(EventEnvelopeSchema).max(200),
  nextCursor: CursorSchema,
  serverTsMs: TsMsSchema,
});

// ============================================================================
// Event Payload Schemas
// ============================================================================

export const PresenceJoinPayloadSchema = z.object({
  entityId: IdEntitySchema,
  name: z.string().min(1).max(64),
  kind: EntityKindSchema,
});

export const PresenceLeavePayloadSchema = z.object({
  entityId: IdEntitySchema,
  reason: z.enum(['disconnect', 'kicked', 'room_closed']),
});

export const ProximityEnterPayloadSchema = z.object({
  subjectId: IdEntitySchema,
  otherId: IdEntitySchema,
  distance: z.number().min(0).max(1000000),
});

export const ProximityExitPayloadSchema = z.object({
  subjectId: IdEntitySchema,
  otherId: IdEntitySchema,
});

export const ChatMessagePayloadSchema = z.object({
  messageId: IdMessageSchema,
  fromEntityId: IdEntitySchema,
  channel: ChatChannelSchema,
  message: z.string().min(1).max(500),
  tsMs: TsMsSchema,
});

export const JsonPatchOpSchema = z.object({
  op: z.enum(['add', 'remove', 'replace']),
  path: z.string().min(1).max(256),
  value: z.unknown().optional(),
});

export const ObjectStateChangedPayloadSchema = z.object({
  objectId: IdEntitySchema,
  objectType: z.string().min(1).max(64),
  patch: z.array(JsonPatchOpSchema).min(1).max(100),
  version: z.number().int().min(1).max(1000000000),
});

// ============================================================================
// Plugin Schemas
// ============================================================================

export const PluginConfigSchema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string().optional(),
  defaultRoomId: z.string().optional(),
  defaultAgentId: z.string().optional(),
});

export const ToolDeclarationSchema = z.object({
  name: z.string(),
  required: z.boolean(),
  description: z.string(),
  sideEffects: z.enum(['none', 'world', 'chat']),
  defaultEnabled: z.boolean(),
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
});

export const PluginManifestSchema = z.object({
  schemaVersion: z.literal('1.0'),
  name: z.literal('openclawworld'),
  version: z.string(),
  description: z.string(),
  homepage: z.string().url().optional(),
  license: z.string().optional(),
  configSchema: z.record(z.unknown()),
  tools: z.array(ToolDeclarationSchema),
});

// ============================================================================
// Agent Registration Schemas
// ============================================================================

export const RegisterRequestSchema = z.object({
  name: z.string().min(1).max(64),
  roomId: IdRoomSchema,
});

export const RegisterResponseDataSchema = z.object({
  agentId: IdEntitySchema,
  roomId: IdRoomSchema,
  sessionToken: z.string().regex(/^[a-zA-Z0-9._-]{8,256}$/, 'Invalid sessionToken format'),
});

// ============================================================================
// Status Tool Schemas
// ============================================================================

export const StatusRequestSchema = z.object({
  roomId: z.string().optional(),
  agentId: z.string().optional(),
});

export const StatusResponseDataSchema = z.object({
  serverReachable: z.boolean(),
  baseUrl: z.string().url(),
  serverTsMs: TsMsSchema,
  roomId: z.string().optional(),
  agentId: z.string().optional(),
});
