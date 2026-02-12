/**
 * Generated Tool Implementations
 * AUTO-GENERATED from OpenAPI spec - DO NOT EDIT
 */

import type { AicResult, ObserveRequest, MoveToRequest, InteractRequest, ChatSendRequest, ChatObserveRequest, PollEventsRequest, ObserveResponseData, MoveToResponseData, InteractResponseData, ChatSendResponseData, ChatObserveResponseData, PollEventsResponseData } from '@openclawworld/shared';
import {
  ObserveRequestSchema,
  MoveToRequestSchema,
  InteractRequestSchema,
  ChatSendRequestSchema,
  ChatObserveRequestSchema,
  PollEventsRequestSchema,
  ObserveResponseDataSchema,
  MoveToResponseDataSchema,
  InteractResponseDataSchema,
  ChatSendResponseDataSchema,
  ChatObserveResponseDataSchema,
  PollEventsResponseDataSchema,
  createResultSchema,
} from '@openclawworld/shared';
import type { OpenClawWorldClient } from '../client.js';
import type { PluginConfig } from '../config.js';
import { isToolEnabled, createForbiddenError } from '../config.js';

export type ObserveToolInput = ObserveRequest;
export type ObserveToolOutput = AicResult<ObserveResponseData>;
export const ObserveToolInputSchema = ObserveRequestSchema;
export const ObserveToolOutputSchema = createResultSchema(ObserveResponseDataSchema);
export interface ObserveToolOptions {
  defaultRoomId?: string;
  defaultAgentId?: string;
}

export async function executeObserveTool(
  client: OpenClawWorldClient,
  input: unknown,
  options: ObserveToolOptions,
): Promise<ObserveToolOutput> {
  const parseResult = ObserveToolInputSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      status: 'error',
      error: {
        code: 'bad_request',
        message: `Invalid input: ${parseResult.error.message}`,
        retryable: false,
      },
    };
  }

  const validatedInput = parseResult.data;
  const request: ObserveRequest = {
    agentId: validatedInput.agentId ?? options.defaultAgentId ?? '',
    roomId: validatedInput.roomId ?? options.defaultRoomId ?? '',
    radius: validatedInput.radius,
    detail: validatedInput.detail,
    includeSelf: validatedInput.includeSelf,
  };

  if (!request.agentId) {
    return {
      status: 'error',
      error: {
        code: 'bad_request',
        message: 'agentId is required and no default is configured',
        retryable: false,
      },
    };
  }

  if (!request.roomId) {
    return {
      status: 'error',
      error: {
        code: 'bad_request',
        message: 'roomId is required and no default is configured',
        retryable: false,
      },
    };
  }

  return client.observe(request);
}

export type MoveToToolInput = MoveToRequest;
export type MoveToToolOutput = AicResult<MoveToResponseData>;
export const MoveToToolInputSchema = MoveToRequestSchema;
export const MoveToToolOutputSchema = createResultSchema(MoveToResponseDataSchema);
export interface MoveToToolOptions {
  defaultRoomId?: string;
  defaultAgentId?: string;
  config: PluginConfig;
}

const MOVETO_TOOL_NAME = 'ocw.move_to';

export async function executeMoveToTool(
  client: OpenClawWorldClient,
  input: unknown,
  options: MoveToToolOptions,
): Promise<MoveToToolOutput> {
  if (!isToolEnabled(MOVETO_TOOL_NAME, options.config)) {
    return createForbiddenError(MOVETO_TOOL_NAME);
  }

  const parseResult = MoveToToolInputSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      status: 'error',
      error: {
        code: 'bad_request',
        message: `Invalid input: ${parseResult.error.message}`,
        retryable: false,
      },
    };
  }

  const validatedInput = parseResult.data;
  const request: MoveToRequest = {
    agentId: validatedInput.agentId ?? options.defaultAgentId ?? '',
    roomId: validatedInput.roomId ?? options.defaultRoomId ?? '',
    txId: validatedInput.txId,
    dest: validatedInput.dest,
    mode: validatedInput.mode,
  };

  if (!request.agentId) {
    return {
      status: 'error',
      error: {
        code: 'bad_request',
        message: 'agentId is required and no default is configured',
        retryable: false,
      },
    };
  }

  if (!request.roomId) {
    return {
      status: 'error',
      error: {
        code: 'bad_request',
        message: 'roomId is required and no default is configured',
        retryable: false,
      },
    };
  }

  return client.moveTo(request);
}

export type InteractToolInput = InteractRequest;
export type InteractToolOutput = AicResult<InteractResponseData>;
export const InteractToolInputSchema = InteractRequestSchema;
export const InteractToolOutputSchema = createResultSchema(InteractResponseDataSchema);
export interface InteractToolOptions {
  defaultRoomId?: string;
  defaultAgentId?: string;
  config: PluginConfig;
}

const INTERACT_TOOL_NAME = 'ocw.interact';

export async function executeInteractTool(
  client: OpenClawWorldClient,
  input: unknown,
  options: InteractToolOptions,
): Promise<InteractToolOutput> {
  if (!isToolEnabled(INTERACT_TOOL_NAME, options.config)) {
    return createForbiddenError(INTERACT_TOOL_NAME);
  }

  const parseResult = InteractToolInputSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      status: 'error',
      error: {
        code: 'bad_request',
        message: `Invalid input: ${parseResult.error.message}`,
        retryable: false,
      },
    };
  }

  const validatedInput = parseResult.data;
  const request: InteractRequest = {
    agentId: validatedInput.agentId ?? options.defaultAgentId ?? '',
    roomId: validatedInput.roomId ?? options.defaultRoomId ?? '',
    txId: validatedInput.txId,
    targetId: validatedInput.targetId,
    action: validatedInput.action,
    params: validatedInput.params,
  };

  if (!request.agentId) {
    return {
      status: 'error',
      error: {
        code: 'bad_request',
        message: 'agentId is required and no default is configured',
        retryable: false,
      },
    };
  }

  if (!request.roomId) {
    return {
      status: 'error',
      error: {
        code: 'bad_request',
        message: 'roomId is required and no default is configured',
        retryable: false,
      },
    };
  }

  return client.interact(request);
}

