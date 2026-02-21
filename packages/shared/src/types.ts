/**
 * OpenClawWorld AIC v0.1 - TypeScript Type Definitions
 *
 * Types that have matching Zod schemas are now derived via z.infer<> in schemas.ts.
 * This file contains types WITHOUT Zod schema equivalents, or types that differ
 * from their schema counterparts (e.g., wider unions, extra fields, generics).
 */

import type {
  Affordance,
  AicErrorObject,
  EntityBase,
  FacilityType,
  KanbanColumn,
  MeetingStatus,
  ObjectStateChangedPayload,
  ObservedEntity,
  OrgRole,
  PresenceJoinPayload,
  PresenceLeavePayload,
  ProximityEnterPayload,
  ProximityExitPayload,
  RoomInfo,
  SkillCategory,
  SkillEffectDefinition,
  TileType,
  UserStatus,
  Vec2,
  VoteOption,
  ZoneId,
  ZoneInfo,
} from './schemas.js';

// ============================================================================
// Generic Result Type (no Zod schema equivalent - generic)
// ============================================================================

export type { AicErrorCode, AicErrorObject, FacilityType, ZoneId } from './schemas.js';

export type AicResult<T> = { status: 'ok'; data: T } | { status: 'error'; error: AicErrorObject };

// ============================================================================
// Chat Types (types.ts ChatChannel has 5 values vs schema's 2)
// ============================================================================

export type ChatChannel = 'proximity' | 'global' | 'team' | 'meeting' | 'dm';

export type ChatSendRequest = {
  agentId: string;
  roomId: string;
  txId: string;
  channel: ChatChannel;
  message: string;
};

export type ChatObserveRequest = {
  agentId: string;
  roomId: string;
  windowSec: number;
  channel?: ChatChannel;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  channel: ChatChannel;
  fromEntityId: string;
  fromName: string;
  message: string;
  tsMs: number;
  // New fields for extended channels:
  targetEntityId?: string; // For DM
  teamId?: string; // For team chat
  meetingRoomId?: string; // For meeting chat
  emotes?: string[]; // Emotes like :thumbsup:, :heart:
};

export type ChatObserveResponseData = {
  messages: ChatMessage[];
  serverTsMs: number;
};

export type ChatMessagePayload = {
  messageId: string;
  fromEntityId: string;
  channel: ChatChannel;
  message: string;
  tsMs: number;
};

// ============================================================================
// Observed Facility (types.ts uses FacilityType, schema uses z.string())
// ============================================================================

export type ObservedFacility = {
  id: string;
  type: FacilityType;
  name: string;
  position: Vec2;
  distance: number;
  affords: Affordance[];
};

// ============================================================================
// Event Types (EventType includes MeetingEventType union; EventEnvelope is generic)
// ============================================================================

export type MeetingEventType =
  | 'meeting.created'
  | 'meeting.participant_joined'
  | 'meeting.participant_left'
  | 'meeting.host_transferred'
  | 'meeting.ended'
  | 'agenda.item_added'
  | 'agenda.item_removed'
  | 'agenda.item_updated'
  | 'agenda.item_completed'
  | 'agenda.current_item_set'
  | 'agenda.next_item'
  | 'agenda.items_reordered';

export type EventType =
  | 'presence.join'
  | 'presence.leave'
  | 'proximity.enter'
  | 'proximity.exit'
  | 'zone.enter'
  | 'zone.exit'
  | 'chat.message'
  | 'object.state_changed'
  | 'profile.updated'
  | 'npc.state_change'
  | 'facility.interacted'
  | 'emote.triggered'
  | MeetingEventType;

export type EventEnvelope<T = Record<string, unknown>> = {
  cursor: string;
  type: EventType;
  roomId: string;
  tsMs: number;
  payload: T;
};

export type PollEventsResponseData = {
  events: EventEnvelope[];
  nextCursor: string;
  cursorExpired: boolean;
  serverTsMs: number;
};

// ============================================================================
// Profile Types (ProfileUpdateResponseData uses UserProfile, not inline object)
// ============================================================================

export type UserProfile = {
  entityId: string;
  displayName: string;
  status: UserStatus;
  statusMessage?: string;
  avatarUrl?: string;
  title?: string; // e.g., "Senior Engineer"
  department?: string;
};

