import type { AicResult, ChatObserveRequest, ChatObserveResponseData } from '@openclawworld/shared';
import {
  ChatObserveRequestSchema,
  ChatObserveResponseDataSchema,
  createResultSchema,
} from '@openclawworld/shared';
import type { OpenClawWorldClient } from '../client.js';

export type ChatObserveToolInput = ChatObserveRequest;
export type ChatObserveToolOutput = AicResult<ChatObserveResponseData>;

export const ChatObserveToolInputSchema = ChatObserveRequestSchema;
export const ChatObserveToolOutputSchema = createResultSchema(ChatObserveResponseDataSchema);

export interface ChatObserveToolOptions {
  defaultRoomId?: string;
  defaultAgentId?: string;
}

export async function executeChatObserveTool(
  client: OpenClawWorldClient,
  input: unknown,
  options: ChatObserveToolOptions = {}
): Promise<ChatObserveToolOutput> {
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
