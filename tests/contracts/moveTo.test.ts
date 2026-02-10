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
import type { MoveToResponseData, AicErrorCode } from '@openclawworld/shared';

describe('MoveTo Endpoint Contract Tests', () => {
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
    it('accepts valid moveTo request', async () => {
      const txId = TestData.txId();
      const responseData: MoveToResponseData = {
        txId,
        applied: true,
        serverTsMs: TestData.timestamp(),
        result: 'accepted',
      };

      mockServer.setHandler('/moveTo', () => jsonResponse(createOkResult(responseData)));

      const result = await client.moveTo({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId,
        dest: { tx: 15, ty: 10 },
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.txId).toBe(txId);
        expect(result.data.applied).toBe(true);
        expect(result.data.result).toBe('accepted');
      }
    });

    it('accepts moveTo request with walk mode', async () => {
      const txId = TestData.txId();
      const responseData: MoveToResponseData = {
        txId,
        applied: true,
        serverTsMs: TestData.timestamp(),
        result: 'accepted',
      };

      mockServer.setHandler('/moveTo', () => jsonResponse(createOkResult(responseData)));

      const result = await client.moveTo({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId,
        dest: { tx: 15, ty: 10 },
        mode: 'walk',
      });

      expect(result.status).toBe('ok');
    });

    it('returns rejected result for blocked destination', async () => {
      const txId = TestData.txId();
      const responseData: MoveToResponseData = {
        txId,
        applied: false,
        serverTsMs: TestData.timestamp(),
        result: 'rejected',
      };

      mockServer.setHandler('/moveTo', () => jsonResponse(createOkResult(responseData)));

      const result = await client.moveTo({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId,
        dest: { tx: 0, ty: 0 },
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.applied).toBe(false);
        expect(result.data.result).toBe('rejected');
      }
    });

    it('returns no_op result for same destination', async () => {
      const txId = TestData.txId();
      const responseData: MoveToResponseData = {
        txId,
        applied: false,
        serverTsMs: TestData.timestamp(),
        result: 'no_op',
      };

      mockServer.setHandler('/moveTo', () => jsonResponse(createOkResult(responseData)));

      const result = await client.moveTo({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId,
        dest: { tx: 10, ty: 10 },
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.result).toBe('no_op');
      }
    });
  });

  describe('Idempotency', () => {
    it('returns same result for same txId', async () => {
      const txId = TestData.txId();
      let callCount = 0;

      mockServer.setHandler('/moveTo', () => {
        callCount++;
        return jsonResponse(
          createOkResult({
            txId,
            applied: callCount === 1,
            serverTsMs: TestData.timestamp(),
            result: callCount === 1 ? 'accepted' : 'no_op',
          })
        );
      });

      const result1 = await client.moveTo({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId,
        dest: { tx: 15, ty: 10 },
      });

      const result2 = await client.moveTo({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId,
        dest: { tx: 15, ty: 10 },
      });

      expect(result1.status).toBe('ok');
      expect(result2.status).toBe('ok');
      if (result1.status === 'ok' && result2.status === 'ok') {
        expect(result1.data.txId).toBe(result2.data.txId);
      }
    });
  });

  describe('Invalid Requests', () => {
    const testInvalidRequest = async (
      invalidInput: Record<string, unknown>,
      expectedCode: AicErrorCode
    ) => {
      mockServer.setHandler('/moveTo', () =>
        jsonResponse(createErrorResult(expectedCode, 'Invalid request', false), 400)
      );

      const result = await client.moveTo(invalidInput as Parameters<typeof client.moveTo>[0]);

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.code).toBe(expectedCode);
      }
    };

    it('rejects request with missing agentId', async () => {
      await testInvalidRequest(
        { roomId: 'test_room', txId: TestData.txId(), dest: { tx: 10, ty: 10 } },
        'bad_request'
      );
    });

    it('rejects request with missing roomId', async () => {
      await testInvalidRequest(
        { agentId: 'test_agent', txId: TestData.txId(), dest: { tx: 10, ty: 10 } },
        'bad_request'
      );
    });

    it('rejects request with missing txId', async () => {
      await testInvalidRequest(
        { agentId: 'test_agent', roomId: 'test_room', dest: { tx: 10, ty: 10 } },
        'bad_request'
      );
    });

    it('rejects request with invalid txId format', async () => {
      await testInvalidRequest(
        { agentId: 'test_agent', roomId: 'test_room', txId: 'invalid', dest: { tx: 10, ty: 10 } },
        'bad_request'
      );
    });

    it('rejects request with negative tile coordinates', async () => {
      await testInvalidRequest(
        {
          agentId: 'test_agent',
          roomId: 'test_room',
          txId: TestData.txId(),
          dest: { tx: -1, ty: 10 },
        },
        'bad_request'
      );
    });
  });

  describe('Error Responses', () => {
    const testErrorResponse = async (errorCode: AicErrorCode, retryable: boolean) => {
      mockServer.setHandler('/moveTo', () =>
        jsonResponse(createErrorResult(errorCode, 'Error', retryable), 400)
      );

      const result = await client.moveTo({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId: TestData.txId(),
        dest: { tx: 15, ty: 10 },
      });

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.code).toBe(errorCode);
        expect(result.error.retryable).toBe(retryable);
      }
    };

    it('returns invalid_destination for out-of-bounds destination', async () => {
      await testErrorResponse('invalid_destination', false);
    });

    it('returns collision_blocked for blocked path', async () => {
      await testErrorResponse('collision_blocked', false);
    });

    it('returns agent_not_in_room when agent not joined', async () => {
      await testErrorResponse('agent_not_in_room', false);
    });

    it('returns room_not_ready when room is loading', async () => {
      await testErrorResponse('room_not_ready', true);
    });
  });

  describe('Response Format Validation', () => {
    it('returns AicResult wrapper with status ok', async () => {
      const txId = TestData.txId();
      mockServer.setHandler('/moveTo', () =>
        jsonResponse(
          createOkResult({
            txId,
            applied: true,
            serverTsMs: TestData.timestamp(),
            result: 'accepted',
          })
        )
      );

      const result = await client.moveTo({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId,
        dest: { tx: 15, ty: 10 },
      });

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('data');
    });

    it('includes required fields in response', async () => {
      const txId = TestData.txId();
      const serverTsMs = TestData.timestamp();

      mockServer.setHandler('/moveTo', () =>
        jsonResponse(
          createOkResult({
            txId,
            applied: true,
            serverTsMs,
            result: 'accepted',
          })
        )
      );

      const result = await client.moveTo({
        agentId: 'test_agent',
        roomId: 'test_room',
        txId,
        dest: { tx: 15, ty: 10 },
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data).toHaveProperty('txId');
        expect(result.data).toHaveProperty('applied');
        expect(result.data).toHaveProperty('serverTsMs');
        expect(result.data).toHaveProperty('result');
      }
    });
  });
});
