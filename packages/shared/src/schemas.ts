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

// NPC ID schema - supports npc_ prefixed IDs (e.g., 'npc_greeter', 'npc_meeting-host')
// and bare kebab-case identifiers (e.g., 'greeter', 'meeting-host')
export const IdNpcSchema = z
  .string()
  .regex(/^(npc_)?[a-z][a-z0-9-]{0,63}$/, 'Invalid npcId format');

// Entity or NPC ID schema - used in observe responses where both types can appear
export const IdEntityOrNpcSchema = z.union([IdEntitySchema, IdNpcSchema]);

// Target ID schema for interact - supports entity IDs, NPC IDs, and facility IDs
export const IdTargetSchema = z
  .string()
  .regex(/^[a-zA-Z][a-zA-Z0-9._-]{0,127}$/, 'Invalid targetId format');

export const IdTxSchema = z.string().regex(/^tx_[a-zA-Z0-9._-]{8,128}$/, 'Invalid txId format');

export const IdMessageSchema = z
  .string()
  .regex(/^msg_[A-Za-z0-9._-]{8,128}$/, 'Invalid messageId format');

export const CursorSchema = z.union([
  z.string().regex(/^[A-Za-z0-9=_-]{1,256}$/, 'Invalid cursor format'),
  z.string().regex(/^\d+$/, 'Invalid numeric cursor format'),
]);

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

export const EntityKindSchema = z.enum(['human', 'agent', 'object', 'npc']);

export const FacingSchema = z.enum(['up', 'down', 'left', 'right']);

export const ChatChannelSchema = z.enum(['proximity', 'global']);

export const ObserveDetailSchema = z.enum(['lite', 'full']);

export const UserStatusSchema = z.enum(['online', 'focus', 'dnd', 'afk', 'offline']);

export const EntityBaseSchema = z.object({
  id: IdEntityOrNpcSchema,
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
  includeGrid: z.boolean().optional(),
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
  targetId: IdTargetSchema,
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
  sinceCursor: CursorSchema.optional(),
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

export const ZoneIdSchema = z.enum([
  'lobby',
  'office',
  'central-park',
  'arcade',
  'meeting',
  'lounge-cafe',
  'plaza',
  'lake',
]);

export const EntranceDirectionSchema = z.enum(['north', 'south', 'east', 'west']);

export const BuildingEntranceSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(128),
  position: Vec2Schema,
  size: z.object({ width: z.number(), height: z.number() }),
  zone: ZoneIdSchema,
  direction: EntranceDirectionSchema,
  connectsTo: ZoneIdSchema,
});

export const ZoneInfoSchema = z.object({
  id: ZoneIdSchema,
  bounds: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  entrances: z.array(BuildingEntranceSchema),
});

export const MapMetadataSchema = z.object({
  currentZone: ZoneIdSchema.nullable(),
  zones: z.array(ZoneInfoSchema),
  mapSize: z.object({
    width: z.number().int().min(1),
    height: z.number().int().min(1),
    tileSize: z.number().int().min(1),
  }),
});

export const ObserveResponseDataSchema = z.object({
  self: EntityBaseSchema,
  nearby: z.array(ObservedEntitySchema).max(500),
  facilities: z.array(ObservedFacilitySchema).max(100),
  serverTsMs: TsMsSchema,
  room: RoomInfoSchema,
  mapMetadata: MapMetadataSchema.optional(),
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
  targetEntityId: IdEntitySchema.optional(),
  teamId: z.string().min(1).max(64).optional(),
  meetingRoomId: z.string().min(1).max(64).optional(),
  emotes: z.array(z.string().min(1).max(32)).optional(),
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
  cursorExpired: z.boolean(),
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
  name: z.string().min(1).max(64).optional(),
  kind: EntityKindSchema.optional(),
  reason: z.enum(['disconnect', 'kicked', 'room_closed', 'unregister', 'timeout']),
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

export const UnregisterRequestSchema = z.object({
  agentId: IdAgentSchema,
  roomId: IdRoomSchema,
});

export const UnregisterResponseDataSchema = z.object({
  agentId: IdEntitySchema,
  unregisteredAt: TsMsSchema,
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

// ============================================================================
// Skill System Schemas
// ============================================================================

export const SkillCategorySchema = z.enum(['movement', 'combat', 'social', 'utility']);

export const SkillEffectDefinitionSchema = z.object({
  id: z.string().min(1).max(64),
  durationMs: z.number().int().min(0).max(3600000),
  statModifiers: z
    .object({
      speedMultiplier: z.number().min(0).max(10).optional(),
    })
    .optional(),
});

export const SkillActionSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  description: z.string().min(1).max(500),
  cooldownMs: z.number().int().min(0).max(3600000).optional(),
  castTimeMs: z.number().int().min(0).max(60000).optional(),
  rangeUnits: z.number().min(0).max(10000).optional(),
  manaCost: z.number().int().min(0).max(10000).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  effect: SkillEffectDefinitionSchema.optional(),
});

export const SkillDefinitionSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(64),
  description: z.string().min(1).max(500),
  category: SkillCategorySchema,
  icon: z.string().max(256).optional(),
  actions: z.array(SkillActionSchema).min(1).max(20),
  passive: z.boolean().optional(),
  prerequisites: z.array(z.string().min(1).max(64)).max(10).optional(),
});

