/**
 * OpenClawWorld API Client
 *
 * Wraps orval-generated endpoint functions with a class-based API for
 * backwards compatibility. The underlying HTTP calls, retry logic, and
 * auth handling are provided by the custom-fetch mutator.
 *
 * Generated endpoints: packages/plugin/src/generated/endpoints.ts
 * Custom fetch wrapper: packages/plugin/src/custom-fetch.ts
 */
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
import { setFetchConfig } from './custom-fetch.js';
import {
  register as generatedRegister,
  unregister as generatedUnregister,
  observe as generatedObserve,
  moveTo as generatedMoveTo,
  interact as generatedInteract,
  chatSend as generatedChatSend,
  chatObserve as generatedChatObserve,
  pollEvents as generatedPollEvents,
  profileUpdate as generatedProfileUpdate,
  skillList as generatedSkillList,
  skillInstall as generatedSkillInstall,
  skillInvoke as generatedSkillInvoke,
  channels as generatedChannels,
  reconnect as generatedReconnect,
  heartbeat as generatedHeartbeat,
  meetingList as generatedMeetingList,
  meetingJoin as generatedMeetingJoin,
  meetingLeave as generatedMeetingLeave,
} from './generated/endpoints.js';

/**
 * Unwrap orval response envelope to AicResult.
 *
 * orval wraps responses in { data, status, headers } but the actual
 * server response (which is the AicResult) is already returned directly
 * by our customFetch, so we just cast through.
 */
function unwrap<T>(response: unknown): AicResult<T> {
  // Our customFetch returns the parsed JSON body directly (AicResult),
  // not the orval response envelope, because we return the data directly.
  return response as AicResult<T>;
}

export class OpenClawWorldClient {
  private readonly config: PluginConfig;
  private readonly retryConfig: RetryConfig;

  constructor(config: PluginConfig) {
    this.config = config;
    this.retryConfig = getRetryConfig(config);

    // Configure the shared fetch wrapper used by all generated endpoints
    setFetchConfig({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      maxAttempts: this.retryConfig.maxAttempts,
      baseDelayMs: this.retryConfig.baseDelayMs,
    });
  }

  /**
   * Check server reachability and return status information.
   * This uses a custom implementation (GET /status) that differs from
   * standard AIC endpoints -- it is NOT part of the OpenAPI spec.
   */
  async status(params?: {
    roomId?: string;
    agentId?: string;
  }): Promise<AicResult<StatusResponseData>> {
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

  async register(params: RegisterRequest): Promise<AicResult<RegisterResponseData>> {
    return unwrap<RegisterResponseData>(await generatedRegister(params));
  }

  async unregister(params: UnregisterRequest): Promise<AicResult<UnregisterResponseData>> {
    return unwrap<UnregisterResponseData>(await generatedUnregister(params));
  }

  async observe(params: ObserveRequest): Promise<AicResult<ObserveResponseData>> {
    return unwrap<ObserveResponseData>(await generatedObserve(params));
  }

  async pollEvents(params: PollEventsRequest): Promise<AicResult<PollEventsResponseData>> {
    return unwrap<PollEventsResponseData>(await generatedPollEvents(params));
  }

  async moveTo(params: MoveToRequest): Promise<AicResult<MoveToResponseData>> {
    return unwrap<MoveToResponseData>(await generatedMoveTo(params));
  }

  async interact(params: InteractRequest): Promise<AicResult<InteractResponseData>> {
    return unwrap<InteractResponseData>(await generatedInteract(params));
  }

  async chatSend(params: ChatSendRequest): Promise<AicResult<ChatSendResponseData>> {
    return unwrap<ChatSendResponseData>(await generatedChatSend(params));
  }

  async chatObserve(params: ChatObserveRequest): Promise<AicResult<ChatObserveResponseData>> {
    return unwrap<ChatObserveResponseData>(await generatedChatObserve(params));
  }

  async channels(): Promise<AicResult<ChannelsResponseData>> {
    return unwrap<ChannelsResponseData>(await generatedChannels());
  }

  async reconnect(params: ReconnectRequest): Promise<AicResult<ReconnectResponseData>> {
    return unwrap<ReconnectResponseData>(await generatedReconnect(params));
  }

  async heartbeat(params: HeartbeatRequest): Promise<AicResult<HeartbeatResponseData>> {
    return unwrap<HeartbeatResponseData>(await generatedHeartbeat(params));
  }

  async profileUpdate(params: ProfileUpdateRequest): Promise<AicResult<ProfileUpdateResponseData>> {
    return unwrap<ProfileUpdateResponseData>(await generatedProfileUpdate(params));
  }

  async skillList(params: SkillListRequest): Promise<AicResult<SkillListResponseData>> {
    return unwrap<SkillListResponseData>(await generatedSkillList(params));
  }

  async skillInstall(params: SkillInstallRequest): Promise<AicResult<SkillInstallResponseData>> {
    return unwrap<SkillInstallResponseData>(await generatedSkillInstall(params));
  }

  async skillInvoke(params: SkillInvokeRequest): Promise<AicResult<SkillInvokeResponseData>> {
    return unwrap<SkillInvokeResponseData>(await generatedSkillInvoke(params));
  }

  async meetingList(params: MeetingListRequest): Promise<AicResult<MeetingListResponseData>> {
    return unwrap<MeetingListResponseData>(await generatedMeetingList(params));
  }

  async meetingJoin(params: MeetingJoinRequest): Promise<AicResult<MeetingJoinResponseData>> {
    return unwrap<MeetingJoinResponseData>(await generatedMeetingJoin(params));
  }

  async meetingLeave(params: MeetingLeaveRequest): Promise<AicResult<MeetingLeaveResponseData>> {
    return unwrap<MeetingLeaveResponseData>(await generatedMeetingLeave(params));
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
