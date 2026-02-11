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

export const TsMsSchema = z.int().min(0);

// ============================================================================
// Core Schemas
// ============================================================================

export const Vec2Schema = z.object({
  x: z.number(),
  y: z.number(),
});

export const TileCoordSchema = z.object({
  tx: z.int().min(0).max(100000),
  ty: z.int().min(0).max(100000),
});

export const EntityKindSchema = z.enum(['human', 'agent', 'object']);

export const FacingSchema = z.enum(['up', 'down', 'left', 'right']);

export const ChatChannelSchema = z.enum(['proximity', 'global']);

export const ObserveDetailSchema = z.enum(['lite', 'full']);

export const UserStatusSchema = z.enum(['online', 'focus', 'dnd', 'afk', 'offline']);

export const EntityBaseSchema = z.object({
  id: IdEntitySchema,
  kind: EntityKindSchema,
  name: z.string().min(1).max(64),
  roomId: IdRoomSchema,
  pos: Vec2Schema,
  tile: TileCoordSchema.optional(),
  facing: FacingSchema.optional(),
  speed: z.number().min(0).max(1000).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const AffordanceSchema = z.object({
  action: z.string().min(1).max(64),
  label: z.string().min(1).max(128),
  paramsSchema: z.record(z.string(), z.unknown()).optional(),
});

export const ObjectStateSchema = z.object({
  objectType: z.string().min(1).max(64),
  state: z.record(z.string(), z.unknown()),
});

export const ObservedEntitySchema = z.object({
  entity: EntityBaseSchema,
  distance: z.number().min(0).max(1000000),
  affords: z.array(AffordanceSchema).max(50),
  object: ObjectStateSchema.optional(),
});

export const ObservedFacilitySchema = z.object({
  id: z.string().min(1).max(64),
  type: z.string().min(1).max(64),
  name: z.string().min(1).max(64),
  position: Vec2Schema,
  distance: z.number().min(0).max(1000000),
  affords: z.array(AffordanceSchema).max(50),
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
  details: z.record(z.string(), z.unknown()).optional(),
});

export function createResultSchema<T extends z.ZodType>(dataSchema: T) {
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
  params: z.record(z.string(), z.unknown()).optional(),
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
  windowSec: z.int().min(1).max(300),
  channel: ChatChannelSchema.optional(),
});

export const PollEventsRequestSchema = z.object({
  agentId: IdAgentSchema,
  roomId: IdRoomSchema,
  sinceCursor: CursorSchema,
  limit: z.int().min(1).max(200).optional(),
  waitMs: z.int().min(0).max(25000).optional(),
});

export const ProfileUpdateRequestSchema = z.object({
  agentId: IdAgentSchema,
  roomId: IdRoomSchema,
  status: UserStatusSchema.optional(),
  statusMessage: z.string().max(100).optional(),
  title: z.string().max(50).optional(),
  department: z.string().max(50).optional(),
});

// ============================================================================
// Response Data Schemas
// ============================================================================

export const RoomInfoSchema = z.object({
  roomId: IdRoomSchema,
  mapId: z.string().min(1).max(64),
  tickRate: z.int().min(1).max(60),
});

export const ObserveResponseDataSchema = z.object({
  self: EntityBaseSchema,
  nearby: z.array(ObservedEntitySchema).max(500),
  facilities: z.array(ObservedFacilitySchema).max(100),
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
  'zone.enter',
  'zone.exit',
  'chat.message',
  'object.state_changed',
  'profile.updated',
  'npc.state_change',
  'facility.interacted',
]);

export const EventEnvelopeSchema = z.object({
  cursor: CursorSchema,
  type: EventTypeSchema,
  roomId: IdRoomSchema,
  tsMs: TsMsSchema,
  payload: z.record(z.string(), z.unknown()),
});

export const PollEventsResponseDataSchema = z.object({
  events: z.array(EventEnvelopeSchema).max(200),
  nextCursor: CursorSchema,
  serverTsMs: TsMsSchema,
});

export const ProfileUpdateResponseDataSchema = z.object({
  applied: z.boolean(),
  profile: z.object({
    entityId: IdEntitySchema,
    displayName: z.string(),
    status: UserStatusSchema,
    statusMessage: z.string().optional(),
    avatarUrl: z.string().optional(),
    title: z.string().optional(),
    department: z.string().optional(),
  }),
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
  version: z.int().min(1).max(1000000000),
});

// ============================================================================
// Plugin Schemas
// ============================================================================

export const PluginConfigSchema = z.object({
  baseUrl: z.url(),
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
  inputSchema: z.record(z.string(), z.unknown()),
  outputSchema: z.record(z.string(), z.unknown()),
});

export const PluginManifestSchema = z.object({
  schemaVersion: z.literal('1.0'),
  name: z.literal('openclawworld'),
  version: z.string(),
  description: z.string(),
  homepage: z.url().optional(),
  license: z.string().optional(),
  configSchema: z.record(z.string(), z.unknown()),
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
  baseUrl: z.url(),
  serverTsMs: TsMsSchema,
  roomId: z.string().optional(),
  agentId: z.string().optional(),
});

// ============================================================================
// Work-Life World Schemas
// ============================================================================

export const OrgRoleSchema = z.enum(['owner', 'admin', 'member', 'guest']);

export const ZoneIdSchema = z.enum([
  'plaza',
  'north-block',
  'west-block',
  'east-block',
  'south-block',
  'lake',
]);

export const MeetingStatusSchema = z.enum(['scheduled', 'in_progress', 'ended', 'cancelled']);

export const KanbanColumnSchema = z.enum(['todo', 'doing', 'done']);

export const NpcRoleSchema = z.enum([
  'receptionist',
  'guard',
  'barista',
  'it_help',
  'pm',
  'hr',
  'sales',
  'event_host',
  'tutorial_guide',
  'quest_giver',
  'meeting_host',
  'arcade_host',
]);

export const NpcStateSchema = z.enum(['idle', 'walking', 'talking', 'working', 'break']);

export const FacilityTypeSchema = z.enum([
  'reception_desk',
  'gate',
  'meeting_door',
  'whiteboard',
  'voting_kiosk',
  'cafe_counter',
  'kanban_terminal',
  'notice_board',
  'onboarding_signpost',
  'pond_edge',
  'printer',
  'watercooler',
  'vending_machine',
  'fountain',
  'schedule_kiosk',
  'agenda_panel',
  'stage',
  'game_table',
  'room_door_a',
  'room_door_b',
  'room_door_c',
]);

export const ExtendedChatChannelSchema = z.enum(['proximity', 'global', 'team', 'meeting', 'dm']);

export const VoteOptionSchema = z.enum(['yes', 'no', 'abstain']);

export const StickyNoteColorSchema = z.enum(['yellow', 'blue', 'green', 'pink', 'orange']);

export const SafetyReportStatusSchema = z.enum(['pending', 'reviewed', 'resolved']);

export const VoteStatusSchema = z.enum(['open', 'closed']);

export const WorkLifeEventTypeSchema = z.enum([
  'org.created',
  'org.member_joined',
  'org.member_left',
  'team.created',
  'team.member_joined',
  'meeting.scheduled',
  'meeting.started',
  'meeting.ended',
  'meeting.participant_joined',
  'meeting.participant_left',
  'board.card_created',
  'board.card_moved',
  'notice.created',
  'vote.created',
  'vote.cast',
  'vote.closed',
  'zone.enter',
  'zone.exit',
  'npc.dialogue',
  'facility.interact',
]);
