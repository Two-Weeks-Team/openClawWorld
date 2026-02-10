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
import type { RegisterResponseData, AicErrorCode } from '@openclawworld/shared';

describe('Register Endpoint Contract Tests', () => {
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
    it('accepts valid registration request', async () => {
      const responseData: RegisterResponseData = {
        agentId: 'agt_0001',
        roomId: 'test_room',
        sessionToken: 'tok_abc123_xyz789',
      };

      mockServer.setHandler('/register', () => jsonResponse(createOkResult(responseData)));

      const result = await client.register({
        name: 'Test Agent',
        roomId: 'test_room',
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.agentId).toMatch(/^agt_/);
        expect(result.data.roomId).toBe('test_room');
        expect(result.data.sessionToken).toBeDefined();
        expect(result.data.sessionToken.length).toBeGreaterThanOrEqual(8);
      }
    });

    it('returns different agentIds for multiple registrations', async () => {
      const responseData1: RegisterResponseData = {
        agentId: 'agt_0001',
        roomId: 'test_room',
        sessionToken: 'tok_abc123',
      };

      const responseData2: RegisterResponseData = {
        agentId: 'agt_0002',
        roomId: 'test_room',
        sessionToken: 'tok_def456',
      };

      let callCount = 0;
      mockServer.setHandler('/register', () => {
        callCount++;
        if (callCount === 1) {
          return jsonResponse(createOkResult(responseData1));
        }
        return jsonResponse(createOkResult(responseData2));
      });

      const result1 = await client.register({
        name: 'Agent One',
        roomId: 'test_room',
      });

      const result2 = await client.register({
        name: 'Agent Two',
        roomId: 'test_room',
      });

      expectOkResult(result1);
      expectOkResult(result2);

      if (result1.status === 'ok' && result2.status === 'ok') {
        expect(result1.data.agentId).not.toBe(result2.data.agentId);
      }
    });

    it('accepts name with special characters', async () => {
      const responseData: RegisterResponseData = {
        agentId: 'agt_0001',
        roomId: 'test_room',
        sessionToken: 'tok_abc123',
      };

      mockServer.setHandler('/register', () => jsonResponse(createOkResult(responseData)));

      const result = await client.register({
        name: 'Test Agent @#$%',
        roomId: 'test_room',
      });

      expect(result.status).toBe('ok');
    });
  });

  describe('Invalid Requests', () => {
    const testInvalidRequest = async (
      invalidInput: Record<string, unknown>,
      expectedCode: AicErrorCode
    ) => {
      mockServer.setHandler('/register', () => {
        return jsonResponse(createErrorResult(expectedCode, 'Invalid request', false), 400);
      });

      const result = await client.register(invalidInput as Parameters<typeof client.register>[0]);

      expectErrorResult(result, expectedCode);
    };

    it('rejects request with missing name', async () => {
      await testInvalidRequest({ roomId: 'test_room' }, 'bad_request');
    });

    it('rejects request with missing roomId', async () => {
      await testInvalidRequest({ name: 'Test Agent' }, 'bad_request');
    });

    it('rejects request with empty name', async () => {
      await testInvalidRequest({ name: '', roomId: 'test_room' }, 'bad_request');
    });

    it('rejects request with name too long', async () => {
      const longName = 'a'.repeat(65);
      await testInvalidRequest({ name: longName, roomId: 'test_room' }, 'bad_request');
    });

    it('rejects request with invalid roomId format', async () => {
      await testInvalidRequest({ name: 'Test Agent', roomId: 'invalid room!' }, 'bad_request');
    });
  });

  describe('Error Responses', () => {
    const testErrorResponse = async (
      errorCode: AicErrorCode,
      message: string,
      retryable: boolean
    ) => {
      mockServer.setHandler('/register', () =>
        jsonResponse(createErrorResult(errorCode, message, retryable), 400)
      );

      const result = await client.register({
        name: 'Test Agent',
        roomId: 'test_room',
      });

      expectErrorResult(result, errorCode);
    };

    it('returns not_found error for non-existent room', async () => {
      await testErrorResponse('not_found', 'Room not found', false);
    });

    it('returns room_not_ready error when room is initializing', async () => {
      await testErrorResponse('room_not_ready', 'Room not ready', true);
    });

    it('returns rate_limited error when too many registrations', async () => {
      await testErrorResponse('rate_limited', 'Rate limit exceeded', true);
    });

    it('returns internal error on server failure', async () => {
      await testErrorResponse('internal', 'Internal server error', true);
    });
  });

  describe('Response Format Validation', () => {
    it('returns AicResult wrapper with status ok', async () => {
      const responseData: RegisterResponseData = {
        agentId: 'agt_0001',
        roomId: 'test_room',
        sessionToken: 'tok_abc123',
      };

      mockServer.setHandler('/register', () => jsonResponse(createOkResult(responseData)));

      const result = await client.register({
        name: 'Test Agent',
        roomId: 'test_room',
      });

      expect(result).toHaveProperty('status');
      expect(result.status).toBe('ok');
      expect(result).toHaveProperty('data');
      if (result.status === 'ok') {
        expect(result.data).toHaveProperty('agentId');
        expect(result.data).toHaveProperty('roomId');
        expect(result.data).toHaveProperty('sessionToken');
      }
    });

    it('returns AicResult wrapper with status error', async () => {
      mockServer.setHandler('/register', () =>
        jsonResponse(createErrorResult('bad_request', 'Invalid request', false), 400)
      );

      const result = await client.register({
        name: 'Test Agent',
        roomId: 'test_room',
      });

      expect(result).toHaveProperty('status');
      expect(result.status).toBe('error');
      expect(result).toHaveProperty('error');
      if (result.status === 'error') {
        expect(result.error).toHaveProperty('code');
        expect(result.error).toHaveProperty('message');
        expect(result.error).toHaveProperty('retryable');
      }
    });
  });

  describe('Response Data Validation', () => {
    it('returns valid agentId format', async () => {
      const responseData: RegisterResponseData = {
        agentId: 'agt_0001',
        roomId: 'test_room',
        sessionToken: 'tok_abc123',
      };

      mockServer.setHandler('/register', () => jsonResponse(createOkResult(responseData)));

      const result = await client.register({
        name: 'Test Agent',
        roomId: 'test_room',
      });

      expectOkResult(result);
      if (result.status === 'ok') {
        expect(result.data.agentId).toMatch(/^(hum|agt|obj)_[a-zA-Z0-9._-]{1,64}$/);
      }
    });

    it('returns valid roomId format', async () => {
      const responseData: RegisterResponseData = {
        agentId: 'agt_0001',
        roomId: 'test_room',
        sessionToken: 'tok_abc123',
      };

      mockServer.setHandler('/register', () => jsonResponse(createOkResult(responseData)));

      const result = await client.register({
        name: 'Test Agent',
        roomId: 'test_room',
      });

      expectOkResult(result);
      if (result.status === 'ok') {
        expect(result.data.roomId).toMatch(/^[a-zA-Z0-9._-]{1,64}$/);
      }
    });

    it('returns valid sessionToken format', async () => {
      const responseData: RegisterResponseData = {
        agentId: 'agt_0001',
        roomId: 'test_room',
        sessionToken: 'tok_abc123_xyz789',
      };

      mockServer.setHandler('/register', () => jsonResponse(createOkResult(responseData)));

      const result = await client.register({
        name: 'Test Agent',
        roomId: 'test_room',
      });

      expectOkResult(result);
      if (result.status === 'ok') {
        expect(result.data.sessionToken).toMatch(/^[a-zA-Z0-9._-]{8,256}$/);
      }
    });
  });
});
