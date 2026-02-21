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
import type { ObserveResponseData, AicErrorCode } from '@openclawworld/shared';

describe('Observe Endpoint Contract Tests', () => {
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
    it('accepts valid observe request with full detail', async () => {
      const responseData: ObserveResponseData = {
        self: TestData.agent,
        nearby: [
          {
            entity: TestData.human,
            distance: 20.5,
            affords: [],
          },
        ],
        facilities: [],
        serverTsMs: TestData.timestamp(),
        room: TestData.room,
      };

      mockServer.setHandler('/observe', () => jsonResponse(createOkResult(responseData)));

      const result = await client.observe({
        agentId: 'test_agent',
        roomId: 'test_room',
        radius: 100,
        detail: 'full',
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.self.id).toBe(TestData.agent.id);
        expect(result.data.nearby).toHaveLength(1);
        expect(result.data.room).toEqual(TestData.room);
      }
    });

    it('accepts valid observe request with lite detail', async () => {
      const responseData: ObserveResponseData = {
        self: TestData.agent,
        nearby: [],
        facilities: [],
        serverTsMs: TestData.timestamp(),
        room: TestData.room,
      };

      mockServer.setHandler('/observe', () => jsonResponse(createOkResult(responseData)));

      const result = await client.observe({
        agentId: 'test_agent',
        roomId: 'test_room',
        radius: 50,
        detail: 'lite',
      });

      expect(result.status).toBe('ok');
    });

    it('accepts observe request without detail field (detail is optional)', async () => {
      const responseData: ObserveResponseData = {
        self: TestData.agent,
        nearby: [],
        facilities: [],
        serverTsMs: TestData.timestamp(),
        room: TestData.room,
      };

      mockServer.setHandler('/observe', () => jsonResponse(createOkResult(responseData)));

      const result = await client.observe({
        agentId: 'test_agent',
        roomId: 'test_room',
        radius: 100,
      });

      expect(result.status).toBe('ok');
    });

    it('accepts observe request with includeSelf false', async () => {
      const responseData: ObserveResponseData = {
        self: TestData.agent,
        nearby: [],
        facilities: [],
        serverTsMs: TestData.timestamp(),
        room: TestData.room,
      };

      mockServer.setHandler('/observe', () => jsonResponse(createOkResult(responseData)));

      const result = await client.observe({
        agentId: 'test_agent',
        roomId: 'test_room',
        radius: 100,
        detail: 'full',
        includeSelf: false,
      });

      expect(result.status).toBe('ok');
    });

    it('returns nearby entities with affordances', async () => {
      const responseData: ObserveResponseData = {
        self: TestData.agent,
        nearby: [
          {
            entity: TestData.object,
            distance: 15.0,
            affords: [{ action: 'read', label: 'Read Sign' }],
            object: { objectType: 'sign', state: { text: 'Welcome!' } },
          },
        ],
        facilities: [],
        serverTsMs: TestData.timestamp(),
        room: TestData.room,
      };

      mockServer.setHandler('/observe', () => jsonResponse(createOkResult(responseData)));

      const result = await client.observe({
        agentId: 'test_agent',
        roomId: 'test_room',
        radius: 100,
        detail: 'full',
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.nearby[0].affords).toHaveLength(1);
        expect(result.data.nearby[0].affords[0].action).toBe('read');
        expect(result.data.nearby[0].object?.objectType).toBe('sign');
      }
    });
  });

  describe('Invalid Requests', () => {
    const testInvalidRequest = async (
      invalidInput: Record<string, unknown>,
      expectedCode: AicErrorCode
    ) => {
      mockServer.setHandler('/observe', (_url, _body) => {
        return jsonResponse(createErrorResult(expectedCode, 'Invalid request', false), 400);
      });

      const result = await client.observe(invalidInput as Parameters<typeof client.observe>[0]);

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.code).toBe(expectedCode);
      }
    };

    it('rejects request with missing agentId', async () => {
      await testInvalidRequest({ roomId: 'test_room', radius: 100, detail: 'full' }, 'bad_request');
    });

    it('rejects request with missing roomId', async () => {
      await testInvalidRequest(
        { agentId: 'test_agent', radius: 100, detail: 'full' },
        'bad_request'
      );
    });

    it('rejects request with radius too small', async () => {
      await testInvalidRequest(
        { agentId: 'test_agent', roomId: 'test_room', radius: 0, detail: 'full' },
        'bad_request'
      );
    });

    it('rejects request with radius too large', async () => {
      await testInvalidRequest(
        { agentId: 'test_agent', roomId: 'test_room', radius: 2001, detail: 'full' },
        'bad_request'
      );
    });

    it('rejects request with invalid detail value', async () => {
      await testInvalidRequest(
        { agentId: 'test_agent', roomId: 'test_room', radius: 100, detail: 'invalid' },
        'bad_request'
      );
    });
  });

  describe('Error Responses', () => {
    const testErrorResponse = async (
      errorCode: AicErrorCode,
      message: string,
      retryable: boolean
    ) => {
      mockServer.setHandler('/observe', () =>
        jsonResponse(createErrorResult(errorCode, message, retryable), 400)
      );

      const result = await client.observe({
        agentId: 'test_agent',
        roomId: 'test_room',
        radius: 100,
        detail: 'full',
      });

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.code).toBe(errorCode);
        expect(result.error.message).toBe(message);
        expect(result.error.retryable).toBe(retryable);
      }
    };

    it('returns unauthorized error for invalid API key', async () => {
      await testErrorResponse('unauthorized', 'Invalid API key', false);
    });

    it('returns forbidden error for insufficient permissions', async () => {
      await testErrorResponse('forbidden', 'Agent does not have permission for this room', false);
    });

    it('returns not_found error for non-existent room', async () => {
      await testErrorResponse('not_found', 'Room not found', false);
    });

    it('returns agent_not_in_room error when agent not joined', async () => {
      await testErrorResponse('agent_not_in_room', 'Agent is not in this room', false);
    });

    it('returns rate_limited error when too many requests', async () => {
      await testErrorResponse('rate_limited', 'Rate limit exceeded', true);
    });
  });

  describe('Response Format Validation', () => {
    it('returns AicResult wrapper with status ok', async () => {
      const responseData: ObserveResponseData = {
        self: TestData.agent,
        nearby: [],
        facilities: [],
        serverTsMs: TestData.timestamp(),
        room: TestData.room,
      };

      mockServer.setHandler('/observe', () => jsonResponse(createOkResult(responseData)));

      const result = await client.observe({
        agentId: 'test_agent',
        roomId: 'test_room',
        radius: 100,
        detail: 'full',
      });

      expect(result).toHaveProperty('status');
      expect(result.status).toBe('ok');
      expect(result).toHaveProperty('data');
    });

    it('returns AicResult wrapper with status error', async () => {
      mockServer.setHandler('/observe', () =>
        jsonResponse(createErrorResult('bad_request', 'Invalid request', false), 400)
      );

      const result = await client.observe({
        agentId: 'test_agent',
        roomId: 'test_room',
        radius: 100,
        detail: 'full',
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
});
