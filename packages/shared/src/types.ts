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
  | 'chat.message'
  | 'object.state_changed';

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

export type TypedEvent =
  | PresenceJoinEvent
  | PresenceLeaveEvent
  | ProximityEnterEvent
  | ProximityExitEvent
  | ChatMessageEvent
  | ObjectStateChangedEvent;

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
