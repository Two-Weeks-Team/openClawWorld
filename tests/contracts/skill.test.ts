import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  setupMockFetch,
  createOkResult,
  createErrorResult,
  jsonResponse,
  TestData,
  expectOkResult,
  expectErrorResult,
} from '../helpers/mock-server.js';
import type { MockServer } from '../helpers/mock-server.js';
import type {
  SkillListResponseData,
  SkillInstallResponseData,
  SkillInvokeResponseData,
  SkillDefinition,
  AicResult,
} from '@openclawworld/shared';

const BASE_URL = 'http://localhost:8080/aic/v0.1';

const TEST_SKILL: SkillDefinition = {
  id: 'slow_aura',
  name: 'Slow Aura',
  description: 'Emit an aura that slows nearby targets',
  category: 'social',
  version: '1.0.0',
  emoji: '🐌',
  source: { type: 'builtin' },
  actions: [
    {
      id: 'cast',
      name: 'Cast Slow Aura',
      description: 'Apply a slowing effect to target within range',
      cooldownMs: 5000,
      castTimeMs: 1000,
      rangeUnits: 200,
      effect: {
        id: 'slowed',
        durationMs: 3000,
        statModifiers: { speedMultiplier: 0.5 },
      },
    },
  ],
  triggers: ['slow', 'aura'],
};

async function skillRequest<T>(endpoint: string, body: unknown): Promise<AicResult<T>> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json() as Promise<AicResult<T>>;
}