export type ProfileUpdateResponseData = {
  applied: boolean;
  profile: UserProfile;
  serverTsMs: number;
};

export type ProfileUpdatedPayload = {
  entityId: string;
  status?: UserStatus;
  statusMessage?: string;
  title?: string;
  department?: string;
};

// ============================================================================
// Map Types (MapMetadata has collisionGrid; ObserveResponseData uses it)
// ============================================================================

export type MapMetadata = {
  currentZone: ZoneId | null;
  zones: ZoneInfo[];
  mapSize: { width: number; height: number; tileSize: number };
  /** Collision grid (row-major: grid[y][x], true=blocked). Included when includeGrid=true in observe request. */
  collisionGrid?: boolean[][];
};

export type ObserveResponseData = {
  self: EntityBase;
  nearby: ObservedEntity[];
  facilities: ObservedFacility[];
  serverTsMs: number;
  room: RoomInfo;
  mapMetadata?: MapMetadata;
};

// ============================================================================
// Zone Payload Types (no Zod schema equivalents)
// ============================================================================

export type ZoneEnterPayload = {
  entityId: string;
  zoneId: ZoneId;
  previousZoneId: ZoneId | null;
};

export type ZoneExitPayload = {
  entityId: string;
  zoneId: ZoneId;
  nextZoneId: ZoneId | null;
};

// ============================================================================
// NPC Types (NpcRole and NpcState have more values than their schemas)
// ============================================================================

export type NpcRole =
  | 'receptionist'
  | 'guard'
  | 'barista'
  | 'it_help'
  | 'pm'
  | 'hr'
  | 'sales'
  | 'event_host'
  | 'tutorial_guide'
  | 'quest_giver'
  | 'meeting_host'
  | 'arcade_host'
  | 'greeter'
  | 'ranger'
  | 'fountain_keeper';

export type NpcState = 'idle' | 'walking' | 'talking' | 'working' | 'break' | 'patrolling';

export type NpcStateChangePayload = {
  npcId: string;
  oldState: NpcState;
  newState: NpcState;
};

export type EmoteTriggeredPayload = {
  entityId: string;
  emoteType: string;
};

// ============================================================================
// Typed Event Envelopes (depend on generic EventEnvelope and payload types)
// ============================================================================

export type PresenceJoinEvent = EventEnvelope<PresenceJoinPayload> & {
  type: 'presence.join';
};
export type PresenceLeaveEvent = EventEnvelope<PresenceLeavePayload> & {
  type: 'presence.leave';
};
export type ProximityEnterEvent = EventEnvelope<ProximityEnterPayload> & {
  type: 'proximity.enter';
};
export type ProximityExitEvent = EventEnvelope<ProximityExitPayload> & {
  type: 'proximity.exit';
};
export type ChatMessageEvent = EventEnvelope<ChatMessagePayload> & {
  type: 'chat.message';
};
export type ObjectStateChangedEvent = EventEnvelope<ObjectStateChangedPayload> & {
  type: 'object.state_changed';
};
export type ProfileUpdatedEvent = EventEnvelope<ProfileUpdatedPayload> & {
  type: 'profile.updated';
};
export type NpcStateChangeEvent = EventEnvelope<NpcStateChangePayload> & {
  type: 'npc.state_change';
};

export type TypedEvent =
  | PresenceJoinEvent
  | PresenceLeaveEvent
  | ProximityEnterEvent
  | ProximityExitEvent
  | ChatMessageEvent
  | ObjectStateChangedEvent
  | ProfileUpdatedEvent
  | NpcStateChangeEvent;

// ============================================================================
// Plugin Types (no Zod schema equivalents used in types.ts)
// ============================================================================

export type PluginConfig = {
  baseUrl: string;
  apiKey?: string;
  defaultRoomId?: string;
  defaultAgentId?: string;
};

export type ToolDeclaration = {
  name: string;
  required: boolean;
  description: string;
  sideEffects: 'none' | 'world' | 'chat';
  defaultEnabled: boolean;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
};

export type PluginManifest = {
  schemaVersion: '1.0';
  name: 'openclawworld';
  version: string;
  description: string;
  homepage?: string;
  license?: string;
  configSchema: Record<string, unknown>;
  tools: ToolDeclaration[];
};

