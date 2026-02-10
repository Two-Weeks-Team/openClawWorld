/**
 * OpenClawWorld AIC v0.1 - TypeScript Type Definitions
 *
 * These types correspond 1:1 with the JSON Schemas in aic-schema.json
 */

// ============================================================================
// Error Types
// ============================================================================

export type AicErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'room_not_ready'
  | 'agent_not_in_room'
  | 'invalid_destination'
  | 'collision_blocked'
  | 'rate_limited'
  | 'conflict'
  | 'timeout'
  | 'internal';

export type AicErrorObject = {
  code: AicErrorCode;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
};

export type AicResult<T> = { status: 'ok'; data: T } | { status: 'error'; error: AicErrorObject };

// ============================================================================
// Core Types
// ============================================================================

export type TileCoord = {
  tx: number;
  ty: number;
};

export type Vec2 = {
  x: number;
  y: number;
};

export type EntityKind = 'human' | 'agent' | 'object';
export type Facing = 'up' | 'down' | 'left' | 'right';
export type ChatChannel = 'proximity' | 'global';
export type ObserveDetail = 'lite' | 'full';

export type EntityBase = {
  id: string;
  kind: EntityKind;
  name: string;
  roomId: string;
  pos: Vec2;
  tile?: TileCoord;
  facing?: Facing;
  speed?: number;
  meta?: Record<string, unknown>;
};

export type Affordance = {
  action: string;
  label: string;
  paramsSchema?: Record<string, unknown>;
};

export type ObjectState = {
  objectType: string;
  state: Record<string, unknown>;
};

export type ObservedEntity = {
  entity: EntityBase;
  distance: number;
  affords: Affordance[];
  object?: ObjectState;
};

// ============================================================================
// Request Types
// ============================================================================

export type ObserveRequest = {
  agentId: string;
  roomId: string;
  radius: number;
  detail: ObserveDetail;
  includeSelf?: boolean;
};

export type MoveToRequest = {
  agentId: string;
  roomId: string;
  txId: string;
  dest: TileCoord;
  mode?: 'walk';
};

export type InteractRequest = {
  agentId: string;
  roomId: string;
  txId: string;
  targetId: string;
  action: string;
  params?: Record<string, unknown>;
};

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

export type PollEventsRequest = {
  agentId: string;
  roomId: string;
  sinceCursor: string;
  limit?: number;
  waitMs?: number;
};

export type ProfileUpdateRequest = {
  agentId: string;
  roomId: string;
  status?: UserStatus;
  statusMessage?: string;
  title?: string;
  department?: string;
};

// ============================================================================
// Response Types
// ============================================================================

export type RoomInfo = {
  roomId: string;
  mapId: string;
  tickRate: number;
};

export type ObserveResponseData = {
  self: EntityBase;
  nearby: ObservedEntity[];
  serverTsMs: number;
  room: RoomInfo;
};

export type MoveToResult = 'accepted' | 'rejected' | 'no_op';

export type MoveToResponseData = {
  txId: string;
  applied: boolean;
  serverTsMs: number;
  result: MoveToResult;
};

export type InteractOutcomeType = 'ok' | 'no_effect' | 'invalid_action' | 'too_far';

export type InteractOutcome = {
  type: InteractOutcomeType;
  message?: string;
};

export type InteractResponseData = {
  txId: string;
  applied: boolean;
  serverTsMs: number;
  outcome: InteractOutcome;
};

export type ChatSendResponseData = {
  txId: string;
  applied: boolean;
  serverTsMs: number;
  chatMessageId: string;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  channel: ChatChannel;
  fromEntityId: string;
  fromName: string;
  message: string;
  tsMs: number;
};

export type ChatObserveResponseData = {
  messages: ChatMessage[];
  serverTsMs: number;
};

// ============================================================================
// Event Types
// ============================================================================

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
  | 'npc.state_change';

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
  serverTsMs: number;
};

