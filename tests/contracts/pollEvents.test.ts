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
import type { PollEventsResponseData, AicErrorCode, EventType } from '@openclawworld/shared';

describe('PollEvents Endpoint Contract Tests', () => {
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
    it('accepts valid pollEvents request', async () => {
      const responseData: PollEventsResponseData = {
        events: [],
        nextCursor: TestData.cursor(1),
        serverTsMs: TestData.timestamp(),
        cursorExpired: false,
      };

      mockServer.setHandler('/pollEvents', () => jsonResponse(createOkResult(responseData)));

      const result = await client.pollEvents({
        agentId: 'test_agent',
        roomId: 'test_room',
        sinceCursor: TestData.cursor(0),
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.events).toEqual([]);
        expect(result.data.nextCursor).toBe(TestData.cursor(1));
      }
    });

    it('accepts pollEvents request with limit', async () => {
      const responseData: PollEventsResponseData = {
        events: [],
        nextCursor: TestData.cursor(1),
        serverTsMs: TestData.timestamp(),
        cursorExpired: false,
      };

      mockServer.setHandler('/pollEvents', () => jsonResponse(createOkResult(responseData)));

      const result = await client.pollEvents({
        agentId: 'test_agent',
        roomId: 'test_room',
        sinceCursor: TestData.cursor(0),
        limit: 50,
      });

      expect(result.status).toBe('ok');
    });

    it('accepts pollEvents request with waitMs', async () => {
      const responseData: PollEventsResponseData = {
        events: [],
        nextCursor: TestData.cursor(1),
        serverTsMs: TestData.timestamp(),
        cursorExpired: false,
      };

      mockServer.setHandler('/pollEvents', () => jsonResponse(createOkResult(responseData)));

      const result = await client.pollEvents({
        agentId: 'test_agent',
        roomId: 'test_room',
        sinceCursor: TestData.cursor(0),
        waitMs: 5000,
      });

      expect(result.status).toBe('ok');
    });
  });

  describe('Event Types', () => {
    const createEvent = (type: EventType, payload: Record<string, unknown>, cursor: string) => ({
      cursor,
      type,
      roomId: 'test_room',
      tsMs: TestData.timestamp(),
      payload,
    });

    it('returns presence.join event', async () => {
      const responseData: PollEventsResponseData = {
        events: [
          createEvent(
            'presence.join',
            { entityId: 'hum_player1', name: 'Player One', kind: 'human' },
            TestData.cursor(1)
          ),
        ],
        nextCursor: TestData.cursor(2),
        serverTsMs: TestData.timestamp(),
        cursorExpired: false,
      };

      mockServer.setHandler('/pollEvents', () => jsonResponse(createOkResult(responseData)));

      const result = await client.pollEvents({
        agentId: 'test_agent',
        roomId: 'test_room',
        sinceCursor: TestData.cursor(0),
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.events[0].type).toBe('presence.join');
        expect(result.data.events[0].payload).toHaveProperty('entityId');
        expect(result.data.events[0].payload).toHaveProperty('name');
        expect(result.data.events[0].payload).toHaveProperty('kind');
      }
    });

    it('returns presence.leave event', async () => {
      const responseData: PollEventsResponseData = {
        events: [
          createEvent(
            'presence.leave',
            { entityId: 'hum_player1', reason: 'disconnect' },
            TestData.cursor(1)
          ),
        ],
        nextCursor: TestData.cursor(2),
        serverTsMs: TestData.timestamp(),
        cursorExpired: false,
      };

      mockServer.setHandler('/pollEvents', () => jsonResponse(createOkResult(responseData)));

      const result = await client.pollEvents({
        agentId: 'test_agent',
        roomId: 'test_room',
        sinceCursor: TestData.cursor(0),
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.events[0].type).toBe('presence.leave');
        expect(result.data.events[0].payload.reason).toBe('disconnect');
      }
    });

    it('returns proximity.enter event', async () => {
      const responseData: PollEventsResponseData = {
        events: [
          createEvent(
            'proximity.enter',
            { subjectId: 'agt_test', otherId: 'hum_player1', distance: 45.5 },
            TestData.cursor(1)
          ),
        ],
        nextCursor: TestData.cursor(2),
        serverTsMs: TestData.timestamp(),
        cursorExpired: false,
      };

      mockServer.setHandler('/pollEvents', () => jsonResponse(createOkResult(responseData)));

      const result = await client.pollEvents({
        agentId: 'test_agent',
        roomId: 'test_room',
        sinceCursor: TestData.cursor(0),
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.events[0].type).toBe('proximity.enter');
        expect(result.data.events[0].payload.distance).toBe(45.5);
      }
    });

    it('returns proximity.exit event', async () => {
      const responseData: PollEventsResponseData = {
        events: [
          createEvent(
            'proximity.exit',
            { subjectId: 'agt_test', otherId: 'hum_player1' },
            TestData.cursor(1)
          ),
        ],
        nextCursor: TestData.cursor(2),
        serverTsMs: TestData.timestamp(),
        cursorExpired: false,
      };

      mockServer.setHandler('/pollEvents', () => jsonResponse(createOkResult(responseData)));

      const result = await client.pollEvents({
        agentId: 'test_agent',
        roomId: 'test_room',
        sinceCursor: TestData.cursor(0),
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.events[0].type).toBe('proximity.exit');
      }
    });

    it('returns chat.message event', async () => {
      const responseData: PollEventsResponseData = {
        events: [
          createEvent(
            'chat.message',
            {
              messageId: 'msg_123',
              fromEntityId: 'hum_player1',
              channel: 'proximity',
              message: 'Hello!',
              tsMs: TestData.timestamp(),
            },
            TestData.cursor(1)
          ),
        ],
        nextCursor: TestData.cursor(2),
        serverTsMs: TestData.timestamp(),
        cursorExpired: false,
      };

      mockServer.setHandler('/pollEvents', () => jsonResponse(createOkResult(responseData)));

      const result = await client.pollEvents({
        agentId: 'test_agent',
        roomId: 'test_room',
        sinceCursor: TestData.cursor(0),
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.events[0].type).toBe('chat.message');
        expect(result.data.events[0].payload.message).toBe('Hello!');
      }
    });

    it('returns object.state_changed event', async () => {
      const responseData: PollEventsResponseData = {
        events: [
          createEvent(
            'object.state_changed',
            {
              objectId: 'obj_door_1',
              objectType: 'door',
              patch: [{ op: 'replace', path: '/isOpen', value: true }],
              version: 2,
            },
            TestData.cursor(1)
          ),
        ],
        nextCursor: TestData.cursor(2),
        serverTsMs: TestData.timestamp(),
        cursorExpired: false,
      };

      mockServer.setHandler('/pollEvents', () => jsonResponse(createOkResult(responseData)));

      const result = await client.pollEvents({
        agentId: 'test_agent',
        roomId: 'test_room',
        sinceCursor: TestData.cursor(0),
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.events[0].type).toBe('object.state_changed');
        expect(result.data.events[0].payload.patch).toHaveLength(1);
      }
    });
  });

  describe('Cursor Progression', () => {
    it('advances cursor with each poll', async () => {
      let currentCursor = 0;

      mockServer.setHandler('/pollEvents', () => {
        currentCursor++;
        return jsonResponse(
          createOkResult({
            events: [],
            nextCursor: TestData.cursor(currentCursor),
            serverTsMs: TestData.timestamp(),
          })
        );
      });

      const result1 = await client.pollEvents({
        agentId: 'test_agent',
        roomId: 'test_room',
        sinceCursor: TestData.cursor(0),
      });

      if (result1.status === 'ok') {
        const result2 = await client.pollEvents({
          agentId: 'test_agent',
          roomId: 'test_room',
          sinceCursor: result1.data.nextCursor,
        });

        if (result2.status === 'ok') {
          expect(result2.data.nextCursor).not.toBe(result1.data.nextCursor);
          expect(result2.data.nextCursor).toBe(TestData.cursor(2));
        }
      }
    });
  });

  describe('Invalid Requests', () => {
    const testInvalidRequest = async (
      invalidInput: Record<string, unknown>,
      expectedCode: AicErrorCode
    ) => {
      mockServer.setHandler('/pollEvents', () =>
        jsonResponse(createErrorResult(expectedCode, 'Invalid request', false), 400)
      );

      const result = await client.pollEvents(
        invalidInput as Parameters<typeof client.pollEvents>[0]
      );

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.code).toBe(expectedCode);
      }
    };

    it('rejects request with missing sinceCursor', async () => {
      await testInvalidRequest({ agentId: 'test_agent', roomId: 'test_room' }, 'bad_request');
    });

    it('rejects request with limit too high', async () => {
      await testInvalidRequest(
        { agentId: 'test_agent', roomId: 'test_room', sinceCursor: TestData.cursor(0), limit: 201 },
        'bad_request'
      );
    });

    it('rejects request with waitMs too high', async () => {
      await testInvalidRequest(
        {
          agentId: 'test_agent',
          roomId: 'test_room',
          sinceCursor: TestData.cursor(0),
          waitMs: 25001,
        },
        'bad_request'
      );
    });
  });

  describe('Error Responses', () => {
    it('returns agent_not_in_room when agent not joined', async () => {
      mockServer.setHandler('/pollEvents', () =>
        jsonResponse(createErrorResult('agent_not_in_room', 'Agent not in room', false), 400)
      );

      const result = await client.pollEvents({
        agentId: 'test_agent',
        roomId: 'test_room',
        sinceCursor: TestData.cursor(0),
      });

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.code).toBe('agent_not_in_room');
      }
    });

    it('returns not_found for non-existent room', async () => {
      mockServer.setHandler('/pollEvents', () =>
        jsonResponse(createErrorResult('not_found', 'Room not found', false), 404)
      );

      const result = await client.pollEvents({
        agentId: 'test_agent',
        roomId: 'nonexistent',
        sinceCursor: TestData.cursor(0),
      });

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.code).toBe('not_found');
      }
    });
  });

  describe('Response Format Validation', () => {
    it('returns AicResult wrapper with status ok', async () => {
      mockServer.setHandler('/pollEvents', () =>
        jsonResponse(
          createOkResult({
            events: [],
            nextCursor: TestData.cursor(1),
            serverTsMs: TestData.timestamp(),
          })
        )
      );

      const result = await client.pollEvents({
        agentId: 'test_agent',
        roomId: 'test_room',
        sinceCursor: TestData.cursor(0),
      });

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('data');
    });

    it('includes all required response fields', async () => {
      mockServer.setHandler('/pollEvents', () =>
        jsonResponse(
          createOkResult({
            events: [],
            nextCursor: TestData.cursor(1),
            serverTsMs: TestData.timestamp(),
          })
        )
      );

      const result = await client.pollEvents({
        agentId: 'test_agent',
        roomId: 'test_room',
        sinceCursor: TestData.cursor(0),
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data).toHaveProperty('events');
        expect(result.data).toHaveProperty('nextCursor');
        expect(result.data).toHaveProperty('serverTsMs');
        expect(Array.isArray(result.data.events)).toBe(true);
      }
    });
  });
});
