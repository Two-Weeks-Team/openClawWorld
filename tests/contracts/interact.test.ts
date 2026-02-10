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
import type {
  InteractResponseData,
  AicErrorCode,
  InteractOutcomeType,
} from '@openclawworld/shared';

describe('Interact Endpoint Contract Tests', () => {
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
    it('accepts valid interact request with action', async () => {
      const txId = TestData.txId();
      const responseData: InteractResponseData = {
        txId,
        applied: true,
        serverTsMs: TestData.timestamp(),
        outcome: { type: 'ok', message: 'Welcome to OpenClawWorld!' },
      };

      mockServer.setHandler('/interact', () => jsonResponse(createOkResult(responseData)));

      const result = await client.interact({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId,
        targetId: 'obj_sign_welcome',
        action: 'read',
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.txId).toBe(txId);
        expect(result.data.applied).toBe(true);
        expect(result.data.outcome.type).toBe('ok');
        expect(result.data.outcome.message).toBe('Welcome to OpenClawWorld!');
      }
    });

    it('accepts interact request with params', async () => {
      const txId = TestData.txId();
      const responseData: InteractResponseData = {
        txId,
        applied: true,
        serverTsMs: TestData.timestamp(),
        outcome: { type: 'ok' },
      };

      mockServer.setHandler('/interact', () => jsonResponse(createOkResult(responseData)));

      const result = await client.interact({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId,
        targetId: 'obj_door_main',
        action: 'open',
        params: { key: 'master_key' },
      });

      expect(result.status).toBe('ok');
    });
  });

  describe('Outcome Types', () => {
    const testOutcome = async (outcomeType: InteractOutcomeType, message?: string) => {
      const txId = TestData.txId();
      const responseData: InteractResponseData = {
        txId,
        applied: true,
        serverTsMs: TestData.timestamp(),
        outcome: { type: outcomeType, message },
      };

      mockServer.setHandler('/interact', () => jsonResponse(createOkResult(responseData)));

      const result = await client.interact({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId,
        targetId: 'obj_sign_test',
        action: 'read',
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.outcome.type).toBe(outcomeType);
        if (message) {
          expect(result.data.outcome.message).toBe(message);
        }
      }
    };

    it('returns ok outcome for successful interaction', async () => {
      await testOutcome('ok', 'Success!');
    });

    it('returns no_effect outcome when nothing happens', async () => {
      await testOutcome('no_effect');
    });

    it('returns invalid_action outcome for unknown action', async () => {
      await testOutcome('invalid_action', 'Unknown action: fly');
    });

    it('returns too_far outcome when agent is too far', async () => {
      await testOutcome('too_far', 'You are too far from this object');
    });
  });

  describe('Idempotency', () => {
    it('returns same result for same txId', async () => {
      const txId = TestData.txId();

      mockServer.setHandler('/interact', () =>
        jsonResponse(
          createOkResult({
            txId,
            applied: true,
            serverTsMs: TestData.timestamp(),
            outcome: { type: 'ok' },
          })
        )
      );

      const result1 = await client.interact({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId,
        targetId: 'obj_sign_test',
        action: 'read',
      });

      const result2 = await client.interact({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId,
        targetId: 'obj_sign_test',
        action: 'read',
      });

      expect(result1.status).toBe('ok');
      expect(result2.status).toBe('ok');
      if (result1.status === 'ok' && result2.status === 'ok') {
        expect(result1.data.txId).toBe(result2.data.txId);
        expect(result1.data.outcome.type).toBe(result2.data.outcome.type);
      }
    });
  });

  describe('Invalid Requests', () => {
    const testInvalidRequest = async (
      invalidInput: Record<string, unknown>,
      expectedCode: AicErrorCode
    ) => {
      mockServer.setHandler('/interact', () =>
        jsonResponse(createErrorResult(expectedCode, 'Invalid request', false), 400)
      );

      const result = await client.interact(invalidInput as Parameters<typeof client.interact>[0]);

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.code).toBe(expectedCode);
      }
    };

    it('rejects request with missing targetId', async () => {
      await testInvalidRequest(
        {
          agentId: 'test_agent',
          roomId: 'test_room',
          txId: TestData.txId(),
          action: 'read',
        },
        'bad_request'
      );
    });

    it('rejects request with missing action', async () => {
      await testInvalidRequest(
        {
          agentId: 'test_agent',
          roomId: 'test_room',
          txId: TestData.txId(),
          targetId: 'obj_sign_test',
        },
        'bad_request'
      );
    });

    it('rejects request with invalid targetId format', async () => {
      await testInvalidRequest(
        {
          agentId: 'test_agent',
          roomId: 'test_room',
          txId: TestData.txId(),
          targetId: 'invalid_id',
          action: 'read',
        },
        'bad_request'
      );
    });
  });

  describe('Error Responses', () => {
    const testErrorResponse = async (errorCode: AicErrorCode) => {
      mockServer.setHandler('/interact', () =>
        jsonResponse(createErrorResult(errorCode, 'Error', false), 400)
      );

      const result = await client.interact({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId: TestData.txId(),
        targetId: 'obj_sign_test',
        action: 'read',
      });

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.code).toBe(errorCode);
      }
    };

    it('returns not_found for non-existent target', async () => {
      await testErrorResponse('not_found');
    });

    it('returns agent_not_in_room when agent not joined', async () => {
      await testErrorResponse('agent_not_in_room');
    });

    it('returns forbidden for unauthorized interaction', async () => {
      await testErrorResponse('forbidden');
    });
  });

  describe('Response Format Validation', () => {
    it('returns AicResult wrapper with status ok', async () => {
      mockServer.setHandler('/interact', () =>
        jsonResponse(
          createOkResult({
            txId: TestData.txId(),
            applied: true,
            serverTsMs: TestData.timestamp(),
            outcome: { type: 'ok' },
          })
        )
      );

      const result = await client.interact({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId: TestData.txId(),
        targetId: 'obj_sign_test',
        action: 'read',
      });

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('data');
    });

    it('returns outcome with required type field', async () => {
      mockServer.setHandler('/interact', () =>
        jsonResponse(
          createOkResult({
            txId: TestData.txId(),
            applied: true,
            serverTsMs: TestData.timestamp(),
            outcome: { type: 'ok' },
          })
        )
      );

      const result = await client.interact({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId: TestData.txId(),
        targetId: 'obj_sign_test',
        action: 'read',
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.outcome).toHaveProperty('type');
        expect(['ok', 'no_effect', 'invalid_action', 'too_far']).toContain(
          result.data.outcome.type
        );
      }
    });
  });
});
