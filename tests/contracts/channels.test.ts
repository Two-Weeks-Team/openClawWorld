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
import type { ChannelsResponseData, ChannelInfo } from '@openclawworld/plugin';

describe('Channels Endpoint Contract Tests', () => {
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
    it('returns channel list successfully', async () => {
      const channels: ChannelInfo[] = [
        { channelId: 'ch_lobby', maxAgents: 50, currentAgents: 12, status: 'open' },
        { channelId: 'ch_meeting', maxAgents: 20, currentAgents: 5, status: 'open' },
      ];
      const responseData: ChannelsResponseData = { channels };

      mockServer.setHandler('/channels', () => jsonResponse(createOkResult(responseData)));

      const result = await client.channels();

      expectOkResult(result);
      expect(result.data.channels).toHaveLength(2);
      expect(result.data.channels[0].channelId).toBe('ch_lobby');
    });

    it('returns empty channel list when no channels available', async () => {
      const responseData: ChannelsResponseData = { channels: [] };

      mockServer.setHandler('/channels', () => jsonResponse(createOkResult(responseData)));

      const result = await client.channels();

      expectOkResult(result);
      expect(result.data.channels).toHaveLength(0);
    });

    it('returns channels with all required fields', async () => {
      const channel: ChannelInfo = {
        channelId: 'ch_main',
        maxAgents: 100,
        currentAgents: 42,
        status: 'open',
      };
      const responseData: ChannelsResponseData = { channels: [channel] };

      mockServer.setHandler('/channels', () => jsonResponse(createOkResult(responseData)));

      const result = await client.channels();

      expectOkResult(result);
      const ch = result.data.channels[0];
      expect(ch).toHaveProperty('channelId');
      expect(ch).toHaveProperty('maxAgents');
      expect(ch).toHaveProperty('currentAgents');
      expect(ch).toHaveProperty('status');
    });
  });

  describe('Error Responses', () => {
    it('returns internal error on server failure', async () => {
      mockServer.setHandler('/channels', () =>
        jsonResponse(createErrorResult('internal', 'Internal server error', true), 500)
      );

      const result = await client.channels();

      expectErrorResult(result, 'internal');
    });

    it('returns unauthorized error with invalid API key', async () => {
      mockServer.setHandler('/channels', () =>
        jsonResponse(createErrorResult('unauthorized', 'Invalid API key', false), 401)
      );

      const result = await client.channels();

      expectErrorResult(result, 'unauthorized');
    });
  });

  describe('Response Format Validation', () => {
    it('returns AicResult wrapper with status ok', async () => {
      const responseData: ChannelsResponseData = { channels: [] };

      mockServer.setHandler('/channels', () => jsonResponse(createOkResult(responseData)));

      const result = await client.channels();

      expect(result).toHaveProperty('status');
      expect(result.status).toBe('ok');
      expect(result).toHaveProperty('data');
      if (result.status === 'ok') {
        expect(result.data).toHaveProperty('channels');
        expect(Array.isArray(result.data.channels)).toBe(true);
      }
    });

    it('returns AicResult wrapper with status error', async () => {
      mockServer.setHandler('/channels', () =>
        jsonResponse(createErrorResult('internal', 'Server error', true), 500)
      );

      const result = await client.channels();

      expect(result).toHaveProperty('status');
      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error).toHaveProperty('code');
        expect(result.error).toHaveProperty('message');
        expect(result.error).toHaveProperty('retryable');
      }
    });
  });

  describe('Response Data Validation', () => {
    it('channel currentAgents does not exceed maxAgents', async () => {
      const channels: ChannelInfo[] = [
        { channelId: 'ch_a', maxAgents: 50, currentAgents: 30, status: 'open' },
        { channelId: 'ch_b', maxAgents: 20, currentAgents: 20, status: 'full' },
      ];

      mockServer.setHandler('/channels', () => jsonResponse(createOkResult({ channels })));

      const result = await client.channels();

      expectOkResult(result);
      for (const ch of result.data.channels) {
        expect(ch.currentAgents).toBeLessThanOrEqual(ch.maxAgents);
      }
    });

    it('channelId has valid format', async () => {
      const channels: ChannelInfo[] = [
        { channelId: 'ch_lobby', maxAgents: 50, currentAgents: 10, status: 'open' },
      ];

      mockServer.setHandler('/channels', () => jsonResponse(createOkResult({ channels })));

      const result = await client.channels();

      expectOkResult(result);
      for (const ch of result.data.channels) {
        expect(ch.channelId.length).toBeGreaterThan(0);
      }
    });
  });
});