export const SkillInvokeOutcomeTypeSchema = z.enum(['ok', 'pending', 'cancelled', 'error']);

export const SkillInvokeOutcomeSchema = z.object({
  type: SkillInvokeOutcomeTypeSchema,
  message: z.string().max(500).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  completionTime: TsMsSchema.optional(),
});

export const AgentSkillStateSchema = z.object({
  skillId: z.string().min(1).max(64),
  installedAt: TsMsSchema,
  enabled: z.boolean(),
  credentials: z.record(z.string(), z.string()).optional(),
});

export const PendingCastSchema = z.object({
  txId: IdTxSchema,
  skillId: z.string().min(1).max(64),
  actionId: z.string().min(1).max(64),
  sourceEntityId: IdEntitySchema,
  targetEntityId: z.string(),
  startTime: TsMsSchema,
  completionTime: TsMsSchema,
  startPosition: Vec2Schema,
});

export const ActiveEffectSchema = z.object({
  effectId: z.string().min(1).max(64),
  effectType: z.string().min(1).max(64),
  sourceId: IdEntitySchema,
  targetId: IdEntitySchema,
  durationMs: z.number().int().min(0).max(3600000),
  speedMultiplier: z.number().min(0).max(10),
  startTime: TsMsSchema.optional(),
});

// ============================================================================
// Skill System Request Schemas
// ============================================================================

export const SkillListRequestSchema = z.object({
  agentId: IdAgentSchema,
  roomId: IdRoomSchema,
  category: SkillCategorySchema.optional(),
  installed: z.boolean().optional(),
});

export const SkillInstallRequestSchema = z.object({
  agentId: IdAgentSchema,
  roomId: IdRoomSchema,
  txId: IdTxSchema,
  skillId: z.string().min(1).max(64),
  credentials: z.record(z.string(), z.string()).optional(),
});

export const SkillInvokeRequestSchema = z.object({
  agentId: IdAgentSchema,
  roomId: IdRoomSchema,
  txId: IdTxSchema,
  skillId: z.string().min(1).max(64),
  actionId: z.string().min(1).max(64),
  targetId: IdEntitySchema.optional(),
  params: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// Skill System Response Schemas
// ============================================================================

export const SkillListResponseDataSchema = z.object({
  skills: z.array(SkillDefinitionSchema).max(100),
  serverTsMs: TsMsSchema,
});

export const SkillInstallResponseDataSchema = z.object({
  skillId: z.string().min(1).max(64),
  installed: z.boolean(),
  alreadyInstalled: z.boolean(),
  serverTsMs: TsMsSchema,
});

export const SkillInvokeResponseDataSchema = z.object({
  txId: IdTxSchema,
  outcome: SkillInvokeOutcomeSchema,
  serverTsMs: TsMsSchema,
});

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

// ============================================================================
// Tileset Schemas
// ============================================================================

export const TileTypeSchema = z.enum([
  'empty',
  'grass',
  'road',
  'floor_lobby',
  'floor_office',
  'floor_meeting',
  'floor_lounge',
  'floor_arcade',
  'floor_plaza',
  'floor_lake',
  'door',
  'wall',
  'water',
  'decoration',
  // Kenney base tileset tiles (slots 14-31)
  'floor_park',
  'floor_lake_edge',
  'wall_brick',
  'wall_stone',
  'wall_glass',
  'wall_indoor',
  'wall_fence',
  'door_closed',
  'door_open',
  'water_center',
  'tree_round',
  'tree_cone',
  'bush',
  'fountain',
  'bench',
  'streetlamp',
  'sign',
  'potted_plant',
  // Kenney Roguelike City Pack tiles (slots 32-79)
  'city_road_0',
  'city_road_1',
  'city_road_2',
  'city_road_3',
  'city_road_4',
  'city_road_5',
  'city_road_6',
  'city_road_7',
  'city_nature_0',
  'city_nature_1',
  'city_nature_2',
  'city_nature_3',
  'city_nature_4',
  'city_nature_5',
  'city_nature_6',
  'city_nature_7',
  'city_wall_0',
  'city_wall_1',
  'city_wall_2',
  'city_wall_3',
  'city_wall_4',
  'city_wall_5',
  'city_wall_6',
  'city_wall_7',
  'city_brick_0',
  'city_brick_1',
  'city_brick_2',
  'city_brick_3',
  'city_floor_0',
  'city_floor_1',
  'city_floor_2',
  'city_floor_3',
  'city_floor_4',
  'city_floor_5',
  'city_floor_6',
  'city_floor_7',
  'city_deco_0',
  'city_deco_1',
  'city_deco_2',
  'city_deco_3',
  'city_deco_4',
  'city_deco_5',
  'city_deco_6',
  'city_deco_7',
  'city_wood_0',
  'city_wood_1',
  'city_wood_2',
  'city_wood_3',
]);

export const TilesetTileDefinitionSchema = z.object({
  id: z.number().int().min(0),
  type: TileTypeSchema,
  collision: z.boolean(),
  isDoor: z.boolean().optional(),
});

export const TilesetDefinitionSchema = z.object({
  name: z.string().min(1).max(64),
  tilewidth: z.number().int().min(1),
  tileheight: z.number().int().min(1),
  tilecount: z.number().int().min(1),
  columns: z.number().int().min(1),
  license: z.string().optional(),
  tiles: z.array(TilesetTileDefinitionSchema).min(1),
});
