/**
 * Memory Types - 3-tier memory system data structures
 */

export type EpisodicRecord = {
  id: string;
  timestamp: number;
  type: EpisodicEventType;
  content: string;
  participants: string[];
  location: { zone: string | null; x: number; y: number };
  importance: number; // 0-10, assigned during reflection
  emotionSnapshot: { valence: number; arousal: number; dominance: number };
  tags: string[];
};

export type EpisodicEventType =
  | 'observation'
  | 'conversation'
  | 'movement'
  | 'interaction'
  | 'zone_change'
  | 'encounter'
  | 'reflection'
  | 'event';

export type SemanticEntry = {
  id: string;
  category: SemanticCategory;
  subject: string;
  content: string;
  confidence: number; // 0-1
  createdAt: number;
  updatedAt: number;
  sources: string[]; // episodic record IDs that informed this
};

export type SemanticCategory =
  | 'world_knowledge'
  | 'social_knowledge'
  | 'self_knowledge'
  | 'belief'
  | 'preference'
  | 'generalization';

export type WorkingMemoryState = {
  currentZone: string | null;
  currentPosition: { x: number; y: number };
  nearbyEntities: Array<{ id: string; name: string; kind: string; distance: number }>;
  nearbyFacilities: Array<{ id: string; type: string; name: string; distance: number }>;
  recentEvents: Array<{ type: string; timestamp: number; summary: string }>;
  pendingMessages: Array<{ from: string; message: string; channel: string; timestamp: number }>;
  activeGoal: string | null;
  lastAction: string | null;
  lastActionResult: string | null;
  ticksSinceLastChange: number;
};

export type ReflectionResult = {
  insights: string[];
  updatedBeliefs: SemanticEntry[];
  relationshipUpdates: Array<{
    entityId: string;
    closenessChange: number;
    trustChange: number;
    reason: string;
  }>;
  newGoal?: string;
  emotionAdjustment?: { valence: number; arousal: number; dominance: number };
};

export type MemorySearchQuery = {
  text?: string;
  participants?: string[];
  types?: EpisodicEventType[];
  timeRange?: { start: number; end: number };
  minImportance?: number;
  limit?: number;
};

export type MemorySearchResult = {
  record: EpisodicRecord;
  score: number; // combined recency + importance + relevance
};
