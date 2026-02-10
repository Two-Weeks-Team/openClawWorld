import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OpenClawWorldClient } from '@openclawworld/plugin';
import {
  setupMockFetch,
  createOkResult,
  createErrorResult,
  jsonResponse,
  TestData,
} from '../helpers/mock-server.js';
import type { MockServer } from '../helpers/mock-server.js';
import type { ChatSendResponseData, AicErrorCode } from '@openclawworld/shared';

describe('ChatSend Endpoint Contract Tests', () => {
  let mockServer: MockServer;
  let client: OpenClawWorldClient;

  beforeEach(() => {
    mockServer = setupMockFetch();
    client = new OpenClawWorldClient({
      baseUrl: 'http://localhost:8080/aic/v0.1',
      apiKey: 'test-api-key',
    });
  });

  afterEach(() => {
    mockServer.reset();
  });

  describe('Valid Requests', () => {
    it('accepts valid proximity chat request', async () => {
      const txId = TestData.txId();
      const responseData: ChatSendResponseData = {
        txId,
        applied: true,
        serverTsMs: TestData.timestamp(),
        chatMessageId: 'msg_abc123',
      };

      mockServer.setHandler('/chatSend', () => jsonResponse(createOkResult(responseData)));

      const result = await client.chatSend({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId,
        channel: 'proximity',
        message: 'Hello everyone!',
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.txId).toBe(txId);
        expect(result.data.applied).toBe(true);
        expect(result.data.chatMessageId).toBe('msg_abc123');
      }
    });

    it('accepts valid global chat request', async () => {
      const txId = TestData.txId();
      const responseData: ChatSendResponseData = {
        txId,
        applied: true,
        serverTsMs: TestData.timestamp(),
        chatMessageId: 'msg_def456',
      };

      mockServer.setHandler('/chatSend', () => jsonResponse(createOkResult(responseData)));

      const result = await client.chatSend({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId,
        channel: 'global',
        message: 'Global announcement!',
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.chatMessageId).toBe('msg_def456');
      }
    });

    it('accepts message at maximum length', async () => {
      const txId = TestData.txId();
      const responseData: ChatSendResponseData = {
        txId,
        applied: true,
        serverTsMs: TestData.timestamp(),
        chatMessageId: 'msg_long123',
      };

      mockServer.setHandler('/chatSend', () => jsonResponse(createOkResult(responseData)));

      const result = await client.chatSend({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId,
        channel: 'proximity',
        message: 'a'.repeat(500),
      });

      expect(result.status).toBe('ok');
    });
  });

  describe('Idempotency', () => {
    it('returns same result for same txId', async () => {
      const txId = TestData.txId();

      mockServer.setHandler('/chatSend', () =>
        jsonResponse(
          createOkResult({
            txId,
            applied: true,
            serverTsMs: TestData.timestamp(),
            chatMessageId: 'msg_same123',
          })
        )
      );

      const result1 = await client.chatSend({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId,
        channel: 'proximity',
        message: 'Hello!',
      });

      const result2 = await client.chatSend({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId,
        channel: 'proximity',
        message: 'Hello!',
      });

      expect(result1.status).toBe('ok');
      expect(result2.status).toBe('ok');
      if (result1.status === 'ok' && result2.status === 'ok') {
        expect(result1.data.chatMessageId).toBe(result2.data.chatMessageId);
      }
    });
  });

  describe('Invalid Requests', () => {
    const testInvalidRequest = async (
      invalidInput: Record<string, unknown>,
      expectedCode: AicErrorCode
    ) => {
      mockServer.setHandler('/chatSend', () =>
        jsonResponse(createErrorResult(expectedCode, 'Invalid request', false), 400)
      );

      const result = await client.chatSend(invalidInput as Parameters<typeof client.chatSend>[0]);

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.code).toBe(expectedCode);
      }
    };

    it('rejects request with missing message', async () => {
      await testInvalidRequest(
        {
          agentId: 'test_agent',
          roomId: 'test_room',
          txId: TestData.txId(),
          channel: 'proximity',
        },
        'bad_request'
      );
    });

    it('rejects request with empty message', async () => {
      await testInvalidRequest(
        {
          agentId: 'test_agent',
          roomId: 'test_room',
          txId: TestData.txId(),
          channel: 'proximity',
          message: '',
        },
        'bad_request'
      );
    });

    it('rejects request with message too long', async () => {
      await testInvalidRequest(
        {
          agentId: 'test_agent',
          roomId: 'test_room',
          txId: TestData.txId(),
          channel: 'proximity',
          message: 'a'.repeat(501),
        },
        'bad_request'
      );
    });

    it('rejects request with invalid channel', async () => {
      await testInvalidRequest(
        {
          agentId: 'test_agent',
          roomId: 'test_room',
          txId: TestData.txId(),
          channel: 'invalid',
          message: 'Hello!',
        },
        'bad_request'
      );
    });
  });

  describe('Error Responses', () => {
    const testErrorResponse = async (errorCode: AicErrorCode) => {
      mockServer.setHandler('/chatSend', () =>
        jsonResponse(createErrorResult(errorCode, 'Error', false), 400)
      );

      const result = await client.chatSend({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId: TestData.txId(),
        channel: 'proximity',
        message: 'Hello!',
      });

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.code).toBe(errorCode);
      }
    };

    it('returns rate_limited when sending too many messages', async () => {
      mockServer.setHandler('/chatSend', () =>
        jsonResponse(createErrorResult('rate_limited', 'Too many messages', true), 429)
      );

      const result = await client.chatSend({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId: TestData.txId(),
        channel: 'proximity',
        message: 'Hello!',
      });

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.code).toBe('rate_limited');
        expect(result.error.retryable).toBe(true);
      }
    });

    it('returns agent_not_in_room when agent not joined', async () => {
      await testErrorResponse('agent_not_in_room');
    });

    it('returns forbidden for muted agent', async () => {
      await testErrorResponse('forbidden');
    });
  });

  describe('Response Format Validation', () => {
    it('returns AicResult wrapper with status ok', async () => {
      mockServer.setHandler('/chatSend', () =>
        jsonResponse(
          createOkResult({
            txId: TestData.txId(),
            applied: true,
            serverTsMs: TestData.timestamp(),
            chatMessageId: 'msg_test123',
          })
        )
      );

      const result = await client.chatSend({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId: TestData.txId(),
        channel: 'proximity',
        message: 'Hello!',
      });

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('data');
    });

    it('includes chatMessageId in response', async () => {
      mockServer.setHandler('/chatSend', () =>
        jsonResponse(
          createOkResult({
            txId: TestData.txId(),
            applied: true,
            serverTsMs: TestData.timestamp(),
            chatMessageId: 'msg_abc123def',
          })
        )
      );

      const result = await client.chatSend({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId: TestData.txId(),
        channel: 'proximity',
        message: 'Hello!',
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data).toHaveProperty('chatMessageId');
        expect(result.data.chatMessageId).toMatch(/^msg_/);
      }
    });
  });
});
