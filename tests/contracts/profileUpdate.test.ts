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
  ProfileUpdateRequest,
  ProfileUpdateResponseData,
  UserProfile,
  AicErrorCode,
} from '@openclawworld/shared';

const buildProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  entityId: 'agt_0001',
  displayName: 'Test Agent',
  status: 'online',
  ...overrides,
});

describe('ProfileUpdate Endpoint Contract Tests', () => {
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
    it('updates status successfully', async () => {
      const responseData: ProfileUpdateResponseData = {
        applied: true,
        profile: buildProfile({ status: 'focus' }),
        serverTsMs: Date.now(),
      };

      mockServer.setHandler('/profile/update', () => jsonResponse(createOkResult(responseData)));

      const result = await client.profileUpdate({
        agentId: 'agt_0001',
        roomId: 'test_room',
        status: 'focus',
      });

      expectOkResult(result);
      expect(result.data.applied).toBe(true);
      expect(result.data.profile.status).toBe('focus');
    });

    it('updates statusMessage successfully', async () => {
      const responseData: ProfileUpdateResponseData = {
        applied: true,
        profile: buildProfile({ statusMessage: 'In deep work mode' }),
        serverTsMs: Date.now(),
      };

      mockServer.setHandler('/profile/update', () => jsonResponse(createOkResult(responseData)));

      const result = await client.profileUpdate({
        agentId: 'agt_0001',
        roomId: 'test_room',
        statusMessage: 'In deep work mode',
      });

      expectOkResult(result);
      expect(result.data.profile.statusMessage).toBe('In deep work mode');
    });

    it('updates title and department successfully', async () => {
      const responseData: ProfileUpdateResponseData = {
        applied: true,
        profile: buildProfile({ title: 'Senior Engineer', department: 'Platform' }),
        serverTsMs: Date.now(),
      };

      mockServer.setHandler('/profile/update', () => jsonResponse(createOkResult(responseData)));

      const result = await client.profileUpdate({
        agentId: 'agt_0001',
        roomId: 'test_room',
        title: 'Senior Engineer',
        department: 'Platform',
      });

      expectOkResult(result);
      expect(result.data.profile.title).toBe('Senior Engineer');
      expect(result.data.profile.department).toBe('Platform');
    });

    it('updates multiple fields at once', async () => {
      const responseData: ProfileUpdateResponseData = {
        applied: true,
        profile: buildProfile({
          status: 'dnd',
          statusMessage: 'Do not disturb',
          title: 'Lead',
          department: 'Engineering',
        }),
        serverTsMs: Date.now(),
      };

      mockServer.setHandler('/profile/update', () => jsonResponse(createOkResult(responseData)));

      const result = await client.profileUpdate({
        agentId: 'agt_0001',
        roomId: 'test_room',
        status: 'dnd',
        statusMessage: 'Do not disturb',
        title: 'Lead',
        department: 'Engineering',
      });

      expectOkResult(result);
      expect(result.data.applied).toBe(true);
    });

    it('accepts all valid status values', async () => {
      const statuses: ProfileUpdateRequest['status'][] = [
        'online',
        'focus',
        'dnd',
        'afk',
        'offline',
      ];

      for (const status of statuses) {
        const responseData: ProfileUpdateResponseData = {
          applied: true,
          profile: buildProfile({ status }),
          serverTsMs: Date.now(),
        };

        mockServer.setHandler('/profile/update', () => jsonResponse(createOkResult(responseData)));

        const result = await client.profileUpdate({
          agentId: 'agt_0001',
          roomId: 'test_room',
          status,
        });

        expectOkResult(result);
        expect(result.data.profile.status).toBe(status);
      }
    });
  });

  describe('Invalid Requests', () => {
    const testInvalidRequest = async (
      invalidInput: Record<string, unknown>,
      expectedCode: AicErrorCode
    ) => {
      mockServer.setHandler('/profile/update', () =>
        jsonResponse(createErrorResult(expectedCode, 'Invalid request', false), 400)
      );

      const result = await client.profileUpdate(invalidInput as ProfileUpdateRequest);

      expectErrorResult(result, expectedCode);
    };

    it('rejects request with missing agentId', async () => {
      await testInvalidRequest({ roomId: 'test_room', status: 'online' }, 'bad_request');
    });

    it('rejects request with missing roomId', async () => {
      await testInvalidRequest({ agentId: 'agt_0001', status: 'online' }, 'bad_request');
    });

    it('rejects invalid status value', async () => {
      await testInvalidRequest(
        { agentId: 'agt_0001', roomId: 'test_room', status: 'invisible' },
        'bad_request'
      );
    });
  });

  describe('Error Responses', () => {
    it('returns not_found error for unknown agent', async () => {
      mockServer.setHandler('/profile/update', () =>
        jsonResponse(createErrorResult('not_found', 'Agent not found', false), 404)
      );

      const result = await client.profileUpdate({
        agentId: 'agt_unknown',
        roomId: 'test_room',
        status: 'online',
      });

      expectErrorResult(result, 'not_found');
    });

    it('returns internal error on server failure', async () => {
      mockServer.setHandler('/profile/update', () =>
        jsonResponse(createErrorResult('internal', 'Internal server error', true), 500)
      );

      const result = await client.profileUpdate({
        agentId: 'agt_0001',
        roomId: 'test_room',
        status: 'online',
      });

      expectErrorResult(result, 'internal');
    });
  });

  describe('Response Format Validation', () => {
    it('returns AicResult wrapper with status ok', async () => {
      const responseData: ProfileUpdateResponseData = {
        applied: true,
        profile: buildProfile(),
        serverTsMs: Date.now(),
      };

      mockServer.setHandler('/profile/update', () => jsonResponse(createOkResult(responseData)));

      const result = await client.profileUpdate({
        agentId: 'agt_0001',
        roomId: 'test_room',
        status: 'online',
      });

      expect(result).toHaveProperty('status');
      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data).toHaveProperty('applied');
        expect(result.data).toHaveProperty('profile');
        expect(result.data).toHaveProperty('serverTsMs');
      }
    });

    it('profile contains required entityId and status fields', async () => {
      const responseData: ProfileUpdateResponseData = {
        applied: true,
        profile: buildProfile(),
        serverTsMs: Date.now(),
      };

      mockServer.setHandler('/profile/update', () => jsonResponse(createOkResult(responseData)));

      const result = await client.profileUpdate({
        agentId: 'agt_0001',
        roomId: 'test_room',
        status: 'online',
      });

      expectOkResult(result);
      expect(result.data.profile).toHaveProperty('entityId');
      expect(result.data.profile).toHaveProperty('displayName');
      expect(result.data.profile).toHaveProperty('status');
    });
  });
});
