import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OpenClawWorldClient } from '@openclawworld/plugin';
import { startTestServer, getTestApiKey, type TestServer } from './test-server.js';

describe('Integration: Scenario A - Sign Reading', () => {
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

  describe('Step 1: Agent observes and finds nearby sign', () => {
    it('observes environment and finds objects', async () => {
      const result = await client.observe({
        agentId: 'agent_test_sign',
        roomId: 'lobby',
        radius: 100,
        detail: 'full',
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.self).toBeDefined();
        expect(result.data.room).toBeDefined();
        expect(Array.isArray(result.data.nearby)).toBe(true);
      }
    });

    it('receives valid room information', async () => {
      const result = await client.observe({
        agentId: 'agent_test_sign',
        roomId: 'lobby',
        radius: 100,
        detail: 'full',
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.room.roomId).toBe('lobby');
        expect(result.data.room.mapId).toBeDefined();
        expect(typeof result.data.room.tickRate).toBe('number');
        expect(result.data.serverTsMs).toBeGreaterThan(0);
      }
    });
  });

  describe('Step 2: Agent attempts to interact', () => {
    it('can send interact request for read action', async () => {
      const txId = `tx_${Date.now()}_read`;

      const result = await client.interact({
        agentId: 'agent_test_sign',
        roomId: 'lobby',
        txId,
        targetId: 'obj_sign_test',
        action: 'read',
      });

      expect(result.status).toBeDefined();
      if (result.status === 'ok') {
        expect(typeof result.data.applied).toBe('boolean');
        expect(result.data.txId).toBe(txId);
      }
    });

    it('handles non-existent object gracefully', async () => {
      const txId = `tx_${Date.now()}_nonexistent`;

      const result = await client.interact({
        agentId: 'agent_test_sign',
        roomId: 'lobby',
        txId,
        targetId: 'obj_does_not_exist',
        action: 'read',
      });

      expect(result.status).toBeDefined();
      if (result.status === 'ok') {
        expect(result.data.applied).toBe(false);
      } else {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Full Scenario Flow', () => {
    it('completes sign reading scenario against real server', async () => {
      const observeResult = await client.observe({
        agentId: 'agent_test_sign',
        roomId: 'lobby',
        radius: 100,
        detail: 'full',
      });

      expect(observeResult.status).toBe('ok');

      if (observeResult.status === 'ok') {
        const sign = observeResult.data.nearby.find(n => n.affords?.some(a => a.action === 'read'));

        if (sign) {
          const txId = `tx_${Date.now()}_scenario`;
          const interactResult = await client.interact({
            agentId: 'agent_test_sign',
            roomId: 'lobby',
            txId,
            targetId: sign.entity.id,
            action: 'read',
          });

          expect(interactResult.status).toBe('ok');
          if (interactResult.status === 'ok') {
            expect(interactResult.data.txId).toBe(txId);
            expect(typeof interactResult.data.applied).toBe('boolean');
          }
        }
      }
    });
  });
});
