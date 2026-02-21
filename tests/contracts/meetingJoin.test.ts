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
  MeetingJoinRequest,
  MeetingJoinResponseData,
  AicErrorCode,
} from '@openclawworld/shared';

describe('MeetingJoin Endpoint Contract Tests', () => {
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
    it('joins meeting successfully as participant', async () => {
      const responseData: MeetingJoinResponseData = {
        meetingId: 'mtg_001',
        role: 'participant',
        participants: [
          { entityId: 'agt_host', name: 'Host Agent', role: 'host' },
          { entityId: 'agt_0001', name: 'Test Agent', role: 'participant' },
        ],
      };

      mockServer.setHandler('/meeting/join', () => jsonResponse(createOkResult(responseData)));

      const result = await client.meetingJoin({
        agentId: 'agt_0001',
        roomId: 'test_room',
        meetingId: 'mtg_001',
      });

      expectOkResult(result);
      expect(result.data.meetingId).toBe('mtg_001');
      expect(result.data.role).toBe('participant');
      expect(result.data.participants).toHaveLength(2);
    });

    it('returns participant list with all required fields', async () => {
      const responseData: MeetingJoinResponseData = {
        meetingId: 'mtg_001',
        role: 'participant',
        participants: [{ entityId: 'agt_host', name: 'Host', role: 'host' }],
      };

      mockServer.setHandler('/meeting/join', () => jsonResponse(createOkResult(responseData)));

      const result = await client.meetingJoin({
        agentId: 'agt_0001',
        roomId: 'test_room',
        meetingId: 'mtg_001',
      });

      expectOkResult(result);
      const participant = result.data.participants[0];
      expect(participant).toHaveProperty('entityId');
      expect(participant).toHaveProperty('name');
      expect(participant).toHaveProperty('role');
    });

    it('host can join their own meeting', async () => {
      const responseData: MeetingJoinResponseData = {
        meetingId: 'mtg_001',
        role: 'host',
        participants: [{ entityId: 'agt_host', name: 'Host Agent', role: 'host' }],
      };

      mockServer.setHandler('/meeting/join', () => jsonResponse(createOkResult(responseData)));

      const result = await client.meetingJoin({
        agentId: 'agt_host',
        roomId: 'test_room',
        meetingId: 'mtg_001',
      });

      expectOkResult(result);
      expect(result.data.role).toBe('host');
    });
  });

  describe('Invalid Requests', () => {
    const testInvalidRequest = async (
      invalidInput: Record<string, unknown>,
      expectedCode: AicErrorCode
    ) => {
      mockServer.setHandler('/meeting/join', () =>
        jsonResponse(createErrorResult(expectedCode, 'Invalid request', false), 400)
      );

      const result = await client.meetingJoin(invalidInput as MeetingJoinRequest);

      expectErrorResult(result, expectedCode);
    };

    it('rejects request with missing agentId', async () => {
      await testInvalidRequest({ roomId: 'test_room', meetingId: 'mtg_001' }, 'bad_request');
    });

    it('rejects request with missing roomId', async () => {
      await testInvalidRequest({ agentId: 'agt_0001', meetingId: 'mtg_001' }, 'bad_request');
    });

    it('rejects request with missing meetingId', async () => {
      await testInvalidRequest({ agentId: 'agt_0001', roomId: 'test_room' }, 'bad_request');
    });
  });

  describe('Error Responses', () => {
    it('returns not_found error for unknown meeting', async () => {
      mockServer.setHandler('/meeting/join', () =>
        jsonResponse(createErrorResult('not_found', 'Meeting not found', false), 404)
      );

      const result = await client.meetingJoin({
        agentId: 'agt_0001',
        roomId: 'test_room',
        meetingId: 'mtg_unknown',
      });

      expectErrorResult(result, 'not_found');
    });

    it('returns capacity_exceeded error when meeting is full', async () => {
      mockServer.setHandler('/meeting/join', () =>
        jsonResponse(createErrorResult('capacity_exceeded', 'Meeting is full', false), 400)
      );

      const result = await client.meetingJoin({
        agentId: 'agt_0001',
        roomId: 'test_room',
        meetingId: 'mtg_full',
      });

      expectErrorResult(result, 'capacity_exceeded');
    });

    it('returns unauthorized error with invalid token', async () => {
      mockServer.setHandler('/meeting/join', () =>
        jsonResponse(createErrorResult('unauthorized', 'Unauthorized', false), 401)
      );

      const result = await client.meetingJoin({
        agentId: 'agt_0001',
        roomId: 'test_room',
        meetingId: 'mtg_001',
      });

      expectErrorResult(result, 'unauthorized');
    });

    it('returns internal error on server failure', async () => {
      mockServer.setHandler('/meeting/join', () =>
        jsonResponse(createErrorResult('internal', 'Internal server error', true), 500)
      );

      const result = await client.meetingJoin({
        agentId: 'agt_0001',
        roomId: 'test_room',
        meetingId: 'mtg_001',
      });

      expectErrorResult(result, 'internal');
    });
  });

  describe('Response Format Validation', () => {
    it('returns AicResult wrapper with status ok', async () => {
      const responseData: MeetingJoinResponseData = {
        meetingId: 'mtg_001',
        role: 'participant',
        participants: [],
      };

      mockServer.setHandler('/meeting/join', () => jsonResponse(createOkResult(responseData)));

      const result = await client.meetingJoin({
        agentId: 'agt_0001',
        roomId: 'test_room',
        meetingId: 'mtg_001',
      });

      expect(result).toHaveProperty('status');
      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data).toHaveProperty('meetingId');
        expect(result.data).toHaveProperty('role');
        expect(result.data).toHaveProperty('participants');
        expect(Array.isArray(result.data.participants)).toBe(true);
      }
    });
  });
});
