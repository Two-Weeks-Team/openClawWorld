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
  MeetingListRequest,
  MeetingListResponseData,
  MeetingInfo,
  AicErrorCode,
} from '@openclawworld/shared';

const buildMeeting = (overrides: Partial<MeetingInfo> = {}): MeetingInfo => ({
  meetingId: 'mtg_001',
  name: 'Team Standup',
  hostId: 'agt_host',
  participantCount: 3,
  capacity: 10,
  ...overrides,
});

describe('MeetingList Endpoint Contract Tests', () => {
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
    it('returns meeting list successfully', async () => {
      const meetings: MeetingInfo[] = [
        buildMeeting({ meetingId: 'mtg_001', name: 'Standup' }),
        buildMeeting({ meetingId: 'mtg_002', name: 'Retrospective', participantCount: 8 }),
      ];
      const responseData: MeetingListResponseData = { meetings };

      mockServer.setHandler('/meeting/list', () => jsonResponse(createOkResult(responseData)));

      const result = await client.meetingList({
        agentId: 'agt_0001',
        roomId: 'test_room',
      });

      expectOkResult(result);
      expect(result.data.meetings).toHaveLength(2);
      expect(result.data.meetings[0].meetingId).toBe('mtg_001');
      expect(result.data.meetings[1].meetingId).toBe('mtg_002');
    });

    it('returns empty list when no active meetings', async () => {
      const responseData: MeetingListResponseData = { meetings: [] };

      mockServer.setHandler('/meeting/list', () => jsonResponse(createOkResult(responseData)));

      const result = await client.meetingList({
        agentId: 'agt_0001',
        roomId: 'test_room',
      });

      expectOkResult(result);
      expect(result.data.meetings).toHaveLength(0);
    });

    it('returns meetings with all required fields', async () => {
      const responseData: MeetingListResponseData = {
        meetings: [buildMeeting()],
      };

      mockServer.setHandler('/meeting/list', () => jsonResponse(createOkResult(responseData)));

      const result = await client.meetingList({
        agentId: 'agt_0001',
        roomId: 'test_room',
      });

      expectOkResult(result);
      const meeting = result.data.meetings[0];
      expect(meeting).toHaveProperty('meetingId');
      expect(meeting).toHaveProperty('name');
      expect(meeting).toHaveProperty('hostId');
      expect(meeting).toHaveProperty('participantCount');
      expect(meeting).toHaveProperty('capacity');
    });
  });

  describe('Invalid Requests', () => {
    const testInvalidRequest = async (
      invalidInput: Record<string, unknown>,
      expectedCode: AicErrorCode
    ) => {
      mockServer.setHandler('/meeting/list', () =>
        jsonResponse(createErrorResult(expectedCode, 'Invalid request', false), 400)
      );

      const result = await client.meetingList(invalidInput as MeetingListRequest);

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
    it('returns not_found error for unknown room', async () => {
      mockServer.setHandler('/meeting/list', () =>
        jsonResponse(createErrorResult('not_found', 'Room not found', false), 404)
      );

      const result = await client.meetingList({
        agentId: 'agt_0001',
        roomId: 'room_unknown',
      });

      expectErrorResult(result, 'not_found');
    });

    it('returns unauthorized error with invalid token', async () => {
      mockServer.setHandler('/meeting/list', () =>
        jsonResponse(createErrorResult('unauthorized', 'Unauthorized', false), 401)
      );

      const result = await client.meetingList({
        agentId: 'agt_0001',
        roomId: 'test_room',
      });

      expectErrorResult(result, 'unauthorized');
    });

    it('returns internal error on server failure', async () => {
      mockServer.setHandler('/meeting/list', () =>
        jsonResponse(createErrorResult('internal', 'Internal server error', true), 500)
      );

      const result = await client.meetingList({
        agentId: 'agt_0001',
        roomId: 'test_room',
      });

      expectErrorResult(result, 'internal');
    });
  });

  describe('Response Format Validation', () => {
    it('returns AicResult wrapper with status ok', async () => {
      const responseData: MeetingListResponseData = { meetings: [] };

      mockServer.setHandler('/meeting/list', () => jsonResponse(createOkResult(responseData)));

      const result = await client.meetingList({
        agentId: 'agt_0001',
        roomId: 'test_room',
      });

      expect(result).toHaveProperty('status');
      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data).toHaveProperty('meetings');
        expect(Array.isArray(result.data.meetings)).toBe(true);
      }
    });
  });

  describe('Response Data Validation', () => {
    it('participantCount does not exceed capacity', async () => {
      const meetings: MeetingInfo[] = [
        buildMeeting({ participantCount: 5, capacity: 10 }),
        buildMeeting({ meetingId: 'mtg_002', participantCount: 10, capacity: 10 }),
      ];

      mockServer.setHandler('/meeting/list', () => jsonResponse(createOkResult({ meetings })));

      const result = await client.meetingList({
        agentId: 'agt_0001',
        roomId: 'test_room',
      });

      expectOkResult(result);
      for (const meeting of result.data.meetings) {
        expect(meeting.participantCount).toBeLessThanOrEqual(meeting.capacity);
      }
    });
  });
});
