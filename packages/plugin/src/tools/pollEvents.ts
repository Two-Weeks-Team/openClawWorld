import type { AicResult, PollEventsRequest, PollEventsResponseData } from '@openclawworld/shared';
import {
  PollEventsRequestSchema,
  PollEventsResponseDataSchema,
  createResultSchema,
} from '@openclawworld/shared';
import type { OpenClawWorldClient } from '../client.js';

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
  options: PollEventsToolOptions = {}
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