export type ChatSendToolInput = ChatSendRequest;
export type ChatSendToolOutput = AicResult<ChatSendResponseData>;
export const ChatSendToolInputSchema = ChatSendRequestSchema;
export const ChatSendToolOutputSchema = createResultSchema(ChatSendResponseDataSchema);
export interface ChatSendToolOptions {
  defaultRoomId?: string;
  defaultAgentId?: string;
  config: PluginConfig;
}

const CHATSEND_TOOL_NAME = 'ocw.chat_send';

export async function executeChatSendTool(
  client: OpenClawWorldClient,
  input: unknown,
  options: ChatSendToolOptions,
): Promise<ChatSendToolOutput> {
  if (!isToolEnabled(CHATSEND_TOOL_NAME, options.config)) {
    return createForbiddenError(CHATSEND_TOOL_NAME);
  }

  const parseResult = ChatSendToolInputSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      status: 'error',
      error: {
        code: 'bad_request',
        message: `Invalid input: ${parseResult.error.message}`,
        retryable: false,
      },
    };
  }

  const validatedInput = parseResult.data;
  const request: ChatSendRequest = {
    agentId: validatedInput.agentId ?? options.defaultAgentId ?? '',
    roomId: validatedInput.roomId ?? options.defaultRoomId ?? '',
    txId: validatedInput.txId,
    channel: validatedInput.channel,
    message: validatedInput.message,
  };

  if (!request.agentId) {
    return {
      status: 'error',
      error: {
        code: 'bad_request',
        message: 'agentId is required and no default is configured',
        retryable: false,
      },
    };
  }

  if (!request.roomId) {
    return {
      status: 'error',
      error: {
        code: 'bad_request',
        message: 'roomId is required and no default is configured',
        retryable: false,
      },
    };
  }

  return client.chatSend(request);
}

export type ChatObserveToolInput = ChatObserveRequest;
export type ChatObserveToolOutput = AicResult<ChatObserveResponseData>;
export const ChatObserveToolInputSchema = ChatObserveRequestSchema;
export const ChatObserveToolOutputSchema = createResultSchema(ChatObserveResponseDataSchema);
export interface ChatObserveToolOptions {
  defaultRoomId?: string;
  defaultAgentId?: string;
  config: PluginConfig;
}

const CHATOBSERVE_TOOL_NAME = 'ocw.chat_observe';

export async function executeChatObserveTool(
  client: OpenClawWorldClient,
  input: unknown,
  options: ChatObserveToolOptions,
): Promise<ChatObserveToolOutput> {
  if (!isToolEnabled(CHATOBSERVE_TOOL_NAME, options.config)) {
    return createForbiddenError(CHATOBSERVE_TOOL_NAME);
  }

  const parseResult = ChatObserveToolInputSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      status: 'error',
      error: {
        code: 'bad_request',
        message: `Invalid input: ${parseResult.error.message}`,
        retryable: false,
      },
    };
  }

  const validatedInput = parseResult.data;
  const request: ChatObserveRequest = {
    agentId: validatedInput.agentId ?? options.defaultAgentId ?? '',
    roomId: validatedInput.roomId ?? options.defaultRoomId ?? '',
    windowSec: validatedInput.windowSec,
    channel: validatedInput.channel,
  };

  if (!request.agentId) {
    return {
      status: 'error',
      error: {
        code: 'bad_request',
        message: 'agentId is required and no default is configured',
        retryable: false,
      },
    };
  }

  if (!request.roomId) {
    return {
      status: 'error',
      error: {
        code: 'bad_request',
        message: 'roomId is required and no default is configured',
        retryable: false,
      },
    };
  }

  return client.chatObserve(request);
}

export type PollEventsToolInput = PollEventsRequest;
export type PollEventsToolOutput = AicResult<PollEventsResponseData>;
export const PollEventsToolInputSchema = PollEventsRequestSchema;
export const PollEventsToolOutputSchema = createResultSchema(PollEventsResponseDataSchema);
export interface PollEventsToolOptions {
  defaultRoomId?: string;
  defaultAgentId?: string;
}

export async function executePollEventsTool(
  client: OpenClawWorldClient,
  input: unknown,
  options: PollEventsToolOptions,
): Promise<PollEventsToolOutput> {
  const parseResult = PollEventsToolInputSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      status: 'error',
      error: {
        code: 'bad_request',
        message: `Invalid input: ${parseResult.error.message}`,
        retryable: false,
      },
    };
  }

  const validatedInput = parseResult.data;
  const request: PollEventsRequest = {
    agentId: validatedInput.agentId ?? options.defaultAgentId ?? '',
    roomId: validatedInput.roomId ?? options.defaultRoomId ?? '',
    sinceCursor: validatedInput.sinceCursor,
    limit: validatedInput.limit,
    waitMs: validatedInput.waitMs,
  };

  if (!request.agentId) {
    return {
      status: 'error',
      error: {
        code: 'bad_request',
        message: 'agentId is required and no default is configured',
        retryable: false,
      },
    };
  }

  if (!request.roomId) {
    return {
      status: 'error',
      error: {
        code: 'bad_request',
        message: 'roomId is required and no default is configured',
        retryable: false,
      },
    };
  }

  return client.pollEvents(request);
}
