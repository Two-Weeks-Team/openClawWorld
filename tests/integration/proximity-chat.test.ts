import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OpenClawWorldClient } from '@openclawworld/plugin';
import { startTestServer, getTestApiKey, type TestServer } from './test-server.js';

describe('Integration: Scenario B - Proximity Chat', () => {
  let server: TestServer;
  let agentClient: OpenClawWorldClient;

  beforeAll(async () => {
    server = await startTestServer();
    agentClient = new OpenClawWorldClient({
      baseUrl: `${server.baseUrl}/aic/v0.1`,
      apiKey: getTestApiKey(),
      retryMaxAttempts: 1,
      retryBaseDelayMs: 100,
    });
  }, 60000);

  afterAll(async () => {
    await server.shutdown();
  }, 30000);

  describe('Step 1: Poll for events', () => {
    it('polls events successfully', async () => {
      const result = await agentClient.pollEvents({
        agentId: 'agent_test_chat',
        roomId: 'lobby',
        sinceCursor: '0',
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(Array.isArray(result.data.events)).toBe(true);
        expect(typeof result.data.nextCursor).toBe('string');
        expect(result.data.serverTsMs).toBeGreaterThan(0);
      }
    });

    it('receives empty or valid events array', async () => {
      const result = await agentClient.pollEvents({
        agentId: 'agent_test_chat',
        roomId: 'lobby',
        sinceCursor: '0',
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(Array.isArray(result.data.events)).toBe(true);
        result.data.events.forEach(event => {
          expect(event).toHaveProperty('cursor');
          expect(event).toHaveProperty('type');
          expect(event).toHaveProperty('roomId');
          expect(event).toHaveProperty('tsMs');
          expect(event).toHaveProperty('payload');
        });
      }
    });
  });

  describe('Step 2: Agent can send chat messages', () => {
    it('sends chat message successfully', async () => {
      const txId = `tx_${Date.now()}_chat`;

      const result = await agentClient.chatSend({
        agentId: 'agent_test_chat',
        roomId: 'lobby',
        txId,
        channel: 'proximity',
        message: 'Hello from integration test!',
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.applied).toBe(true);
        expect(result.data.txId).toBe(txId);
        expect(result.data.chatMessageId).toBeDefined();
      }
    });

    it('handles invalid room gracefully', async () => {
      const txId = `tx_${Date.now()}_invalid`;

      const result = await agentClient.chatSend({
        agentId: 'agent_test_chat',
        roomId: 'nonexistent_room',
        txId,
        channel: 'proximity',
        message: 'Test message',
      });

      expect(result.status).toBeDefined();
    });
  });

  describe('Full Scenario Flow', () => {
    it('completes proximity chat scenario against real server', async () => {
      const initialPoll = await agentClient.pollEvents({
        agentId: 'agent_test_chat',
        roomId: 'lobby',
        sinceCursor: '0',
      });

      expect(initialPoll.status).toBe('ok');

      const txId = `tx_${Date.now()}_scenario`;
      const sendResult = await agentClient.chatSend({
        agentId: 'agent_test_chat',
        roomId: 'lobby',
        txId,
        channel: 'proximity',
        message: 'Integration test message',
      });

      expect(sendResult.status).toBe('ok');
      if (sendResult.status === 'ok') {
        expect(sendResult.data.applied).toBe(true);
      }

      if (initialPoll.status === 'ok') {
        const followUpPoll = await agentClient.pollEvents({
          agentId: 'agent_test_chat',
          roomId: 'lobby',
          sinceCursor: initialPoll.data.nextCursor,
        });

        expect(followUpPoll.status).toBe('ok');
        if (followUpPoll.status === 'ok') {
          expect(Array.isArray(followUpPoll.data.events)).toBe(true);
        }
      }
    });
  });
});
