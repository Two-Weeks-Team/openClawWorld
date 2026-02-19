import type { Request, Response } from 'express';
import { AGENT_TIMEOUT_MS } from '../../constants.js';

export function handleHeartbeat(req: Request, res: Response): void {
  res.json({
    ok: true,
    agentId: req.authAgentId,
    serverTsMs: Date.now(),
    timeoutMs: AGENT_TIMEOUT_MS,
    recommendedIntervalMs: Math.floor(AGENT_TIMEOUT_MS / 6),
  });
}
