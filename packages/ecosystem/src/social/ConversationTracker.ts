/**
 * ConversationTracker - Manages multi-turn conversation context
 *
 * Tracks active conversations with other agents/entities.
 */

import type { ConversationState } from '../types/social.types.js';
import type { ConversationContext } from '../types/agent.types.js';

const CONVERSATION_TIMEOUT_MS = 60_000; // 1 minute of silence ends conversation
const MAX_TURNS = 20;

export class ConversationTracker {
  private conversations: Map<string, ConversationState> = new Map();
  agentId: string;
  private readonly agentName: string;

  constructor(agentId: string, agentName: string) {
    this.agentId = agentId;
    this.agentName = agentName;
  }

  /** Record an incoming message */
  receiveMessage(
    fromId: string,
    fromName: string,
    message: string,
    _channel: string
  ): ConversationState {
    let conv = this.conversations.get(fromId);

    if (!conv || this.isExpired(conv)) {
      conv = {
        id: `${this.agentId}-${fromId}-${Date.now()}`,
        partnerId: fromId,
        partnerName: fromName,
        startedAt: Date.now(),
        lastMessageAt: Date.now(),
        turns: [],
        mood: 'neutral',
        turnsSinceMyLastMessage: 0,
      };
      this.conversations.set(fromId, conv);
    }

    conv.turns.push({
      speaker: fromId,
      speakerName: fromName,
      message,
      timestamp: Date.now(),
    });

    conv.lastMessageAt = Date.now();
    conv.turnsSinceMyLastMessage++;

    // Trim old turns
    if (conv.turns.length > MAX_TURNS) {
      conv.turns = conv.turns.slice(-MAX_TURNS);
    }

    return conv;
  }

  /** Record an outgoing message */
  sendMessage(toId: string, toName: string, message: string): void {
    let conv = this.conversations.get(toId);

    if (!conv) {
      conv = {
        id: `${this.agentId}-${toId}-${Date.now()}`,
        partnerId: toId,
        partnerName: toName,
        startedAt: Date.now(),
        lastMessageAt: Date.now(),
        turns: [],
        mood: 'neutral',
        turnsSinceMyLastMessage: 0,
      };
      this.conversations.set(toId, conv);
    }

    conv.turns.push({
      speaker: this.agentId,
      speakerName: this.agentName,
      message,
      timestamp: Date.now(),
    });

    conv.lastMessageAt = Date.now();
    conv.turnsSinceMyLastMessage = 0;

    if (conv.turns.length > MAX_TURNS) {
      conv.turns = conv.turns.slice(-MAX_TURNS);
    }
  }

  /** Get active conversation with a specific entity */
  getConversation(entityId: string): ConversationContext | null {
    const conv = this.conversations.get(entityId);
    if (!conv || this.isExpired(conv)) return null;

    return {
      partnerId: conv.partnerId,
      partnerName: conv.partnerName,
      startedAt: conv.startedAt,
      turns: conv.turns.map(t => ({
        speaker: t.speakerName,
        message: t.message,
        timestamp: t.timestamp,
      })),
      topic: conv.topic,
    };
  }

  /** Get the most active conversation (someone talking to us) */
  getActiveConversation(): ConversationContext | null {
    let most: ConversationState | null = null;

    for (const conv of this.conversations.values()) {
      if (this.isExpired(conv)) continue;
      if (conv.turnsSinceMyLastMessage === 0) continue; // We already replied

      if (!most || conv.lastMessageAt > most.lastMessageAt) {
        most = conv;
      }
    }

    if (!most) return null;

    return {
      partnerId: most.partnerId,
      partnerName: most.partnerName,
      startedAt: most.startedAt,
      turns: most.turns.map(t => ({
        speaker: t.speakerName,
        message: t.message,
        timestamp: t.timestamp,
      })),
      topic: most.topic,
    };
  }

  /** Clean up expired conversations */
  cleanup(): void {
    for (const [id, conv] of this.conversations) {
      if (this.isExpired(conv)) {
        this.conversations.delete(id);
      }
    }
  }

  private isExpired(conv: ConversationState): boolean {
    return Date.now() - conv.lastMessageAt > CONVERSATION_TIMEOUT_MS;
  }
}
