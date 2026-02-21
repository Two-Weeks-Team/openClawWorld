import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OpenClawWorldClient } from '@openclawworld/plugin';
import {
  setupMockFetch,
  createOkResult,
  createErrorResult,
  jsonResponse,
  expectOkResult,
  expectErrorResult,
} from '../helpers/mock-server.js';
import type { MockServer } from '../helpers/mock-server.js';
import type { HeartbeatRequest } from '@openclawworld/shared';
import type { HeartbeatResponseData } from '@openclawworld/plugin';

describe('Heartbeat Endpoint Contract Tests', () => {
  let mockServer: MockServer;
  let client: OpenClawWorldClient;

  beforeEach(() => {
    mockServer = setupMockFetch();
    client = new OpenClawWorldClient({
      baseUrl: 'http://localhost:8080/aic/v0.1',
      apiKey: 'test-api-key',
      retryMaxAttempts: 3,
      retryBaseDelayMs: 500,
    });
  });

  afterEach(() => {
    mockServer.reset();
  });

  describe('Valid Requests', () => {
    it('sends heartbeat successfully', async () => {
      const responseData: HeartbeatResponseData = {
        agentId: 'agt_0001',
        serverTsMs: Date.now(),
        timeoutMs: 30000,
        recommendedIntervalMs: 10000,
      };

      mockServer.setHandler('/heartbeat', () => jsonResponse(createOkResult(responseData)));

      const result = await client.heartbeat({
        agentId: 'agt_0001',
        roomId: 'test_room',
      });

      expectOkResult(result);
      expect(result.data.agentId).toBe('agt_0001');
      expect(result.data.serverTsMs).toBeGreaterThan(0);
      expect(result.data.timeoutMs).toBeGreaterThan(0);
      expect(result.data.recommendedIntervalMs).toBeGreaterThan(0);
    });

    it('returns recommended interval less than timeout', async () => {
      const responseData: HeartbeatResponseData = {
        agentId: 'agt_0001',
        serverTsMs: Date.now(),
        timeoutMs: 30000,
        recommendedIntervalMs: 10000,
      };

      mockServer.setHandler('/heartbeat', () => jsonResponse(createOkResult(responseData)));

      const result = await client.heartbeat({
        agentId: 'agt_0001',
        roomId: 'test_room',
      });

      expectOkResult(result);
      expect(result.data.recommendedIntervalMs).toBeLessThan(result.data.timeoutMs);
    });

    it('echoes back the agentId', async () => {
      const agentId = 'agt_special_agent';
      const responseData: HeartbeatResponseData = {
        agentId,
        serverTsMs: Date.now(),
        timeoutMs: 60000,
        recommendedIntervalMs: 15000,
      };

      mockServer.setHandler('/heartbeat', () => jsonResponse(createOkResult(responseData)));

      const result = await client.heartbeat({
        agentId,
        roomId: 'test_room',
      });

      expectOkResult(result);
      expect(result.data.agentId).toBe(agentId);
    });
  });

  describe('Invalid Requests', () => {
    it('rejects request with missing agentId', async () => {
      mockServer.setHandler('/heartbeat', () =>
        jsonResponse(createErrorResult('bad_request', 'Missing agentId', false), 400)
      );

      const result = await client.heartbeat({ roomId: 'test_room' } as HeartbeatRequest);

      expectErrorResult(result, 'bad_request');
    });

    it('rejects request with missing roomId', async () => {
      mockServer.setHandler('/heartbeat', () =>
        jsonResponse(createErrorResult('bad_request', 'Missing roomId', false), 400)
      );

      const result = await client.heartbeat({ agentId: 'agt_0001' } as HeartbeatRequest);

      expectErrorResult(result, 'bad_request');
    });
  });

  describe('Error Responses', () => {
    it('returns not_found error for unregistered agent', async () => {
      mockServer.setHandler('/heartbeat', () =>
        jsonResponse(createErrorResult('not_found', 'Agent not registered', false), 404)
      );

      const result = await client.heartbeat({
        agentId: 'agt_unknown',
        roomId: 'test_room',
      });

      expectErrorResult(result, 'not_found');
    });

    it('returns unauthorized error with invalid token', async () => {
      mockServer.setHandler('/heartbeat', () =>
        jsonResponse(createErrorResult('unauthorized', 'Invalid token', false), 401)
      );

      const result = await client.heartbeat({
        agentId: 'agt_0001',
        roomId: 'test_room',
      });

      expectErrorResult(result, 'unauthorized');
    });

    it('returns internal error on server failure', async () => {
      mockServer.setHandler('/heartbeat', () =>
        jsonResponse(createErrorResult('internal', 'Internal server error', true), 500)
      );

      const result = await client.heartbeat({
        agentId: 'agt_0001',
        roomId: 'test_room',
      });

      expectErrorResult(result, 'internal');
    });
  });

  describe('Response Format Validation', () => {
    it('returns AicResult wrapper with status ok', async () => {
      const responseData: HeartbeatResponseData = {
        agentId: 'agt_0001',
        serverTsMs: Date.now(),
        timeoutMs: 30000,
        recommendedIntervalMs: 10000,
      };

      mockServer.setHandler('/heartbeat', () => jsonResponse(createOkResult(responseData)));

      const result = await client.heartbeat({
        agentId: 'agt_0001',
        roomId: 'test_room',
      });

      expect(result).toHaveProperty('status');
      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data).toHaveProperty('agentId');
        expect(result.data).toHaveProperty('serverTsMs');
        expect(result.data).toHaveProperty('timeoutMs');
        expect(result.data).toHaveProperty('recommendedIntervalMs');
      }
    });

    it('returns AicResult wrapper with status error', async () => {
      mockServer.setHandler('/heartbeat', () =>
        jsonResponse(createErrorResult('not_found', 'Not found', false), 404)
      );

      const result = await client.heartbeat({
        agentId: 'agt_0001',
        roomId: 'test_room',
      });

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error).toHaveProperty('code');
        expect(result.error).toHaveProperty('message');
        expect(result.error).toHaveProperty('retryable');
      }
    });
  });

  describe('Response Data Validation', () => {
    it('serverTsMs is a valid timestamp', async () => {
      const now = Date.now();
      const responseData: HeartbeatResponseData = {
        agentId: 'agt_0001',
        serverTsMs: now,
        timeoutMs: 30000,
        recommendedIntervalMs: 10000,
      };

      mockServer.setHandler('/heartbeat', () => jsonResponse(createOkResult(responseData)));

      const result = await client.heartbeat({
        agentId: 'agt_0001',
        roomId: 'test_room',
      });

      expectOkResult(result);
      expect(result.data.serverTsMs).toBeGreaterThan(0);
      expect(typeof result.data.serverTsMs).toBe('number');
    });

    it('timeoutMs and recommendedIntervalMs are positive numbers', async () => {
      const responseData: HeartbeatResponseData = {
        agentId: 'agt_0001',
        serverTsMs: Date.now(),
        timeoutMs: 30000,
        recommendedIntervalMs: 10000,
      };

      mockServer.setHandler('/heartbeat', () => jsonResponse(createOkResult(responseData)));

      const result = await client.heartbeat({
        agentId: 'agt_0001',
        roomId: 'test_room',
      });

      expectOkResult(result);
      expect(result.data.timeoutMs).toBeGreaterThan(0);
      expect(result.data.recommendedIntervalMs).toBeGreaterThan(0);
    });
  });
});