export type ProfileUpdateResponseData = {
  applied: boolean;
  profile: UserProfile;
  serverTsMs: number;
};

// ============================================================================
// Event Payload Types
// ============================================================================

export type PresenceJoinPayload = {
  entityId: string;
  name: string;
  kind: EntityKind;
};

export type PresenceLeavePayload = {
  entityId: string;
  reason: 'disconnect' | 'kicked' | 'room_closed';
};

export type ProximityEnterPayload = {
  subjectId: string;
  otherId: string;
  distance: number;
};

export type ProximityExitPayload = {
  subjectId: string;
  otherId: string;
};

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

export type ChatMessagePayload = {
  messageId: string;
  fromEntityId: string;
  channel: ChatChannel;
  message: string;
  tsMs: number;
};

export type JsonPatchOp = {
  op: 'add' | 'remove' | 'replace';
  path: string;
  value?: unknown;
};

export type ObjectStateChangedPayload = {
  objectId: string;
  objectType: string;
  patch: JsonPatchOp[];
  version: number;
};

export type ProfileUpdatedPayload = {
  entityId: string;
  status?: UserStatus;
  statusMessage?: string;
  title?: string;
  department?: string;
};

export type NpcStateChangePayload = {
  npcId: string;
  oldState: NpcState;
  newState: NpcState;
};

// ============================================================================
// Typed Event Envelopes
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
// Plugin Types
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
// Agent Registration Types
// ============================================================================

export type RegisterRequest = {
  name: string;
  roomId: string;
};

export type RegisterResponseData = {
  agentId: string;
  roomId: string;
  sessionToken: string;
};

// ============================================================================
// Status Tool Types
// ============================================================================

export type StatusRequest = {
  roomId?: string;
  agentId?: string;
};

export type StatusResponseData = {
  serverReachable: boolean;
  baseUrl: string;
  serverTsMs: number;
  roomId?: string;
  agentId?: string;
};

// ============================================================================
// Map Types
// ============================================================================

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
// Work-Life World Types
// ============================================================================

// Status/Presence
export type UserStatus = 'online' | 'focus' | 'dnd' | 'afk' | 'offline';

// Profile
export type UserProfile = {
  entityId: string;
  displayName: string;
  status: UserStatus;
  statusMessage?: string;
  avatarUrl?: string;
  title?: string; // e.g., "Senior Engineer"
  department?: string;
};

// Organization & Team
export type OrgRole = 'owner' | 'admin' | 'member' | 'guest';

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

// Zones
export type ZoneId = 'lobby' | 'office' | 'meeting-center' | 'lounge-cafe' | 'arcade';

export type Zone = {
  id: ZoneId;
  name: string;
  description?: string;
  bounds: { x: number; y: number; width: number; height: number };
  allowedRoles?: OrgRole[]; // If set, only these roles can enter
};

// Meetings
export type MeetingStatus = 'scheduled' | 'in_progress' | 'ended' | 'cancelled';

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

export type MeetingReservation = {
  id: string;
  meetingRoomId: string;
  meetingId: string;
  startTime: number;
  endTime: number;
};

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
export type KanbanColumn = 'todo' | 'doing' | 'done';

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
export type VoteOption = 'yes' | 'no' | 'abstain';

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

// NPCs
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
  | 'quest_giver';

export type NpcState = 'idle' | 'walking' | 'talking' | 'working' | 'break';

export type NpcDefinition = {
  id: string;
  name: string;
  role: NpcRole;
  zone: ZoneId;
  spawnPosition: Vec2;
  dialogue: string[];
  schedule?: Array<{ time: string; state: NpcState; location?: Vec2 }>;
};

// Facilities
export type FacilityType =
  | 'reception_desk'
  | 'gate'
  | 'meeting_door'
  | 'whiteboard'
  | 'voting_kiosk'
  | 'cafe_counter';

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
export type ExtendedChatChannel = 'proximity' | 'global' | 'team' | 'meeting' | 'dm';

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
