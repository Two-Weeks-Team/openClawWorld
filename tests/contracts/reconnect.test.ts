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
import type { ReconnectRequest, ReconnectResponseData, AicErrorCode } from '@openclawworld/shared';

describe('Reconnect Endpoint Contract Tests', () => {
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
    it('reconnects with valid agentId and sessionToken', async () => {
      const responseData: ReconnectResponseData = {
        agentId: 'agt_0001',
        roomId: 'test_room',
        sessionToken: 'tok_abc123_xyz789',
        pos: { x: 100, y: 200 },
      };

      mockServer.setHandler('/reconnect', () => jsonResponse(createOkResult(responseData)));

      const result = await client.reconnect({
        agentId: 'agt_0001',
        sessionToken: 'tok_abc123_xyz789',
      });

      expectOkResult(result);
      expect(result.data.agentId).toBe('agt_0001');
      expect(result.data.roomId).toBe('test_room');
      expect(result.data.sessionToken).toBeDefined();
      expect(result.data.pos).toHaveProperty('x');
      expect(result.data.pos).toHaveProperty('y');
    });

    it('reconnects and returns position without tile (lite mode)', async () => {
      const responseData: ReconnectResponseData = {
        agentId: 'agt_0001',
        roomId: 'test_room',
        sessionToken: 'tok_new123',
        pos: { x: 150, y: 250 },
      };

      mockServer.setHandler('/reconnect', () => jsonResponse(createOkResult(responseData)));

      const result = await client.reconnect({
        agentId: 'agt_0001',
        sessionToken: 'tok_old456',
      });

      expectOkResult(result);
      expect(result.data.tile).toBeUndefined();
    });

    it('reconnects and returns position with tile coordinates', async () => {
      const responseData: ReconnectResponseData = {
        agentId: 'agt_0001',
        roomId: 'test_room',
        sessionToken: 'tok_new123',
        pos: { x: 150, y: 250 },
        tile: { tx: 15, ty: 25 },
      };

      mockServer.setHandler('/reconnect', () => jsonResponse(createOkResult(responseData)));

      const result = await client.reconnect({
        agentId: 'agt_0001',
        sessionToken: 'tok_old456',
      });

      expectOkResult(result);
      expect(result.data.tile).toBeDefined();
      expect(result.data.tile?.tx).toBe(15);
      expect(result.data.tile?.ty).toBe(25);
    });
  });

  describe('Invalid Requests', () => {
    const testInvalidRequest = async (
      invalidInput: Record<string, unknown>,
      expectedCode: AicErrorCode
    ) => {
      mockServer.setHandler('/reconnect', () =>
        jsonResponse(createErrorResult(expectedCode, 'Invalid request', false), 400)
      );

      const result = await client.reconnect(invalidInput as ReconnectRequest);

      expectErrorResult(result, expectedCode);
    };

    it('rejects request with missing agentId', async () => {
      await testInvalidRequest({ sessionToken: 'tok_abc123' }, 'bad_request');
    });

    it('rejects request with missing sessionToken', async () => {
      await testInvalidRequest({ agentId: 'agt_0001' }, 'bad_request');
    });
  });

  describe('Error Responses', () => {
    it('returns unauthorized error for expired token', async () => {
      mockServer.setHandler('/reconnect', () =>
        jsonResponse(createErrorResult('unauthorized', 'Session token expired', false), 401)
      );

      const result = await client.reconnect({
        agentId: 'agt_0001',
        sessionToken: 'tok_expired',
      });

      expectErrorResult(result, 'unauthorized');
    });

    it('returns not_found error for unknown agent', async () => {
      mockServer.setHandler('/reconnect', () =>
        jsonResponse(createErrorResult('not_found', 'Agent not found', false), 404)
      );

      const result = await client.reconnect({
        agentId: 'agt_unknown',
        sessionToken: 'tok_abc123',
      });

      expectErrorResult(result, 'not_found');
    });

    it('returns internal error on server failure', async () => {
      mockServer.setHandler('/reconnect', () =>
        jsonResponse(createErrorResult('internal', 'Internal server error', true), 500)
      );

      const result = await client.reconnect({
        agentId: 'agt_0001',
        sessionToken: 'tok_abc123',
      });

      expectErrorResult(result, 'internal');
    });
  });

  describe('Response Format Validation', () => {
    it('returns AicResult wrapper with status ok', async () => {
      const responseData: ReconnectResponseData = {
        agentId: 'agt_0001',
        roomId: 'test_room',
        sessionToken: 'tok_abc123',
        pos: { x: 100, y: 100 },
      };

      mockServer.setHandler('/reconnect', () => jsonResponse(createOkResult(responseData)));

      const result = await client.reconnect({
        agentId: 'agt_0001',
        sessionToken: 'tok_abc123',
      });

      expect(result).toHaveProperty('status');
      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data).toHaveProperty('agentId');
        expect(result.data).toHaveProperty('roomId');
        expect(result.data).toHaveProperty('sessionToken');
        expect(result.data).toHaveProperty('pos');
      }
    });

    it('returns AicResult wrapper with status error', async () => {
      mockServer.setHandler('/reconnect', () =>
        jsonResponse(createErrorResult('unauthorized', 'Unauthorized', false), 401)
      );

      const result = await client.reconnect({
        agentId: 'agt_0001',
        sessionToken: 'tok_bad',
      });

      expect(result).toHaveProperty('status');
      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error).toHaveProperty('code');
        expect(result.error).toHaveProperty('message');
        expect(result.error).toHaveProperty('retryable');
      }
    });
  });

  describe('Response Data Validation', () => {
    it('returns valid agentId format', async () => {
      const responseData: ReconnectResponseData = {
        agentId: 'agt_0001',
        roomId: 'test_room',
        sessionToken: 'tok_abc123',
        pos: { x: 100, y: 100 },
      };

      mockServer.setHandler('/reconnect', () => jsonResponse(createOkResult(responseData)));

      const result = await client.reconnect({
        agentId: 'agt_0001',
        sessionToken: 'tok_abc123',
      });

      expectOkResult(result);
      expect(result.data.agentId).toMatch(/^(hum|agt|obj)_[a-zA-Z0-9._-]{1,64}$/);
    });

    it('pos contains numeric x and y coordinates', async () => {
      const responseData: ReconnectResponseData = {
        agentId: 'agt_0001',
        roomId: 'test_room',
        sessionToken: 'tok_abc123',
        pos: { x: 100.5, y: 200.5 },
      };

      mockServer.setHandler('/reconnect', () => jsonResponse(createOkResult(responseData)));

      const result = await client.reconnect({
        agentId: 'agt_0001',
        sessionToken: 'tok_abc123',
      });

      expectOkResult(result);
      expect(typeof result.data.pos.x).toBe('number');
      expect(typeof result.data.pos.y).toBe('number');
    });
  });
});
