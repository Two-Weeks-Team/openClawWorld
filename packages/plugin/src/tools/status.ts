import type { AicResult, StatusResponseData, StatusRequest } from '@openclawworld/shared';
import {
  StatusRequestSchema,
  StatusResponseDataSchema,
  createResultSchema,
} from '@openclawworld/shared';
import type { OpenClawWorldClient } from '../client.js';

export type StatusToolInput = StatusRequest;
export type StatusToolOutput = AicResult<StatusResponseData>;

export const StatusToolInputSchema = StatusRequestSchema;
export const StatusToolOutputSchema = createResultSchema(StatusResponseDataSchema);

export interface StatusToolOptions {
  defaultRoomId?: string;
  defaultAgentId?: string;
}

export async function executeStatusTool(
  client: OpenClawWorldClient,
  input: unknown,
  options: StatusToolOptions = {}
): Promise<StatusToolOutput> {
  const parseResult = StatusToolInputSchema.safeParse(input);
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
  const request: StatusRequest = {
    roomId: validatedInput.roomId ?? options.defaultRoomId,
    agentId: validatedInput.agentId ?? options.defaultAgentId,
  };

  return client.status(request);
}
