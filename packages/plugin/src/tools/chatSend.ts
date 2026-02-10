import type { AicResult, ChatSendRequest, ChatSendResponseData } from '@openclawworld/shared';
import {
  ChatSendRequestSchema,
  ChatSendResponseDataSchema,
  createResultSchema,
} from '@openclawworld/shared';
import type { OpenClawWorldClient } from '../client.js';

export type ChatSendToolInput = ChatSendRequest;
export type ChatSendToolOutput = AicResult<ChatSendResponseData>;

export const ChatSendToolInputSchema = ChatSendRequestSchema;
export const ChatSendToolOutputSchema = createResultSchema(ChatSendResponseDataSchema);

export interface ChatSendToolOptions {
  defaultRoomId?: string;
  defaultAgentId?: string;
}

export async function executeChatSendTool(
  client: OpenClawWorldClient,
  input: unknown,
  options: ChatSendToolOptions = {}
): Promise<ChatSendToolOutput> {
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
