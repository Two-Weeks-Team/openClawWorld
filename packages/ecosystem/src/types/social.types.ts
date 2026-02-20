/**
 * Social Types - Relationship and social interaction data structures
 */

import type { RelationshipCategory } from './agent.types.js';

export type Relationship = {
  entityId: string;
  entityName: string;
  closeness: number; // -1 to 1
  trust: number; // -1 to 1
  familiarity: number; // interaction count
  category: RelationshipCategory;
  impressions: string[]; // adjectives/observations about this entity
  lastInteraction: number;
  firstMet: number;
  interactionLog: InteractionSummary[];
};

export type InteractionSummary = {
  timestamp: number;
  type: 'conversation' | 'encounter' | 'collaboration' | 'conflict' | 'observation';
  summary: string;
  closenessChange: number;
  trustChange: number;
};

export type ConversationState = {
  id: string;
  partnerId: string;
  partnerName: string;
  startedAt: number;
  lastMessageAt: number;
  turns: Array<{
    speaker: string;
    speakerName: string;
    message: string;
    timestamp: number;
  }>;
  topic?: string;
  mood: 'positive' | 'neutral' | 'negative' | 'tense';
  turnsSinceMyLastMessage: number;
};

export type SocialPerceptionEntry = {
  entityId: string;
  entityName: string;
  firstImpression: string;
  currentImpression: string;
  perceivedTraits: string[];
  perceivedMood: string;
  lastUpdated: number;
};

export type RelationshipGraph = {
  relationships: Map<string, Relationship>;
  perceptions: Map<string, SocialPerceptionEntry>;
};
