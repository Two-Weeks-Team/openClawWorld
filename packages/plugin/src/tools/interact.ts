import type { AicResult, InteractRequest, InteractResponseData } from '@openclawworld/shared';
import {
  InteractRequestSchema,
  InteractResponseDataSchema,
  createResultSchema,
} from '@openclawworld/shared';
import type { OpenClawWorldClient } from '../client.js';
import type { PluginConfig } from '../config.js';
import { isToolEnabled, createForbiddenError } from '../config.js';

export type InteractToolInput = InteractRequest;
export type InteractToolOutput = AicResult<InteractResponseData>;

export const InteractToolInputSchema = InteractRequestSchema;
export const InteractToolOutputSchema = createResultSchema(InteractResponseDataSchema);

export interface InteractToolOptions {
  defaultRoomId?: string;
  defaultAgentId?: string;
  config: PluginConfig;
}

const TOOL_NAME = 'ocw.interact';

export async function executeInteractTool(
  client: OpenClawWorldClient,
  input: unknown,
  options: InteractToolOptions
): Promise<InteractToolOutput> {
  if (!isToolEnabled(TOOL_NAME, options.config)) {
    return createForbiddenError(TOOL_NAME);
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
