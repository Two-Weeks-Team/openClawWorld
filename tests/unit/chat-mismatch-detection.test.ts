import { describe, it, expect } from 'vitest';

interface ChatMessage {
  from: string;
  message: string;
  timestamp: number;
  channel: string;
}

interface AgentChatData {
  messages: ChatMessage[];
  latestTs: number;
  lastChatObserve?: number;
}

const CHAT_MISMATCH_MAX_OBSERVE_SKEW_MS = 5000;

function detectChatMismatch(
  agentChatData: Map<string, AgentChatData>
): { hasMismatch: boolean; agentIds?: [string, string] } | null {
  const agentsWithHistory = Array.from(agentChatData.entries()).filter(
    ([, data]) => data.latestTs > 0
  );

  if (agentsWithHistory.length < 2) return null;

  const agentIds = agentsWithHistory.map(([id]) => id);
  const latestTimestamps = agentsWithHistory.map(([, data]) => data.latestTs);
  const commonCutoff = Math.min(...latestTimestamps);
  if (commonCutoff === 0 || commonCutoff === Infinity) return null;

  const filteredSets: Map<string, Set<string>> = new Map();
  for (const [agentId] of agentsWithHistory) {
    const data = agentChatData.get(agentId)!;
    const filtered = data.messages
      .filter(m => m.timestamp <= commonCutoff)
      .map(m => `${m.from}:${m.message}`);
    filteredSets.set(agentId, new Set(filtered));
  }

  for (let i = 0; i < agentIds.length; i++) {
    for (let j = i + 1; j < agentIds.length; j++) {
      const data1 = agentChatData.get(agentIds[i])!;
      const data2 = agentChatData.get(agentIds[j])!;
      const observeSkew = Math.abs(
        (data1.lastChatObserve ?? data1.latestTs) - (data2.lastChatObserve ?? data2.latestTs)
      );

      if (observeSkew > CHAT_MISMATCH_MAX_OBSERVE_SKEW_MS) {
        continue;
      }

      const set1 = filteredSets.get(agentIds[i])!;
      const set2 = filteredSets.get(agentIds[j])!;

      const diff1 = Array.from(set1).filter(m => !set2.has(m));
      const diff2 = Array.from(set2).filter(m => !set1.has(m));

      if (diff1.length > 0 || diff2.length > 0) {
        return { hasMismatch: true, agentIds: [agentIds[i], agentIds[j]] };
      }
    }
  }
  return { hasMismatch: false };
}

