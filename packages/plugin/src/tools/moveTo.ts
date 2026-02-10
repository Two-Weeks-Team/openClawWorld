import type { AicResult, MoveToRequest, MoveToResponseData } from '@openclawworld/shared';
import {
  MoveToRequestSchema,
  MoveToResponseDataSchema,
  createResultSchema,
} from '@openclawworld/shared';
import type { OpenClawWorldClient } from '../client.js';
import type { PluginConfig } from '../config.js';
import { isToolEnabled, createForbiddenError } from '../config.js';

export type MoveToToolInput = MoveToRequest;
export type MoveToToolOutput = AicResult<MoveToResponseData>;

export const MoveToToolInputSchema = MoveToRequestSchema;
export const MoveToToolOutputSchema = createResultSchema(MoveToResponseDataSchema);

export interface MoveToToolOptions {
  defaultRoomId?: string;
  defaultAgentId?: string;
  config: PluginConfig;
}

const TOOL_NAME = 'ocw.move_to';

export async function executeMoveToTool(
  client: OpenClawWorldClient,
  input: unknown,
  options: MoveToToolOptions
): Promise<MoveToToolOutput> {
  if (!isToolEnabled(TOOL_NAME, options.config)) {
    return createForbiddenError(TOOL_NAME);
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
