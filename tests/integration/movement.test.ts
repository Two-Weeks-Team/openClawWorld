import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OpenClawWorldClient } from '@openclawworld/plugin';
import { startTestServer, getTestApiKey, type TestServer } from './test-server.js';

describe('Integration: Scenario C - Movement', () => {
  let server: TestServer;
  let client: OpenClawWorldClient;

  beforeAll(async () => {
    server = await startTestServer();
    client = new OpenClawWorldClient({
      baseUrl: `${server.baseUrl}/aic/v0.1`,
      apiKey: getTestApiKey(),
      retryMaxAttempts: 1,
      retryBaseDelayMs: 100,
    });
  }, 60000);

  afterAll(async () => {
    await server.shutdown();
  }, 30000);

  describe('Step 1: Agent requests movement', () => {
    it('sends moveTo request and receives response', async () => {
      const txId = `tx_${Date.now()}_move`;

      const result = await client.moveTo({
        agentId: 'agent_test_move',
        roomId: 'lobby',
        txId,
        dest: { tx: 10, ty: 10 },
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.txId).toBe(txId);
        expect(typeof result.data.applied).toBe('boolean');
        expect(['accepted', 'rejected', 'no_op']).toContain(result.data.result);
      }
    });

    it('handles movement to different destinations', async () => {
      const destinations = [
        { tx: 5, ty: 5 },
        { tx: 15, ty: 15 },
        { tx: 20, ty: 10 },
      ];

      for (const dest of destinations) {
        const txId = `tx_${Date.now()}_move_${dest.tx}_${dest.ty}`;
        const result = await client.moveTo({
          agentId: 'agent_test_move',
          roomId: 'lobby',
          txId,
          dest,
        });

        expect(result.status).toBe('ok');
        if (result.status === 'ok') {
          expect(result.data.txId).toBe(txId);
          expect(typeof result.data.applied).toBe('boolean');
        }
      }
    });
  });

  describe('Step 2: Verify position after movement', () => {
    it('observes environment to check position', async () => {
      const result = await client.observe({
        agentId: 'agent_test_move',
        roomId: 'lobby',
        radius: 100,
        detail: 'full',
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.self).toBeDefined();
        expect(result.data.self.tile).toBeDefined();
        expect(typeof result.data.self.tile!.tx).toBe('number');
        expect(typeof result.data.self.tile!.ty).toBe('number');
        expect(result.data.self.pos).toBeDefined();
        expect(typeof result.data.self.pos.x).toBe('number');
        expect(typeof result.data.self.pos.y).toBe('number');
      }
    });
  });

  describe('Step 3: Poll for movement events', () => {
    it('polls events for movement-related events', async () => {
      const result = await client.pollEvents({
        agentId: 'agent_test_move',
        roomId: 'lobby',
        sinceCursor: '0',
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(Array.isArray(result.data.events)).toBe(true);
        expect(typeof result.data.nextCursor).toBe('string');
      }
    });
  });

  describe('Full Scenario Flow', () => {
    it('completes movement scenario against real server', async () => {
      const initialObserve = await client.observe({
        agentId: 'agent_test_move',
        roomId: 'lobby',
        radius: 100,
        detail: 'full',
      });

      expect(initialObserve.status).toBe('ok');

      const txId = `tx_${Date.now()}_scenario`;
      const moveResult = await client.moveTo({
        agentId: 'agent_test_move',
        roomId: 'lobby',
        txId,
        dest: { tx: 12, ty: 12 },
      });

      expect(moveResult.status).toBe('ok');
      if (moveResult.status === 'ok') {
        expect(moveResult.data.txId).toBe(txId);
        expect(typeof moveResult.data.applied).toBe('boolean');
      }

      const finalObserve = await client.observe({
        agentId: 'agent_test_move',
        roomId: 'lobby',
        radius: 100,
        detail: 'full',
      });

      expect(finalObserve.status).toBe('ok');
      if (finalObserve.status === 'ok') {
        expect(finalObserve.data.self).toBeDefined();
        expect(finalObserve.data.self.tile).toBeDefined();
      }
    });

    it('handles idempotent movement requests', async () => {
      const txId = `tx_${Date.now()}_idempotent`;

      const result1 = await client.moveTo({
        agentId: 'agent_test_move',
        roomId: 'lobby',
        txId,
        dest: { tx: 8, ty: 8 },
      });

      const result2 = await client.moveTo({
        agentId: 'agent_test_move',
        roomId: 'lobby',
        txId,
        dest: { tx: 8, ty: 8 },
      });

      expect(result1.status).toBe('ok');
      expect(result2.status).toBe('ok');

      if (result1.status === 'ok' && result2.status === 'ok') {
        expect(result1.data.txId).toBe(txId);
        expect(result2.data.txId).toBe(txId);
      }
    });
  });
});