describe('Chat Mismatch Detection', () => {
  describe('Issue #97: False positive when agent has no chat history', () => {
    it('should return null when only one agent has chat history', () => {
      const agentChatData = new Map<string, AgentChatData>();

      agentChatData.set('agent_a', {
        messages: [{ from: 'user1', message: 'Hello', timestamp: 1000, channel: 'global' }],
        latestTs: 1000,
      });

      agentChatData.set('agent_b', {
        messages: [],
        latestTs: 0,
      });

      const result = detectChatMismatch(agentChatData);
      expect(result).toBeNull();
    });

    it('should return null when all agents have no chat history', () => {
      const agentChatData = new Map<string, AgentChatData>();

      agentChatData.set('agent_a', { messages: [], latestTs: 0 });
      agentChatData.set('agent_b', { messages: [], latestTs: 0 });
      agentChatData.set('agent_c', { messages: [], latestTs: 0 });

      const result = detectChatMismatch(agentChatData);
      expect(result).toBeNull();
    });

    it('should skip agents with latestTs=0 and compare only agents with history', () => {
      const agentChatData = new Map<string, AgentChatData>();
      const sharedMessage = { from: 'user1', message: 'Hello', timestamp: 1000, channel: 'global' };

      agentChatData.set('agent_a', { messages: [sharedMessage], latestTs: 1000 });
      agentChatData.set('agent_b', { messages: [sharedMessage], latestTs: 1000 });
      agentChatData.set('agent_c', { messages: [], latestTs: 0 });

      const result = detectChatMismatch(agentChatData);
      expect(result).not.toBeNull();
      expect(result!.hasMismatch).toBe(false);
    });
  });

  describe('Minimum agent threshold', () => {
    it('should return null when only one agent exists', () => {
      const agentChatData = new Map<string, AgentChatData>();
      agentChatData.set('agent_a', {
        messages: [{ from: 'user1', message: 'Hello', timestamp: 1000, channel: 'global' }],
        latestTs: 1000,
      });

      const result = detectChatMismatch(agentChatData);
      expect(result).toBeNull();
    });

    it('should return null when no agents exist', () => {
      const agentChatData = new Map<string, AgentChatData>();
      const result = detectChatMismatch(agentChatData);
      expect(result).toBeNull();
    });
  });

  describe('Mismatch detection', () => {
    it('should detect mismatch when agents have different messages at same timestamp', () => {
      const agentChatData = new Map<string, AgentChatData>();

      agentChatData.set('agent_a', {
        messages: [
          { from: 'user1', message: 'Hello', timestamp: 1000, channel: 'global' },
          { from: 'user2', message: 'World', timestamp: 1001, channel: 'global' },
        ],
        latestTs: 1001,
      });

      agentChatData.set('agent_b', {
        messages: [
          { from: 'user1', message: 'Hello', timestamp: 1000, channel: 'global' },
          { from: 'user2', message: 'MISSING_MESSAGE', timestamp: 1001, channel: 'global' },
        ],
        latestTs: 1001,
      });

      const result = detectChatMismatch(agentChatData);
      expect(result).not.toBeNull();
      expect(result!.hasMismatch).toBe(true);
      expect(result!.agentIds).toContain('agent_a');
      expect(result!.agentIds).toContain('agent_b');
    });

    it('should not detect mismatch when agents have same messages', () => {
      const agentChatData = new Map<string, AgentChatData>();
      const messages = [
        { from: 'user1', message: 'Hello', timestamp: 1000, channel: 'global' },
        { from: 'user2', message: 'World', timestamp: 1001, channel: 'global' },
      ];

      agentChatData.set('agent_a', { messages: [...messages], latestTs: 1001 });
      agentChatData.set('agent_b', { messages: [...messages], latestTs: 1001 });

      const result = detectChatMismatch(agentChatData);
      expect(result).not.toBeNull();
      expect(result!.hasMismatch).toBe(false);
    });

    it('should use common cutoff timestamp for fair comparison', () => {
      const agentChatData = new Map<string, AgentChatData>();

      agentChatData.set('agent_a', {
        messages: [
          { from: 'user1', message: 'Hello', timestamp: 1000, channel: 'global' },
          { from: 'user2', message: 'World', timestamp: 1001, channel: 'global' },
          { from: 'user3', message: 'Extra', timestamp: 1002, channel: 'global' },
        ],
        latestTs: 1002,
      });

      agentChatData.set('agent_b', {
        messages: [
          { from: 'user1', message: 'Hello', timestamp: 1000, channel: 'global' },
          { from: 'user2', message: 'World', timestamp: 1001, channel: 'global' },
        ],
        latestTs: 1001,
      });

      const result = detectChatMismatch(agentChatData);
      expect(result).not.toBeNull();
      expect(result!.hasMismatch).toBe(false);
    });
  });

  describe('Observe skew guard', () => {
    it('should skip comparison when chatObserve timestamps are too far apart', () => {
      const agentChatData = new Map<string, AgentChatData>();

      agentChatData.set('agent_a', {
        messages: [
          { from: 'user1', message: 'Hello', timestamp: 1000, channel: 'global' },
          { from: 'user2', message: 'World', timestamp: 1001, channel: 'global' },
        ],
        latestTs: 1001,
        lastChatObserve: 1001,
      });

      agentChatData.set('agent_b', {
        messages: [{ from: 'user1', message: 'Different', timestamp: 1000, channel: 'global' }],
        latestTs: 1001,
        lastChatObserve: 7001,
      });

      const result = detectChatMismatch(agentChatData);
      expect(result).not.toBeNull();
      expect(result!.hasMismatch).toBe(false);
    });

    it('should still detect mismatch when observe skew is within threshold', () => {
      const agentChatData = new Map<string, AgentChatData>();

      agentChatData.set('agent_a', {
        messages: [{ from: 'user1', message: 'Hello', timestamp: 1000, channel: 'global' }],
        latestTs: 1000,
        lastChatObserve: 1000,
      });

      agentChatData.set('agent_b', {
        messages: [{ from: 'user1', message: 'Different', timestamp: 1000, channel: 'global' }],
        latestTs: 1000,
        lastChatObserve: 1200,
      });

      const result = detectChatMismatch(agentChatData);
      expect(result).not.toBeNull();
      expect(result!.hasMismatch).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle agents with identical empty histories after filtering', () => {
      const agentChatData = new Map<string, AgentChatData>();

      agentChatData.set('agent_a', { messages: [], latestTs: 1000 });
      agentChatData.set('agent_b', { messages: [], latestTs: 1000 });

      const result = detectChatMismatch(agentChatData);
      expect(result).not.toBeNull();
      expect(result!.hasMismatch).toBe(false);
    });

    it('should correctly compare multiple agents (3+)', () => {
      const agentChatData = new Map<string, AgentChatData>();
      const sharedMessages = [
        { from: 'user1', message: 'Hello', timestamp: 1000, channel: 'global' },
      ];

      agentChatData.set('agent_a', { messages: [...sharedMessages], latestTs: 1000 });
      agentChatData.set('agent_b', { messages: [...sharedMessages], latestTs: 1000 });
      agentChatData.set('agent_c', { messages: [...sharedMessages], latestTs: 1000 });
      agentChatData.set('agent_d', { messages: [], latestTs: 0 });

      const result = detectChatMismatch(agentChatData);
      expect(result).not.toBeNull();
      expect(result!.hasMismatch).toBe(false);
    });

    it('should detect mismatch in 3+ agents when one differs', () => {
      const agentChatData = new Map<string, AgentChatData>();
      const sharedMessages = [
        { from: 'user1', message: 'Hello', timestamp: 1000, channel: 'global' },
      ];

      agentChatData.set('agent_a', { messages: [...sharedMessages], latestTs: 1000 });
      agentChatData.set('agent_b', { messages: [...sharedMessages], latestTs: 1000 });
      agentChatData.set('agent_c', {
        messages: [{ from: 'user1', message: 'Different', timestamp: 1000, channel: 'global' }],
        latestTs: 1000,
      });

      const result = detectChatMismatch(agentChatData);
      expect(result).not.toBeNull();
      expect(result!.hasMismatch).toBe(true);
    });
  });
});
