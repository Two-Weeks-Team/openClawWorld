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
  MeetingLeaveRequest,
  MeetingLeaveResponseData,
  AicErrorCode,
} from '@openclawworld/shared';

describe('MeetingLeave Endpoint Contract Tests', () => {
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
    it('leaves meeting successfully', async () => {
      const leftAt = Date.now();
      const responseData: MeetingLeaveResponseData = {
        meetingId: 'mtg_001',
        leftAt,
        serverTsMs: Date.now(),
      };

      mockServer.setHandler('/meeting/leave', () => jsonResponse(createOkResult(responseData)));

      const result = await client.meetingLeave({
        agentId: 'agt_0001',
        roomId: 'test_room',
        meetingId: 'mtg_001',
      });

      expectOkResult(result);
      expect(result.data.meetingId).toBe('mtg_001');
      expect(result.data.leftAt).toBeGreaterThan(0);
    });

    it('leftAt is a valid unix timestamp in ms', async () => {
      const responseData: MeetingLeaveResponseData = {
        meetingId: 'mtg_001',
        leftAt: Date.now(),
        serverTsMs: Date.now(),
      };

      mockServer.setHandler('/meeting/leave', () => jsonResponse(createOkResult(responseData)));

      const result = await client.meetingLeave({
        agentId: 'agt_0001',
        roomId: 'test_room',
        meetingId: 'mtg_001',
      });

      expectOkResult(result);
      // Timestamp should be after year 2020
      expect(result.data.leftAt).toBeGreaterThan(1577836800000);
      expect(typeof result.data.leftAt).toBe('number');
    });

    it('returns the meetingId that was left', async () => {
      const meetingId = 'mtg_specific';
      const responseData: MeetingLeaveResponseData = {
        meetingId,
        leftAt: Date.now(),
        serverTsMs: Date.now(),
      };

      mockServer.setHandler('/meeting/leave', () => jsonResponse(createOkResult(responseData)));

      const result = await client.meetingLeave({
        agentId: 'agt_0001',
        roomId: 'test_room',
        meetingId,
      });

      expectOkResult(result);
      expect(result.data.meetingId).toBe(meetingId);
    });
  });

  describe('Invalid Requests', () => {
    const testInvalidRequest = async (
      invalidInput: Record<string, unknown>,
      expectedCode: AicErrorCode
    ) => {
      mockServer.setHandler('/meeting/leave', () =>
        jsonResponse(createErrorResult(expectedCode, 'Invalid request', false), 400)
      );

      const result = await client.meetingLeave(invalidInput as MeetingLeaveRequest);

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
      mockServer.setHandler('/meeting/leave', () =>
        jsonResponse(createErrorResult('not_found', 'Meeting not found', false), 404)
      );

      const result = await client.meetingLeave({
        agentId: 'agt_0001',
        roomId: 'test_room',
        meetingId: 'mtg_unknown',
      });

      expectErrorResult(result, 'not_found');
    });

    it('returns not_found error when agent is not in meeting', async () => {
      mockServer.setHandler('/meeting/leave', () =>
        jsonResponse(createErrorResult('not_found', 'Agent not in meeting', false), 404)
      );

      const result = await client.meetingLeave({
        agentId: 'agt_not_joined',
        roomId: 'test_room',
        meetingId: 'mtg_001',
      });

      expectErrorResult(result, 'not_found');
    });

    it('returns unauthorized error with invalid token', async () => {
      mockServer.setHandler('/meeting/leave', () =>
        jsonResponse(createErrorResult('unauthorized', 'Unauthorized', false), 401)
      );

      const result = await client.meetingLeave({
        agentId: 'agt_0001',
        roomId: 'test_room',
        meetingId: 'mtg_001',
      });

      expectErrorResult(result, 'unauthorized');
    });

    it('returns internal error on server failure', async () => {
      mockServer.setHandler('/meeting/leave', () =>
        jsonResponse(createErrorResult('internal', 'Internal server error', true), 500)
      );

      const result = await client.meetingLeave({
        agentId: 'agt_0001',
        roomId: 'test_room',
        meetingId: 'mtg_001',
      });

      expectErrorResult(result, 'internal');
    });
  });

  describe('Response Format Validation', () => {
    it('returns AicResult wrapper with status ok', async () => {
      const responseData: MeetingLeaveResponseData = {
        meetingId: 'mtg_001',
        leftAt: Date.now(),
        serverTsMs: Date.now(),
      };

      mockServer.setHandler('/meeting/leave', () => jsonResponse(createOkResult(responseData)));

      const result = await client.meetingLeave({
        agentId: 'agt_0001',
        roomId: 'test_room',
        meetingId: 'mtg_001',
      });

      expect(result).toHaveProperty('status');
      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data).toHaveProperty('meetingId');
        expect(result.data).toHaveProperty('leftAt');
        expect(result.data).toHaveProperty('serverTsMs');
        expect(typeof result.data.serverTsMs).toBe('number');
      }
    });

    it('returns AicResult wrapper with status error', async () => {
      mockServer.setHandler('/meeting/leave', () =>
        jsonResponse(createErrorResult('not_found', 'Meeting not found', false), 404)
      );

      const result = await client.meetingLeave({
        agentId: 'agt_0001',
        roomId: 'test_room',
        meetingId: 'mtg_unknown',
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
