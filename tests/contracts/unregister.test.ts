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
import type {
  UnregisterRequest,
  UnregisterResponseData,
  AicErrorCode,
} from '@openclawworld/shared';

describe('Unregister Endpoint Contract Tests', () => {
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
    it('unregisters agent successfully', async () => {
      const unregisteredAt = Date.now();
      const responseData: UnregisterResponseData = {
        agentId: 'agt_0001',
        unregisteredAt,
      };

      mockServer.setHandler('/unregister', () => jsonResponse(createOkResult(responseData)));

      const result = await client.unregister({
        agentId: 'agt_0001',
        roomId: 'test_room',
      });

      expectOkResult(result);
      expect(result.data.agentId).toBe('agt_0001');
      expect(result.data.unregisteredAt).toBeGreaterThan(0);
    });

    it('returns the agent ID that was unregistered', async () => {
      const agentId = 'agt_specific';
      const responseData: UnregisterResponseData = {
        agentId,
        unregisteredAt: Date.now(),
      };

      mockServer.setHandler('/unregister', () => jsonResponse(createOkResult(responseData)));

      const result = await client.unregister({
        agentId,
        roomId: 'test_room',
      });

      expectOkResult(result);
      expect(result.data.agentId).toBe(agentId);
    });

    it('unregisteredAt is a valid unix timestamp in ms', async () => {
      const before = Date.now();
      const responseData: UnregisterResponseData = {
        agentId: 'agt_0001',
        unregisteredAt: before,
      };

      mockServer.setHandler('/unregister', () => jsonResponse(createOkResult(responseData)));

      const result = await client.unregister({
        agentId: 'agt_0001',
        roomId: 'test_room',
      });

      expectOkResult(result);
      // Unix timestamp in ms should be > year 2020
      expect(result.data.unregisteredAt).toBeGreaterThan(1577836800000);
    });
  });

  describe('Invalid Requests', () => {
    const testInvalidRequest = async (
      invalidInput: Record<string, unknown>,
      expectedCode: AicErrorCode
    ) => {
      mockServer.setHandler('/unregister', () =>
        jsonResponse(createErrorResult(expectedCode, 'Invalid request', false), 400)
      );

      const result = await client.unregister(invalidInput as UnregisterRequest);

      expectErrorResult(result, expectedCode);
    };

    it('rejects request with missing agentId', async () => {
      await testInvalidRequest({ roomId: 'test_room' }, 'bad_request');
    });

    it('rejects request with missing roomId', async () => {
      await testInvalidRequest({ agentId: 'agt_0001' }, 'bad_request');
    });
  });

  describe('Error Responses', () => {
    it('returns not_found error for unknown agent', async () => {
      mockServer.setHandler('/unregister', () =>
        jsonResponse(createErrorResult('not_found', 'Agent not found', false), 404)
      );

      const result = await client.unregister({
        agentId: 'agt_unknown',
        roomId: 'test_room',
      });

      expectErrorResult(result, 'not_found');
    });

    it('returns unauthorized error with invalid token', async () => {
      mockServer.setHandler('/unregister', () =>
        jsonResponse(createErrorResult('unauthorized', 'Unauthorized', false), 401)
      );

      const result = await client.unregister({
        agentId: 'agt_0001',
        roomId: 'test_room',
      });

      expectErrorResult(result, 'unauthorized');
    });

    it('returns internal error on server failure', async () => {
      mockServer.setHandler('/unregister', () =>
        jsonResponse(createErrorResult('internal', 'Internal server error', true), 500)
      );

      const result = await client.unregister({
        agentId: 'agt_0001',
        roomId: 'test_room',
      });

      expectErrorResult(result, 'internal');
    });
  });

  describe('Response Format Validation', () => {
    it('returns AicResult wrapper with status ok', async () => {
      const responseData: UnregisterResponseData = {
        agentId: 'agt_0001',
        unregisteredAt: Date.now(),
      };

      mockServer.setHandler('/unregister', () => jsonResponse(createOkResult(responseData)));

      const result = await client.unregister({
        agentId: 'agt_0001',
        roomId: 'test_room',
      });

      expect(result).toHaveProperty('status');
      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data).toHaveProperty('agentId');
        expect(result.data).toHaveProperty('unregisteredAt');
      }
    });

    it('returns AicResult wrapper with status error', async () => {
      mockServer.setHandler('/unregister', () =>
        jsonResponse(createErrorResult('not_found', 'Agent not found', false), 404)
      );

      const result = await client.unregister({
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
});