describe('Skill System Contract Tests', () => {
  let mockServer: MockServer;

  beforeEach(() => {
    mockServer = setupMockFetch();
  });

  afterEach(() => {
    mockServer.reset();
  });

  describe('Skill List Endpoint', () => {
    it('returns available skills', async () => {
      const responseData: SkillListResponseData = {
        skills: [TEST_SKILL],
        serverTsMs: TestData.timestamp(),
      };

      mockServer.setHandler('/skill/list', () => jsonResponse(createOkResult(responseData)));

      const result = await skillRequest<SkillListResponseData>('/skill/list', {
        agentId: 'agt_alice',
        roomId: 'test_room',
      });

      expectOkResult(result);
      expect(result.data.skills).toHaveLength(1);
      expect(result.data.skills[0].id).toBe('slow_aura');
      expect(result.data.skills[0].name).toBe('Slow Aura');
      expect(result.data.skills[0].category).toBe('social');
    });

    it('filters skills by category', async () => {
      const responseData: SkillListResponseData = {
        skills: [TEST_SKILL],
        serverTsMs: TestData.timestamp(),
      };

      mockServer.setHandler('/skill/list', () => jsonResponse(createOkResult(responseData)));

      const result = await skillRequest<SkillListResponseData>('/skill/list', {
        agentId: 'agt_alice',
        roomId: 'test_room',
        category: 'social',
      });

      expectOkResult(result);
      expect(result.data.skills.every(s => s.category === 'social')).toBe(true);
    });

    it('returns error for invalid room', async () => {
      mockServer.setHandler('/skill/list', () =>
        jsonResponse(createErrorResult('not_found', 'Room not found', false), 404)
      );

      const result = await skillRequest<SkillListResponseData>('/skill/list', {
        agentId: 'agt_alice',
        roomId: 'nonexistent_room',
      });

      expectErrorResult(result, 'not_found');
    });
  });

  describe('Skill Install Endpoint', () => {
    it('installs skill successfully', async () => {
      const txId = TestData.txId();
      const responseData: SkillInstallResponseData = {
        skillId: 'slow_aura',
        installed: true,
        alreadyInstalled: false,
        serverTsMs: TestData.timestamp(),
      };

      mockServer.setHandler('/skill/install', () => jsonResponse(createOkResult(responseData)));

      const result = await skillRequest<SkillInstallResponseData>('/skill/install', {
        agentId: 'agt_alice',
        roomId: 'test_room',
        txId,
        skillId: 'slow_aura',
      });

      expectOkResult(result);
      expect(result.data.installed).toBe(true);
      expect(result.data.skillId).toBe('slow_aura');
      expect(result.data.alreadyInstalled).toBe(false);
    });

    it('returns error for non-existent skill', async () => {
      mockServer.setHandler('/skill/install', () =>
        jsonResponse(createErrorResult('not_found', 'Skill not found', false), 404)
      );

      const result = await skillRequest<SkillInstallResponseData>('/skill/install', {
        agentId: 'agt_alice',
        roomId: 'test_room',
        txId: TestData.txId(),
        skillId: 'nonexistent_skill',
      });

      expectErrorResult(result, 'not_found');
    });

    it('returns error when agent not in room', async () => {
      mockServer.setHandler('/skill/install', () =>
        jsonResponse(createErrorResult('agent_not_in_room', 'Agent not in room', false), 404)
      );

      const result = await skillRequest<SkillInstallResponseData>('/skill/install', {
        agentId: 'agt_nonexistent',
        roomId: 'test_room',
        txId: TestData.txId(),
        skillId: 'slow_aura',
      });

      expectErrorResult(result, 'agent_not_in_room');
    });
  });

  describe('Skill Invoke Endpoint', () => {
    it('invokes instant skill successfully', async () => {
      const txId = TestData.txId();
      const responseData: SkillInvokeResponseData = {
        txId,
        outcome: { type: 'ok', message: 'Skill executed successfully' },
        serverTsMs: TestData.timestamp(),
      };

      mockServer.setHandler('/skill/invoke', () => jsonResponse(createOkResult(responseData)));

      const result = await skillRequest<SkillInvokeResponseData>('/skill/invoke', {
        agentId: 'agt_alice',
        roomId: 'test_room',
        txId,
        skillId: 'instant_zap',
        actionId: 'zap',
        targetId: 'agt_bob',
      });

      expectOkResult(result);
      expect(result.data.outcome.type).toBe('ok');
    });

    it('returns pending outcome for cast time skill', async () => {
      const txId = TestData.txId();
      const completionTime = Date.now() + 1000;
      const responseData: SkillInvokeResponseData = {
        txId,
        outcome: {
          type: 'pending',
          message: 'Casting (1000ms)',
          data: { txId, completionTime },
        },
        serverTsMs: TestData.timestamp(),
      };

      mockServer.setHandler('/skill/invoke', () => jsonResponse(createOkResult(responseData)));

      const result = await skillRequest<SkillInvokeResponseData>('/skill/invoke', {
        agentId: 'agt_alice',
        roomId: 'test_room',
        txId,
        skillId: 'slow_aura',
        actionId: 'cast',
        targetId: 'agt_bob',
      });

      expectOkResult(result);
      expect(result.data.outcome.type).toBe('pending');
      expect(result.data.outcome.data?.completionTime).toBeDefined();
    });

    it('returns error when skill on cooldown', async () => {
      mockServer.setHandler('/skill/invoke', () =>
        jsonResponse(createErrorResult('bad_request', 'Cooldown active (3s remaining)', false), 400)
      );

      const result = await skillRequest<SkillInvokeResponseData>('/skill/invoke', {
        agentId: 'agt_alice',
        roomId: 'test_room',
        txId: TestData.txId(),
        skillId: 'slow_aura',
        actionId: 'cast',
        targetId: 'agt_bob',
      });

      expectErrorResult(result, 'bad_request');
      expect(result.error.message).toContain('Cooldown');
    });

    it('returns error when target out of range', async () => {
      mockServer.setHandler('/skill/invoke', () =>
        jsonResponse(createErrorResult('bad_request', 'Target out of range', false), 400)
      );

      const result = await skillRequest<SkillInvokeResponseData>('/skill/invoke', {
        agentId: 'agt_alice',
        roomId: 'test_room',
        txId: TestData.txId(),
        skillId: 'slow_aura',
        actionId: 'cast',
        targetId: 'agt_bob',
      });

      expectErrorResult(result, 'bad_request');
      expect(result.error.message).toContain('out of range');
    });

    it('returns error when skill not installed', async () => {
      mockServer.setHandler('/skill/invoke', () =>
        jsonResponse(createErrorResult('forbidden', 'Skill not installed', false), 403)
      );

      const result = await skillRequest<SkillInvokeResponseData>('/skill/invoke', {
        agentId: 'agt_alice',
        roomId: 'test_room',
        txId: TestData.txId(),
        skillId: 'uninstalled_skill',
        actionId: 'action',
      });

      expectErrorResult(result, 'forbidden');
    });

    it('returns rate_limited error when too many invocations', async () => {
      mockServer.setHandler('/skill/invoke', () =>
        jsonResponse(createErrorResult('rate_limited', 'Rate limit exceeded', true), 429)
      );

      const result = await skillRequest<SkillInvokeResponseData>('/skill/invoke', {
        agentId: 'agt_alice',
        roomId: 'test_room',
        txId: TestData.txId(),
        skillId: 'slow_aura',
        actionId: 'cast',
        targetId: 'agt_bob',
      });

      expectErrorResult(result, 'rate_limited');
      expect(result.error.retryable).toBe(true);
    });

    it('returns error when already casting', async () => {
      mockServer.setHandler('/skill/invoke', () =>
        jsonResponse(createErrorResult('bad_request', 'Already casting', false), 400)
      );

      const result = await skillRequest<SkillInvokeResponseData>('/skill/invoke', {
        agentId: 'agt_alice',
        roomId: 'test_room',
        txId: TestData.txId(),
        skillId: 'slow_aura',
        actionId: 'cast',
        targetId: 'agt_bob',
      });

      expectErrorResult(result, 'bad_request');
      expect(result.error.message).toContain('Already casting');
    });

    it('returns cancelled outcome when cast is interrupted', async () => {
      const txId = TestData.txId();
      const responseData: SkillInvokeResponseData = {
        txId,
        outcome: { type: 'cancelled', message: 'Cast cancelled due to movement' },
        serverTsMs: TestData.timestamp(),
      };

      mockServer.setHandler('/skill/invoke', () => jsonResponse(createOkResult(responseData)));

      const result = await skillRequest<SkillInvokeResponseData>('/skill/invoke', {
        agentId: 'agt_alice',
        roomId: 'test_room',
        txId,
        skillId: 'slow_aura',
        actionId: 'cast',
        targetId: 'agt_bob',
      });

      expectOkResult(result);
      expect(result.data.outcome.type).toBe('cancelled');
      expect(result.data.outcome.message).toContain('movement');
    });
  });

  describe('Error Handling', () => {
    it('handles unauthorized error', async () => {
      mockServer.setHandler('/skill/list', () =>
        jsonResponse(createErrorResult('unauthorized', 'Invalid API key', false), 401)
      );

      const result = await skillRequest<SkillListResponseData>('/skill/list', {
        agentId: 'agt_alice',
        roomId: 'test_room',
      });

      expectErrorResult(result, 'unauthorized');
    });

    it('handles room_not_ready error', async () => {
      mockServer.setHandler('/skill/list', () =>
        jsonResponse(createErrorResult('room_not_ready', 'Room is loading', true), 503)
      );

      const result = await skillRequest<SkillListResponseData>('/skill/list', {
        agentId: 'agt_alice',
        roomId: 'test_room',
      });

      expectErrorResult(result, 'room_not_ready');
      expect(result.error.retryable).toBe(true);
    });

    it('handles internal error', async () => {
      mockServer.setHandler('/skill/list', () =>
        jsonResponse(createErrorResult('internal', 'Server error', true), 500)
      );

      const result = await skillRequest<SkillListResponseData>('/skill/list', {
        agentId: 'agt_alice',
        roomId: 'test_room',
      });

      expectErrorResult(result, 'internal');
    });
  });
});
