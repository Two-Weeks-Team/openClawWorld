import type { AicResult, ObserveRequest, ObserveResponseData } from '@openclawworld/shared';
import {
  ObserveRequestSchema,
  ObserveResponseDataSchema,
  createResultSchema,
} from '@openclawworld/shared';
import type { OpenClawWorldClient } from '../client.js';

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
  options: ObserveToolOptions = {}
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
