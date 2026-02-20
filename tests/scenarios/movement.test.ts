import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OpenClawWorldClient } from '@openclawworld/plugin';
import { setupMockFetch, createOkResult, jsonResponse, TestData } from '../helpers/mock-server.js';
import type { MockServer } from '../helpers/mock-server.js';
import type {
  MoveToResponseData,
  PollEventsResponseData,
  ObserveResponseData,
  EventType,
} from '@openclawworld/shared';

describe('Scenario C: Movement', () => {
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

  describe('Step 1: Agent requests movement', () => {
    it('sends moveTo request and receives accepted response', async () => {
      const txId = TestData.txId();
      const responseData: MoveToResponseData = {
        txId,
        applied: true,
        serverTsMs: TestData.timestamp(),
        result: 'accepted',
      };

      mockServer.setHandler('/moveTo', () => jsonResponse(createOkResult(responseData)));

      const result = await client.moveTo({
        agentId: 'agent_helper',
        roomId: 'lobby',
        txId,
        dest: { tx: 20, ty: 15 },
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.result).toBe('accepted');
        expect(result.data.applied).toBe(true);
      }
    });

    it('receives rejected response for blocked destination', async () => {
      const txId = TestData.txId();
      const responseData: MoveToResponseData = {
        txId,
        applied: false,
        serverTsMs: TestData.timestamp(),
        result: 'rejected',
      };

      mockServer.setHandler('/moveTo', () => jsonResponse(createOkResult(responseData)));

      const result = await client.moveTo({
        agentId: 'agent_helper',
        roomId: 'lobby',
        txId,
        dest: { tx: 0, ty: 0 },
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.result).toBe('rejected');
        expect(result.data.applied).toBe(false);
      }
    });
  });

  describe('Step 2: Movement completes', () => {
    it('receives updated position in observe response', async () => {
      const responseData: ObserveResponseData = {
        self: {
          id: 'agt_agent_helper',
          kind: 'agent',
          name: 'Helper Bot',
          roomId: 'lobby',
          pos: { x: 200, y: 150 },
          tile: { tx: 20, ty: 15 },
          facing: 'right',
        },
        nearby: [],
        facilities: [],
        serverTsMs: TestData.timestamp(),
        room: { roomId: 'lobby', mapId: 'lobby_map', tickRate: 20 },
      };

      mockServer.setHandler('/observe', () => jsonResponse(createOkResult(responseData)));

      const result = await client.observe({
        agentId: 'agent_helper',
        roomId: 'lobby',
        radius: 100,
        detail: 'full',
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.self.tile).toEqual({ tx: 20, ty: 15 });
        expect(result.data.self.pos).toEqual({ x: 200, y: 150 });
      }
    });

    it('verifies agent moved to requested destination', async () => {
      const destTile = { tx: 25, ty: 20 };
      const responseData: ObserveResponseData = {
        self: {
          id: 'agt_agent_helper',
          kind: 'agent',
          name: 'Helper Bot',
          roomId: 'lobby',
          pos: { x: 250, y: 200 },
          tile: destTile,
          facing: 'down',
        },
        nearby: [],
        facilities: [],
        serverTsMs: TestData.timestamp(),
        room: { roomId: 'lobby', mapId: 'lobby_map', tickRate: 20 },
      };

      mockServer.setHandler('/observe', () => jsonResponse(createOkResult(responseData)));

      const result = await client.observe({
        agentId: 'agent_helper',
        roomId: 'lobby',
        radius: 100,
        detail: 'full',
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.self.tile?.tx).toBe(destTile.tx);
        expect(result.data.self.tile?.ty).toBe(destTile.ty);
      }
    });
  });

  describe('Movement Events', () => {
    it('triggers proximity events when moving near other entities', async () => {
      const responseData: PollEventsResponseData = {
        events: [
          {
            cursor: TestData.cursor(1),
            type: 'proximity.enter' as EventType,
            roomId: 'lobby',
            tsMs: TestData.timestamp(),
            payload: { subjectId: 'agt_agent_helper', otherId: 'hum_player1', distance: 25.5 },
          },
        ],
        nextCursor: TestData.cursor(2),
        serverTsMs: TestData.timestamp(),
        cursorExpired: false,
      };

      mockServer.setHandler('/pollEvents', () => jsonResponse(createOkResult(responseData)));

      const result = await client.pollEvents({
        agentId: 'agent_helper',
        roomId: 'lobby',
        sinceCursor: TestData.cursor(0),
      });

      expect(result.status).toBe('ok');
      if (result.status === 'ok') {
        expect(result.data.events[0].type).toBe('proximity.enter');
        expect(result.data.events[0].payload.subjectId).toBe('agt_agent_helper');
      }
    });
  });

  describe('Full Scenario Flow', () => {
    it('completes movement scenario end-to-end', async () => {
      const txId = TestData.txId();
      const destination = { tx: 30, ty: 25 };

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

      mockServer.setHandler('/observe', () =>
        jsonResponse(
          createOkResult({
            self: {
              id: 'agt_agent_helper',
              kind: 'agent',
              name: 'Helper Bot',
              roomId: 'lobby',
              pos: { x: 300, y: 250 },
              tile: destination,
              facing: 'right',
            },
            nearby: [],
            serverTsMs: TestData.timestamp(),
            room: { roomId: 'lobby', mapId: 'lobby_map', tickRate: 20 },
          })
        )
      );

      const moveResult = await client.moveTo({
        agentId: 'agent_helper',
        roomId: 'lobby',
        txId,
        dest: destination,
      });

      expect(moveResult.status).toBe('ok');
      if (moveResult.status === 'ok') {
        expect(moveResult.data.result).toBe('accepted');

        const observeResult = await client.observe({
          agentId: 'agent_helper',
          roomId: 'lobby',
          radius: 100,
          detail: 'full',
        });

        expect(observeResult.status).toBe('ok');
        if (observeResult.status === 'ok') {
          expect(observeResult.data.self.tile?.tx).toBe(destination.tx);
          expect(observeResult.data.self.tile?.ty).toBe(destination.ty);
        }
      }
    });

    it('handles idempotent movement requests', async () => {
      const txId = TestData.txId();
      let requestCount = 0;

      mockServer.setHandler('/moveTo', () => {
        requestCount++;
        return jsonResponse(
          createOkResult({
            txId,
            applied: requestCount === 1,
            serverTsMs: TestData.timestamp(),
            result: requestCount === 1 ? 'accepted' : 'no_op',
          })
        );
      });

      const result1 = await client.moveTo({
        agentId: 'agent_helper',
        roomId: 'lobby',
        txId,
        dest: { tx: 15, ty: 15 },
      });

      const result2 = await client.moveTo({
        agentId: 'agent_helper',
        roomId: 'lobby',
        txId,
        dest: { tx: 15, ty: 15 },
      });

      expect(result1.status).toBe('ok');
      expect(result2.status).toBe('ok');
      if (result1.status === 'ok' && result2.status === 'ok') {
        expect(result1.data.txId).toBe(result2.data.txId);
      }
    });
  });
});
