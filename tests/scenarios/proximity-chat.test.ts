import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OpenClawWorldClient } from '@openclawworld/plugin';
import { setupMockFetch, createOkResult, jsonResponse, TestData } from '../helpers/mock-server.js';
import type { MockServer } from '../helpers/mock-server.js';
import type {
  PollEventsResponseData,
  ChatSendResponseData,
  EventType,
  EventEnvelope,
} from '@openclawworld/shared';

describe('Scenario B: Proximity Chat', () => {
  let mockServer: MockServer;
  let agentClient: OpenClawWorldClient;

  beforeEach(() => {
    mockServer = setupMockFetch();
    agentClient = new OpenClawWorldClient({
      baseUrl: 'http://localhost:8080/aic/v0.1',
      apiKey: 'test-api-key',
    });
  });

  afterEach(() => {
    mockServer.reset();
  });

  describe('Step 1: Human joins room', () => {
    it('receives presence.join event when human joins', async () => {
      const responseData: PollEventsResponseData = {
        events: [
          {
            cursor: TestData.cursor(1),
            type: 'presence.join',
            roomId: 'lobby',
            tsMs: TestData.timestamp(),
            payload: {
              entityId: 'hum_player1',
              name: 'Player One',
              kind: 'human',
            },
          },
        ],
        nextCursor: TestData.cursor(2),
        serverTsMs: TestData.timestamp(),
        cursorExpired: false,
      };

      mockServer.setHandler('/pollEvents', () => jsonResponse(createOkResult(responseData)));

      const result = await agentClient.pollEvents({
        agentId: 'agent_helper',
        roomId: 'lobby',
        sinceCursor: TestData.cursor(0),
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.events).toHaveLength(1);
        expect(result.data.events[0].type).toBe('presence.join');
        expect(result.data.events[0].payload.entityId).toBe('hum_player1');
        expect(result.data.events[0].payload.name).toBe('Player One');
      }
    });

    it('receives proximity.enter event when human comes near', async () => {
      const responseData: PollEventsResponseData = {
        events: [
          {
            cursor: TestData.cursor(1),
            type: 'proximity.enter',
            roomId: 'lobby',
            tsMs: TestData.timestamp(),
            payload: {
              subjectId: 'agt_agent_helper',
              otherId: 'hum_player1',
              distance: 35.0,
            },
          },
        ],
        nextCursor: TestData.cursor(2),
        serverTsMs: TestData.timestamp(),
        cursorExpired: false,
      };

      mockServer.setHandler('/pollEvents', () => jsonResponse(createOkResult(responseData)));

      const result = await agentClient.pollEvents({
        agentId: 'agent_helper',
        roomId: 'lobby',
        sinceCursor: TestData.cursor(0),
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.events[0].type).toBe('proximity.enter');
        expect(result.data.events[0].payload.subjectId).toBe('agt_agent_helper');
        expect(result.data.events[0].payload.otherId).toBe('hum_player1');
        expect(result.data.events[0].payload.distance).toBe(35.0);
      }
    });
  });

  describe('Step 2: Human sends chat message', () => {
    it('receives chat.message event in proximity channel', async () => {
      const messageTs = TestData.timestamp();
      const responseData: PollEventsResponseData = {
        events: [
          {
            cursor: TestData.cursor(1),
            type: 'chat.message',
            roomId: 'lobby',
            tsMs: messageTs,
            payload: {
              messageId: 'msg_123',
              fromEntityId: 'hum_player1',
              channel: 'proximity',
              message: 'Hello everyone!',
              tsMs: messageTs,
            },
          },
        ],
        nextCursor: TestData.cursor(2),
        serverTsMs: TestData.timestamp(),
        cursorExpired: false,
      };

      mockServer.setHandler('/pollEvents', () => jsonResponse(createOkResult(responseData)));

      const result = await agentClient.pollEvents({
        agentId: 'agent_helper',
        roomId: 'lobby',
        sinceCursor: TestData.cursor(0),
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.events[0].type).toBe('chat.message');
        expect(result.data.events[0].payload.fromEntityId).toBe('hum_player1');
        expect(result.data.events[0].payload.channel).toBe('proximity');
        expect(result.data.events[0].payload.message).toBe('Hello everyone!');
      }
    });

    it('receives chat.message with full message metadata', async () => {
      const messageTs = TestData.timestamp();
      const responseData: PollEventsResponseData = {
        events: [
          {
            cursor: TestData.cursor(1),
            type: 'chat.message',
            roomId: 'lobby',
            tsMs: messageTs,
            payload: {
              messageId: 'msg_abc123',
              fromEntityId: 'hum_player1',
              channel: 'proximity',
              message: 'Nice to meet you!',
              tsMs: messageTs,
            },
          },
        ],
        nextCursor: TestData.cursor(2),
        serverTsMs: TestData.timestamp(),
        cursorExpired: false,
      };

      mockServer.setHandler('/pollEvents', () => jsonResponse(createOkResult(responseData)));

      const result = await agentClient.pollEvents({
        agentId: 'agent_helper',
        roomId: 'lobby',
        sinceCursor: TestData.cursor(0),
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        const event = result.data.events[0];
        expect(event.payload).toHaveProperty('messageId');
        expect(event.payload).toHaveProperty('fromEntityId');
        expect(event.payload).toHaveProperty('channel');
        expect(event.payload).toHaveProperty('message');
        expect(event.payload).toHaveProperty('tsMs');
      }
    });
  });

  describe('Step 3: Agent can respond to chat', () => {
    it('sends chat message successfully', async () => {
      const txId = TestData.txId();
      const sendResponse: ChatSendResponseData = {
        txId,
        applied: true,
        serverTsMs: TestData.timestamp(),
        chatMessageId: 'msg_agent_reply',
      };

      mockServer.setHandler('/chatSend', () => jsonResponse(createOkResult(sendResponse)));

      const result = await agentClient.chatSend({
        agentId: 'agent_helper',
        roomId: 'lobby',
        txId,
        channel: 'proximity',
        message: 'Hello Player One! Welcome to the lobby.',
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.applied).toBe(true);
        expect(result.data.chatMessageId).toBe('msg_agent_reply');
      }
    });
  });

  describe('Full Scenario Flow', () => {
    it('completes proximity chat scenario end-to-end', async () => {
      const txId = TestData.txId();
      let pollCallCount = 0;

      mockServer.setHandler('/pollEvents', () => {
        pollCallCount++;
        if (pollCallCount === 1) {
          return jsonResponse(
            createOkResult({
              events: [
                {
                  cursor: TestData.cursor(1),
                  type: 'presence.join' as EventType,
                  roomId: 'lobby',
                  tsMs: TestData.timestamp(),
                  payload: { entityId: 'hum_player1', name: 'Player One', kind: 'human' },
                },
                {
                  cursor: TestData.cursor(2),
                  type: 'proximity.enter' as EventType,
                  roomId: 'lobby',
                  tsMs: TestData.timestamp(),
                  payload: { subjectId: 'agt_agent_helper', otherId: 'hum_player1', distance: 30 },
                },
              ],
              nextCursor: TestData.cursor(3),
              serverTsMs: TestData.timestamp(),
            })
          );
        }
        return jsonResponse(
          createOkResult({
            events: [
              {
                cursor: TestData.cursor(3),
                type: 'chat.message' as EventType,
                roomId: 'lobby',
                tsMs: TestData.timestamp(),
                payload: {
                  messageId: 'msg_123',
                  fromEntityId: 'hum_player1',
                  channel: 'proximity',
                  message: 'Hi there!',
                  tsMs: TestData.timestamp(),
                },
              },
            ],
            nextCursor: TestData.cursor(4),
            serverTsMs: TestData.timestamp(),
          })
        );
      });

      mockServer.setHandler('/chatSend', () =>
        jsonResponse(
          createOkResult({
            txId,
            applied: true,
            serverTsMs: TestData.timestamp(),
            chatMessageId: 'msg_reply',
          })
        )
      );

      const pollResult1 = await agentClient.pollEvents({
        agentId: 'agent_helper',
        roomId: 'lobby',
        sinceCursor: TestData.cursor(0),
      });

      expect(pollResult1.status).toBe('ok');
      if (pollResult1.status === 'ok') {
        expect(pollResult1.data.events.some((e: EventEnvelope) => e.type === 'presence.join')).toBe(
          true
        );
        expect(
          pollResult1.data.events.some((e: EventEnvelope) => e.type === 'proximity.enter')
        ).toBe(true);

        const pollResult2 = await agentClient.pollEvents({
          agentId: 'agent_helper',
          roomId: 'lobby',
          sinceCursor: pollResult1.data.nextCursor,
        });

        expect(pollResult2.status).toBe('ok');
        if (pollResult2.status === 'ok') {
          const chatEvent = pollResult2.data.events.find(
            (e: EventEnvelope) => e.type === 'chat.message'
          );
          expect(chatEvent).toBeDefined();
          expect(chatEvent?.payload.message).toBe('Hi there!');

          const sendResult = await agentClient.chatSend({
            agentId: 'agent_helper',
            roomId: 'lobby',
            txId,
            channel: 'proximity',
            message: 'Hello! Nice to meet you.',
          });

          expect(sendResult.status).toBe('ok');
        }
      }
    });
  });
});
