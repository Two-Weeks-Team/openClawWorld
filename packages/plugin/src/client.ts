import type {
  AicResult,
  StatusResponseData,
  ObserveRequest,
  ObserveResponseData,
  PollEventsRequest,
  PollEventsResponseData,
  MoveToRequest,
  MoveToResponseData,
  InteractRequest,
  InteractResponseData,
  ChatSendRequest,
  ChatSendResponseData,
} from '@openclawworld/shared';
import type { PluginConfig, RetryConfig } from './config.js';
import { getRetryConfig } from './config.js';

function isRetryableErrorCode(code: string): boolean {
  const retryableCodes = new Set(['room_not_ready', 'rate_limited', 'timeout', 'internal']);
  return retryableCodes.has(code);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateBackoff(attempt: number, baseDelayMs: number): number {
  return baseDelayMs * Math.pow(2, attempt - 1);
}

export class OpenClawWorldClient {
  private readonly config: PluginConfig;
  private readonly retryConfig: RetryConfig;

  constructor(config: PluginConfig) {
    this.config = config;
    this.retryConfig = getRetryConfig(config);
  }

  private async request<T>(endpoint: string, body: unknown, attempt = 1): Promise<AicResult<T>> {
    const url = `${this.config.baseUrl.replace(/\/$/, '')}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as AicResult<T>;

      if (!response.ok) {
        if (data.status === 'error' && data.error) {
          const error = data.error;
          const retryable = error.retryable || isRetryableErrorCode(error.code);

          if (retryable && attempt < this.retryConfig.maxAttempts) {
            const delay = calculateBackoff(attempt, this.retryConfig.baseDelayMs);
            await sleep(delay);
            return this.request<T>(endpoint, body, attempt + 1);
          }

          return data;
        }

        const errorResult: AicResult<T> = {
          status: 'error',
          error: {
            code: 'internal',
            message: `HTTP ${response.status}: ${response.statusText}`,
            retryable: true,
          },
        };
        return errorResult;
      }

      if (data.status === 'error' && data.error) {
        const error = data.error;
        const retryable = error.retryable || isRetryableErrorCode(error.code);

        if (retryable && attempt < this.retryConfig.maxAttempts) {
          const delay = calculateBackoff(attempt, this.retryConfig.baseDelayMs);
          await sleep(delay);
          return this.request<T>(endpoint, body, attempt + 1);
        }
      }

      return data;
    } catch (error) {
      const isNetworkError =
        error instanceof Error &&
        (error.message.includes('fetch') ||
          error.message.includes('network') ||
          error.message.includes('ECONNREFUSED'));

      if (isNetworkError && attempt < this.retryConfig.maxAttempts) {
        const delay = calculateBackoff(attempt, this.retryConfig.baseDelayMs);
        await sleep(delay);
        return this.request<T>(endpoint, body, attempt + 1);
      }

      const errorResult: AicResult<T> = {
        status: 'error',
        error: {
          code: 'internal',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: isNetworkError,
        },
      };
      return errorResult;
    }
  }

  async status(params?: {
    roomId?: string;
    agentId?: string;
  }): Promise<AicResult<StatusResponseData>> {
    const requestBody: Record<string, string> = {};
    if (params?.roomId) requestBody.roomId = params.roomId;
    if (params?.agentId) requestBody.agentId = params.agentId;

    try {
      const url = `${this.config.baseUrl.replace(/\/$/, '')}/status`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const serverReachable = response.ok;
      let serverTsMs = Date.now();

      try {
        const data = (await response.json()) as { serverTsMs?: number };
        if (data.serverTsMs) serverTsMs = data.serverTsMs;
      } catch {
        // ignore
      }

      const result: AicResult<StatusResponseData> = {
        status: 'ok',
        data: {
          serverReachable,
          baseUrl: this.config.baseUrl,
          serverTsMs,
          roomId: params?.roomId,
          agentId: params?.agentId,
        },
      };
      return result;
    } catch {
      const result: AicResult<StatusResponseData> = {
        status: 'ok',
        data: {
          serverReachable: false,
          baseUrl: this.config.baseUrl,
          serverTsMs: Date.now(),
          roomId: params?.roomId,
          agentId: params?.agentId,
        },
      };
      return result;
    }
  }

  async observe(params: ObserveRequest): Promise<AicResult<ObserveResponseData>> {
    return this.request<ObserveResponseData>('/observe', params);
  }

  async pollEvents(params: PollEventsRequest): Promise<AicResult<PollEventsResponseData>> {
    return this.request<PollEventsResponseData>('/pollEvents', params);
  }

  async moveTo(params: MoveToRequest): Promise<AicResult<MoveToResponseData>> {
    return this.request<MoveToResponseData>('/moveTo', params);
  }

  async interact(params: InteractRequest): Promise<AicResult<InteractResponseData>> {
    return this.request<InteractResponseData>('/interact', params);
  }

  async chatSend(params: ChatSendRequest): Promise<AicResult<ChatSendResponseData>> {
    return this.request<ChatSendResponseData>('/chatSend', params);
  }
}

export type {
  PluginConfig,
  RetryConfig,
  AicResult,
  StatusResponseData,
  ObserveRequest,
  ObserveResponseData,
  PollEventsRequest,
  PollEventsResponseData,
  MoveToRequest,
  MoveToResponseData,
  InteractRequest,
  InteractResponseData,
  ChatSendRequest,
  ChatSendResponseData,
};
