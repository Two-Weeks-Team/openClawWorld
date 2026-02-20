import type { Request, Response } from 'express';
import type { HeartbeatRequest } from '@openclawworld/shared';
import { AGENT_TIMEOUT_MS } from '../../constants.js';

export function handleHeartbeat(req: Request, res: Response): void {
  const body = req.validatedBody as HeartbeatRequest;

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
