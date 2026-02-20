/**
 * Agent Types - Core agent data structures
 */

export type AgentId = string;

export type AgentStatus = 'initializing' | 'running' | 'paused' | 'dead' | 'restarting';

export type AgentAction =
  | { type: 'idle' }
  | { type: 'moveTo'; dest: { tx: number; ty: number }; reason: string }
  | { type: 'chat'; channel: 'proximity' | 'global'; message: string; targetName?: string }
  | { type: 'interact'; targetId: string; action: string; params?: Record<string, unknown> }
  | { type: 'reflect' }
  | { type: 'observe'; reason: string };

export type AgentDecision = {
  action: AgentAction;
  thought: string;
  emotionDelta: { valence: number; arousal: number; dominance: number };
  memoryNote?: string;
  importance: number; // 0-10
};

export type AgentConfig = {
  id: string;
  name: string;
  personality: PersonalityTraits;
  initialZone: string;
  preferredZones: string[];
  backstory: string;
  speakingStyle: string;
  quirks: string[];
};

export type PersonalityTraits = {
  openness: number; // 0-1
  conscientiousness: number; // 0-1
  extraversion: number; // 0-1
  agreeableness: number; // 0-1
  neuroticism: number; // 0-1
};

export type TickContext = {
  tickNumber: number;
  timestamp: number;
  self: {
    id: string;
    name: string;
    position: { x: number; y: number };
    tile: { tx: number; ty: number };
    zone: string | null;
    facing: string;
  };
  nearby: NearbyEntity[];
  facilities: NearbyFacility[];
  recentEvents: GameEvent[];
  recentMessages: ChatMessageRecord[];
  relevantMemories: MemoryEntry[];
  currentEmotion: EmotionState;
  currentNeeds: NeedsState;
  relationships: RelationshipSummary[];
  activeConversation: ConversationContext | null;
};

export type NearbyEntity = {
  id: string;
  name: string;
  kind: 'human' | 'agent' | 'npc' | 'object';
  distance: number;
  position: { x: number; y: number };
  affordances: string[];
};

export type NearbyFacility = {
  id: string;
  type: string;
  name: string;
  distance: number;
  affordances: string[];
};

export type GameEvent = {
  type: string;
  timestamp: number;
  payload: Record<string, unknown>;
};

export type ChatMessageRecord = {
  from: string;
  fromName: string;
  message: string;
  channel: string;
  timestamp: number;
};

export type MemoryEntry = {
  id: string;
  type: 'episodic' | 'semantic';
  content: string;
  timestamp: number;
  importance: number;
  participants?: string[];
  tags?: string[];
  score?: number; // computed retrieval score
};

export type EmotionState = {
  valence: number; // -1 to 1
  arousal: number; // 0 to 1
  dominance: number; // 0 to 1
  label: string; // e.g., "happy", "anxious", "calm"
};

export type NeedsState = {
  physiological: number; // 0-1 (0 = depleted, 1 = satisfied)
  safety: number;
  belonging: number;
  esteem: number;
  selfActualization: number;
};

export type RelationshipSummary = {
  entityId: string;
  entityName: string;
  closeness: number; // -1 to 1
  trust: number; // -1 to 1
  category: RelationshipCategory;
  lastInteraction: number;
};

export type RelationshipCategory =
  | 'stranger'
  | 'acquaintance'
  | 'friend'
  | 'close_friend'
  | 'rival'
  | 'enemy';

export type ConversationContext = {
  partnerId: string;
  partnerName: string;
  startedAt: number;
  turns: ConversationTurn[];
  topic?: string;
};

export type ConversationTurn = {
  speaker: string;
  message: string;
  timestamp: number;
};

export type HeartbeatMessage = {
  agentId: string;
  status: AgentStatus;
  tickNumber: number;
  timestamp: number;
  position?: { x: number; y: number };
  zone?: string | null;
  error?: string;
};
