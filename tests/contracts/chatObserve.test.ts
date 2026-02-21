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
  ChatObserveRequest,
  ChatObserveResponseData,
  ChatMessage,
  AicErrorCode,
} from '@openclawworld/shared';

describe('ChatObserve Endpoint Contract Tests', () => {
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
    it('returns chat messages for given window', async () => {
      const message: ChatMessage = {
        id: 'msg_001',
        roomId: 'test_room',
        channel: 'proximity',
        fromEntityId: 'agt_sender',
        fromName: 'Sender Agent',
        message: 'Hello, world!',
        sentAt: Date.now(),
      };
      const responseData: ChatObserveResponseData = {
        messages: [message],
        serverTsMs: Date.now(),
      };

      mockServer.setHandler('/chatObserve', () => jsonResponse(createOkResult(responseData)));

      const result = await client.chatObserve({
        agentId: 'agt_0001',
        roomId: 'test_room',
        windowSec: 60,
      });

      expectOkResult(result);
      expect(result.data.messages).toHaveLength(1);
      expect(result.data.messages[0].message).toBe('Hello, world!');
    });

    it('returns empty messages when no chat in window', async () => {
      const responseData: ChatObserveResponseData = {
        messages: [],
        serverTsMs: Date.now(),
      };

      mockServer.setHandler('/chatObserve', () => jsonResponse(createOkResult(responseData)));

      const result = await client.chatObserve({
        agentId: 'agt_0001',
        roomId: 'test_room',
        windowSec: 30,
      });

      expectOkResult(result);
      expect(result.data.messages).toHaveLength(0);
    });

    it('accepts optional channel filter', async () => {
      const responseData: ChatObserveResponseData = {
        messages: [],
        serverTsMs: Date.now(),
      };

      mockServer.setHandler('/chatObserve', () => jsonResponse(createOkResult(responseData)));

      const result = await client.chatObserve({
        agentId: 'agt_0001',
        roomId: 'test_room',
        windowSec: 60,
        channel: 'global',
      });

      expectOkResult(result);
    });

    it('returns messages with all required fields', async () => {
      const message: ChatMessage = {
        id: 'msg_001',
        roomId: 'test_room',
        channel: 'proximity',
        fromEntityId: 'agt_0002',
        fromName: 'Agent Two',
        message: 'Test message',
        sentAt: 1700000000000,
      };
      const responseData: ChatObserveResponseData = {
        messages: [message],
        serverTsMs: Date.now(),
      };

      mockServer.setHandler('/chatObserve', () => jsonResponse(createOkResult(responseData)));

      const result = await client.chatObserve({
        agentId: 'agt_0001',
        roomId: 'test_room',
        windowSec: 60,
      });

      expectOkResult(result);
      const msg = result.data.messages[0];
      expect(msg).toHaveProperty('id');
      expect(msg).toHaveProperty('roomId');
      expect(msg).toHaveProperty('channel');
      expect(msg).toHaveProperty('fromEntityId');
      expect(msg).toHaveProperty('fromName');
      expect(msg).toHaveProperty('message');
      expect(msg).toHaveProperty('sentAt');
    });
  });

  describe('Invalid Requests', () => {
    const testInvalidRequest = async (
      invalidInput: Record<string, unknown>,
      expectedCode: AicErrorCode
    ) => {
      mockServer.setHandler('/chatObserve', () =>
        jsonResponse(createErrorResult(expectedCode, 'Invalid request', false), 400)
      );

      const result = await client.chatObserve(invalidInput as ChatObserveRequest);

      expectErrorResult(result, expectedCode);
    };

    it('rejects request with missing agentId', async () => {
      await testInvalidRequest({ roomId: 'test_room', windowSec: 60 }, 'bad_request');
    });

    it('rejects request with missing roomId', async () => {
      await testInvalidRequest({ agentId: 'agt_0001', windowSec: 60 }, 'bad_request');
    });

    it('rejects request with missing windowSec', async () => {
      await testInvalidRequest({ agentId: 'agt_0001', roomId: 'test_room' }, 'bad_request');
    });
  });

  describe('Error Responses', () => {
    it('returns not_found error for unknown agent', async () => {
      mockServer.setHandler('/chatObserve', () =>
        jsonResponse(createErrorResult('not_found', 'Agent not found', false), 404)
      );

      const result = await client.chatObserve({
        agentId: 'agt_unknown',
        roomId: 'test_room',
        windowSec: 60,
      });

      expectErrorResult(result, 'not_found');
    });

    it('returns internal error on server failure', async () => {
      mockServer.setHandler('/chatObserve', () =>
        jsonResponse(createErrorResult('internal', 'Internal server error', true), 500)
      );

      const result = await client.chatObserve({
        agentId: 'agt_0001',
        roomId: 'test_room',
        windowSec: 60,
      });

      expectErrorResult(result, 'internal');
    });
  });

  describe('Response Format Validation', () => {
    it('returns AicResult wrapper with status ok', async () => {
      const responseData: ChatObserveResponseData = {
        messages: [],
        serverTsMs: Date.now(),
      };

      mockServer.setHandler('/chatObserve', () => jsonResponse(createOkResult(responseData)));

      const result = await client.chatObserve({
        agentId: 'agt_0001',
        roomId: 'test_room',
        windowSec: 60,
      });

      expect(result).toHaveProperty('status');
      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data).toHaveProperty('messages');
        expect(result.data).toHaveProperty('serverTsMs');
        expect(Array.isArray(result.data.messages)).toBe(true);
      }
    });

    it('serverTsMs is a valid timestamp', async () => {
      const now = Date.now();
      const responseData: ChatObserveResponseData = {
        messages: [],
        serverTsMs: now,
      };

      mockServer.setHandler('/chatObserve', () => jsonResponse(createOkResult(responseData)));

      const result = await client.chatObserve({
        agentId: 'agt_0001',
        roomId: 'test_room',
        windowSec: 60,
      });

      expectOkResult(result);
      expect(result.data.serverTsMs).toBeGreaterThan(0);
      expect(typeof result.data.serverTsMs).toBe('number');
    });
  });
});