// ============================================================================
// Meeting Response Types (no Zod schema equivalents for response data)
// ============================================================================

export type MeetingInfo = {
  meetingId: string;
  name: string;
  hostId: string;
  participantCount: number;
  capacity: number;
};

export type MeetingListResponseData = {
  meetings: MeetingInfo[];
  serverTsMs: number;
};

export type MeetingJoinResponseData = {
  meetingId: string;
  role: string;
  participants: Array<{
    entityId: string;
    name: string;
    role: string;
  }>;
  serverTsMs: number;
};

export type MeetingLeaveResponseData = {
  meetingId: string;
  leftAt: number;
  serverTsMs: number;
};

// ============================================================================
// Map Types (complex domain types without Zod schemas)
// ============================================================================

export type TileColorMapping = {
  color: string;
  type: TileType;
  collision: boolean;
  isDoor?: boolean;
};

export type TileInfo = {
  type: TileType;
  collision: boolean;
  isDoor: boolean;
  zoneId?: ZoneId;
};

/**
 * World grid containing tile information for each position
 */
export type WorldGrid = TileInfo[][];

/**
 * Represents a 2D collision grid where true = blocked, false = passable
 */
export type CollisionGrid = boolean[][];

/**
 * Tiled map layer data
 */
export type TiledLayer = {
  id: number;
  name: string;
  type: 'tilelayer' | 'objectgroup' | 'imagelayer';
  x: number;
  y: number;
  width?: number;
  height?: number;
  visible: boolean;
  opacity: number;
  data?: number[];
  objects?: TiledObject[];
  properties?: TiledProperty[];
};

/**
 * Tiled map object
 */
export type TiledObject = {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: TiledProperty[];
};

/**
 * Tiled property
 */
export type TiledProperty = {
  name: string;
  type: 'string' | 'int' | 'float' | 'bool' | 'color' | 'file';
  value: unknown;
};

/**
 * Raw map data loaded from Tiled JSON
 */
export type MapData = {
  version: number;
  tiledversion: string;
  orientation: string;
  renderorder: string;
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  nextlayerid: number;
  nextobjectid: number;
  properties?: TiledProperty[];
  layers: TiledLayer[];
  tilesets: Array<{
    firstgid: number;
    source: string;
  }>;
};

/**
 * Parsed map information with collision data
 */
export type ParsedMap = {
  mapId: string;
  width: number;
  height: number;
  tileSize: number;
  collisionGrid: CollisionGrid;
  layers: TiledLayer[];
  objects: TiledObject[];
};

// ============================================================================
// Work-Life World Types (complex domain types without Zod schemas)
// ============================================================================

// Organization & Team
export type Organization = {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  createdAt: number;
  ownerId: string;
};

export type Team = {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  createdAt: number;
};

export type TeamMember = {
  orgId: string;
  teamId: string;
  entityId: string;
  role: OrgRole;
  joinedAt: number;
};

// Zones (extended with name/description/allowedRoles)
export type Zone = {
  id: ZoneId;
  name: string;
  description?: string;
  bounds: { x: number; y: number; width: number; height: number };
  allowedRoles?: OrgRole[]; // If set, only these roles can enter
};

// Meetings
export type Meeting = {
  id: string;
  roomId: string;
  title: string;
  description?: string;
  organizerId: string;
  teamId?: string;
  startTime: number;
  endTime: number;
  status: MeetingStatus;
  attendeeIds: string[];
  invitedIds: string[];
};

export type MeetingReservationStatus = 'scheduled' | 'active' | 'cancelled' | 'completed';

export type MeetingReservation = {
  id: string;
  meetingRoomId: string; // Physical room in map
  orgId: string;
  creatorId: string;
  name: string;
  startTime: number; // Unix timestamp
  endTime: number;
  status: MeetingReservationStatus;
  colyseusRoomId?: string; // Set when meeting is active
};

export type MeetingRoomOptions = {
  meetingId: string;
  orgId: string;
  name: string;
  hostId: string;
  capacity?: number;
};

export type MeetingParticipantRole = 'host' | 'participant';

// Agenda
export type AgendaItem = {
  id: string;
  meetingId: string;
  title: string;
  description?: string;
  order: number;
  completed: boolean;
  createdBy: string;
};

