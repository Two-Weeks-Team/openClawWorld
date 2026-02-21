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
  ChatObserveRequest,
  ChatObserveResponseData,
  RegisterRequest,
  RegisterResponseData,
  ReconnectRequest,
  ReconnectResponseData,
  UnregisterRequest,
  UnregisterResponseData,
  ProfileUpdateRequest,
  ProfileUpdateResponseData,
  MeetingListRequest,
  MeetingListResponseData,
  MeetingJoinRequest,
  MeetingJoinResponseData,
  MeetingLeaveRequest,
  MeetingLeaveResponseData,
  SkillListRequest,
  SkillListResponseData,
  SkillInstallRequest,
  SkillInstallResponseData,
  SkillInvokeRequest,
  SkillInvokeResponseData,
  HeartbeatRequest,
} from '@openclawworld/shared';

export type HeartbeatResponseData = {
  agentId: string;
  serverTsMs: number;
  timeoutMs: number;
  recommendedIntervalMs: number;
};

export type ChannelInfo = {
  channelId: string;
  maxAgents: number;
  currentAgents: number;
  status: string;
};

export type ChannelsResponseData = {
  channels: ChannelInfo[];
};
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

  private async requestGet<T>(endpoint: string, attempt = 1): Promise<AicResult<T>> {
    const url = `${this.config.baseUrl.replace(/\/$/, '')}${endpoint}`;
    const headers: Record<string, string> = {};
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    try {
      const response = await fetch(url, { method: 'GET', headers });
      const data = (await response.json()) as AicResult<T>;
      if (!response.ok) {
        if (data.status === 'error' && data.error) {
          const error = data.error;
          const retryable = error.retryable || isRetryableErrorCode(error.code);
          if (retryable && attempt < this.retryConfig.maxAttempts) {
            const delay = calculateBackoff(attempt, this.retryConfig.baseDelayMs);
            await sleep(delay);
            return this.requestGet<T>(endpoint, attempt + 1);
          }
          return data;
        }
        return {
          status: 'error',
          error: {
            code: 'internal',
            message: `HTTP ${response.status}: ${response.statusText}`,
            retryable: true,
          },
        };
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
        return this.requestGet<T>(endpoint, attempt + 1);
      }
      return {
        status: 'error',
        error: {
          code: 'internal',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: isNetworkError,
        },
      };
    }
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

  async chatObserve(params: ChatObserveRequest): Promise<AicResult<ChatObserveResponseData>> {
    return this.request<ChatObserveResponseData>('/chatObserve', params);
  }

  async register(params: RegisterRequest): Promise<AicResult<RegisterResponseData>> {
    return this.request<RegisterResponseData>('/register', params);
  }

  async channels(): Promise<AicResult<ChannelsResponseData>> {
    return this.requestGet<ChannelsResponseData>('/channels');
  }

  async reconnect(params: ReconnectRequest): Promise<AicResult<ReconnectResponseData>> {
    return this.request<ReconnectResponseData>('/reconnect', params);
  }

  async heartbeat(params: HeartbeatRequest): Promise<AicResult<HeartbeatResponseData>> {
    return this.request<HeartbeatResponseData>('/heartbeat', params);
  }

  async unregister(params: UnregisterRequest): Promise<AicResult<UnregisterResponseData>> {
    return this.request<UnregisterResponseData>('/unregister', params);
  }

  async profileUpdate(params: ProfileUpdateRequest): Promise<AicResult<ProfileUpdateResponseData>> {
    return this.request<ProfileUpdateResponseData>('/profile/update', params);
  }

  async skillList(params: SkillListRequest): Promise<AicResult<SkillListResponseData>> {
    return this.request<SkillListResponseData>('/skill/list', params);
  }

  async skillInstall(params: SkillInstallRequest): Promise<AicResult<SkillInstallResponseData>> {
    return this.request<SkillInstallResponseData>('/skill/install', params);
  }

  async skillInvoke(params: SkillInvokeRequest): Promise<AicResult<SkillInvokeResponseData>> {
    return this.request<SkillInvokeResponseData>('/skill/invoke', params);
  }

  async meetingList(params: MeetingListRequest): Promise<AicResult<MeetingListResponseData>> {
    return this.request<MeetingListResponseData>('/meeting/list', params);
  }

  async meetingJoin(params: MeetingJoinRequest): Promise<AicResult<MeetingJoinResponseData>> {
    return this.request<MeetingJoinResponseData>('/meeting/join', params);
  }

  async meetingLeave(params: MeetingLeaveRequest): Promise<AicResult<MeetingLeaveResponseData>> {
    return this.request<MeetingLeaveResponseData>('/meeting/leave', params);
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
  ChatObserveRequest,
  ChatObserveResponseData,
  RegisterRequest,
  RegisterResponseData,
  ReconnectRequest,
  ReconnectResponseData,
  UnregisterRequest,
  UnregisterResponseData,
  ProfileUpdateRequest,
  ProfileUpdateResponseData,
  MeetingListRequest,
  MeetingListResponseData,
  MeetingJoinRequest,
  MeetingJoinResponseData,
  MeetingLeaveRequest,
  MeetingLeaveResponseData,
  SkillListRequest,
  SkillListResponseData,
  SkillInstallRequest,
  SkillInstallResponseData,
  SkillInvokeRequest,
  SkillInvokeResponseData,
  HeartbeatRequest,
};
