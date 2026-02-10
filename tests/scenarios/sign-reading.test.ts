import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OpenClawWorldClient } from '@openclawworld/plugin';
import { setupMockFetch, createOkResult, jsonResponse, TestData } from '../helpers/mock-server.js';
import type { MockServer } from '../helpers/mock-server.js';
import type { ObserveResponseData, InteractResponseData } from '@openclawworld/shared';

describe('Scenario A: Sign Reading', () => {
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

  describe('Step 1: Agent observes and finds nearby sign', () => {
    it('observes environment and finds a sign object', async () => {
      const observeResponse: ObserveResponseData = {
        self: TestData.agent,
        nearby: [
          {
            entity: {
              id: 'obj_welcome_sign',
              kind: 'object',
              name: 'Welcome Sign',
              roomId: 'lobby',
              pos: { x: 110, y: 90 },
              tile: { tx: 11, ty: 9 },
            },
            distance: 12.5,
            affords: [{ action: 'read', label: 'Read Sign' }],
            object: { objectType: 'sign', state: { text: 'Welcome to OpenClawWorld!' } },
          },
        ],
        serverTsMs: TestData.timestamp(),
        room: { roomId: 'lobby', mapId: 'lobby_map', tickRate: 20 },
      };

      mockServer.setHandler('/observe', () => jsonResponse(createOkResult(observeResponse)));

      const result = await client.observe({
        agentId: 'agent_helper',
        roomId: 'lobby',
        radius: 100,
        detail: 'full',
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        const sign = result.data.nearby.find(n => n.entity.kind === 'object');
        expect(sign).toBeDefined();
        expect(sign?.entity.name).toBe('Welcome Sign');
        expect(sign?.affords.some(a => a.action === 'read')).toBe(true);
      }
    });

    it('identifies read affordance on sign', async () => {
      const observeResponse: ObserveResponseData = {
        self: TestData.agent,
        nearby: [
          {
            entity: {
              id: 'obj_direction_sign',
              kind: 'object',
              name: 'Direction Sign',
              roomId: 'lobby',
              pos: { x: 120, y: 100 },
              tile: { tx: 12, ty: 10 },
            },
            distance: 25.0,
            affords: [{ action: 'read', label: 'Read Sign' }],
            object: { objectType: 'sign', state: { text: 'North: Forest, South: Beach' } },
          },
        ],
        serverTsMs: TestData.timestamp(),
        room: { roomId: 'lobby', mapId: 'lobby_map', tickRate: 20 },
      };

      mockServer.setHandler('/observe', () => jsonResponse(createOkResult(observeResponse)));

      const result = await client.observe({
        agentId: 'agent_helper',
        roomId: 'lobby',
        radius: 100,
        detail: 'full',
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        const sign = result.data.nearby.find(n => n.entity.kind === 'object');
        expect(sign?.affords).toHaveLength(1);
        expect(sign?.affords[0]).toEqual({ action: 'read', label: 'Read Sign' });
      }
    });
  });

  describe('Step 2: Agent reads the sign', () => {
    it('successfully reads sign using read action', async () => {
      const txId = TestData.txId();
      const interactResponse: InteractResponseData = {
        txId,
        applied: true,
        serverTsMs: TestData.timestamp(),
        outcome: { type: 'ok', message: 'Welcome to OpenClawWorld!' },
      };

      mockServer.setHandler('/interact', () => jsonResponse(createOkResult(interactResponse)));

      const result = await client.interact({
        agentId: 'agent_helper',
        roomId: 'lobby',
        txId,
        targetId: 'obj_welcome_sign',
        action: 'read',
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.applied).toBe(true);
        expect(result.data.outcome.type).toBe('ok');
        expect(result.data.outcome.message).toContain('Welcome');
      }
    });

    it('receives sign text in interaction response', async () => {
      const txId = TestData.txId();
      const signText = 'Quest: Find the lost artifact in the dungeon';
      const interactResponse: InteractResponseData = {
        txId,
        applied: true,
        serverTsMs: TestData.timestamp(),
        outcome: { type: 'ok', message: signText },
      };

      mockServer.setHandler('/interact', () => jsonResponse(createOkResult(interactResponse)));

      const result = await client.interact({
        agentId: 'agent_helper',
        roomId: 'lobby',
        txId,
        targetId: 'obj_quest_board',
        action: 'read',
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.outcome.message).toBe(signText);
      }
    });
  });

  describe('Full Scenario Flow', () => {
    it('completes sign reading scenario end-to-end', async () => {
      const txId = TestData.txId();

      mockServer.setHandler('/observe', () =>
        jsonResponse(
          createOkResult({
            self: TestData.agent,
            nearby: [
              {
                entity: {
                  id: 'obj_info_sign',
                  kind: 'object',
                  name: 'Info Sign',
                  roomId: 'lobby',
                  pos: { x: 105, y: 95 },
                  tile: { tx: 10, ty: 9 },
                },
                distance: 8.0,
                affords: [{ action: 'read', label: 'Read Sign' }],
                object: { objectType: 'sign', state: { text: 'Rules: Be kind!' } },
              },
            ],
            serverTsMs: TestData.timestamp(),
            room: { roomId: 'lobby', mapId: 'lobby_map', tickRate: 20 },
          })
        )
      );

      mockServer.setHandler('/interact', () =>
        jsonResponse(
          createOkResult({
            txId,
            applied: true,
            serverTsMs: TestData.timestamp(),
            outcome: { type: 'ok', message: 'Rules: Be kind!' },
          })
        )
      );

      const observeResult = await client.observe({
        agentId: 'agent_helper',
        roomId: 'lobby',
        radius: 100,
        detail: 'full',
      });

      expect(observeResult.status).toBe('ok');
      if (observeResult.status === 'ok') {
        const sign = observeResult.data.nearby.find(n => n.entity.id === 'obj_info_sign');
        expect(sign).toBeDefined();

        const interactResult = await client.interact({
          agentId: 'agent_helper',
          roomId: 'lobby',
          txId,
          targetId: sign!.entity.id,
          action: 'read',
        });

        expect(interactResult.status).toBe('ok');
        if (interactResult.status === 'ok') {
          expect(interactResult.data.outcome.message).toBe('Rules: Be kind!');
        }
      }
    });
  });
});
