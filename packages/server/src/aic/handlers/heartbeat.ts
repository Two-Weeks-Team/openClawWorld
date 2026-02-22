import type { Request, Response } from 'express';
import type { HeartbeatRequest, AicErrorObject } from '@openclawworld/shared';
import { AGENT_TIMEOUT_MS } from '../../constants.js';

function createErrorResponse(
  code: AicErrorObject['code'],
  message: string,
  retryable: boolean
): { status: 'error'; error: AicErrorObject } {
  return { status: 'error', error: { code, message, retryable } };
}

export function handleHeartbeat(req: Request, res: Response): void {
  const body = req.validatedBody as HeartbeatRequest;

  if (req.authAgentId !== body.agentId) {
    res
      .status(403)
      .json(createErrorResponse('forbidden', 'Agent ID mismatch with auth token', false));
    return;
  }

  // Activity is already tracked by activityTrackerMiddleware.
  // This endpoint simply acknowledges the heartbeat and returns the timeout config.
  res.status(200).json({
    status: 'ok',
    data: {
      agentId: body.agentId,
      serverTsMs: Date.now(),
      timeoutMs: AGENT_TIMEOUT_MS,
      recommendedIntervalMs: Math.floor(AGENT_TIMEOUT_MS / 5),
    },
  });
}