// Work Tools - Kanban
export type KanbanCard = {
  id: string;
  boardId: string;
  column: KanbanColumn;
  title: string;
  description?: string;
  assigneeId?: string;
  order: number;
  createdAt: number;
  createdBy: string;
};

export type KanbanBoard = {
  id: string;
  teamId: string;
  name: string;
  cards: KanbanCard[];
};

// Work Tools - Notices
export type Notice = {
  id: string;
  teamId: string;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: number;
  createdBy: string;
};

// Whiteboard
export type StickyNote = {
  id: string;
  meetingId: string;
  content: string;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'orange';
  position: { x: number; y: number }; // 0-9 grid
  createdBy: string;
};

// Voting
export type Vote = {
  id: string;
  meetingId: string;
  question: string;
  anonymous: boolean;
  status: 'open' | 'closed';
  votes: Map<string, VoteOption>; // entityId -> vote
  createdBy: string;
  createdAt: number;
};

// NPC Definitions
// Dialogue system types
export type DialogueOption = {
  text: string;
  next: string | null; // null = end conversation
};

export type DialogueNode = {
  id: string;
  text: string;
  options: DialogueOption[];
};

export type DialogueTree = Record<string, DialogueNode>;

// Schedule entry: supports both time-based ("HH:MM") and hour-range formats
export type NpcScheduleEntry =
  | { time: string; state: NpcState; location?: Vec2 }
  | { startHour: number; endHour: number; state: NpcState; position?: Vec2 };

export type NpcDefinition = {
  id: string;
  name: string;
  role?: NpcRole;
  sprite?: string;
  zone: ZoneId;
  spawnPosition?: Vec2;
  defaultPosition?: Vec2;
  dialogue?: DialogueTree | string[];
  schedule?: NpcScheduleEntry[];
};

// Facilities
export type Facility = {
  id: string;
  type: FacilityType;
  name: string;
  zone: ZoneId;
  position: Vec2;
  interactionRadius: number;
  affordances: Affordance[];
};

// Safety
export type SafetyReport = {
  id: string;
  reporterId: string;
  targetId: string;
  reason: string;
  createdAt: number;
  status: 'pending' | 'reviewed' | 'resolved';
};

export type BlockedUser = {
  blockerId: string;
  blockedId: string;
  createdAt: number;
};

export type MutedUser = {
  orgId: string;
  mutedId: string;
  mutedBy: string;
  expiresAt?: number;
  createdAt: number;
};

// Extended Chat
export type DirectMessage = {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  message: string;
  tsMs: number;
};

// Events (extend existing EventType)
export type WorkLifeEventType =
  | 'org.created'
  | 'org.member_joined'
  | 'org.member_left'
  | 'team.created'
  | 'team.member_joined'
  | 'meeting.scheduled'
  | 'meeting.started'
  | 'meeting.ended'
  | 'meeting.participant_joined'
  | 'meeting.participant_left'
  | 'board.card_created'
  | 'board.card_moved'
  | 'notice.created'
  | 'vote.created'
  | 'vote.cast'
  | 'vote.closed'
  | 'zone.enter'
  | 'zone.exit'
  | 'npc.dialogue'
  | 'facility.interact';

// ============================================================================
// Skill System Types (SkillAction and SkillDefinition differ from schemas)
// ============================================================================

export type SkillActionParam = {
  name: string;
  type: string;
  required: boolean;
  description: string;
};

export type SkillAction = {
  id: string;
  name: string;
  label?: string;
  description: string;
  cooldownMs?: number;
  castTimeMs?: number;
  rangeUnits?: number;
  manaCost?: number;
  params?: SkillActionParam[] | Record<string, unknown>;
  effect?: SkillEffectDefinition;
};

export type SkillSource = {
  type: 'builtin' | 'plugin' | 'custom';
  pluginId?: string;
};

export type SkillDefinition = {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  version?: string;
  icon?: string;
  emoji?: string;
  source?: SkillSource;
  actions: SkillAction[];
  passive?: boolean;
  prerequisites?: string[];
  triggers?: string[];
};

export type SkillListResponseData = {
  skills: SkillDefinition[];
  serverTsMs: number;
};
