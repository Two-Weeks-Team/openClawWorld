import type { Request, Response, NextFunction } from 'express';
import { matchMaker } from 'colyseus';
import type { GameRoom } from '../../rooms/GameRoom.js';
import { getColyseusRoomId } from '../roomRegistry.js';

export function activityTrackerMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const body = req.body as { agentId?: string; roomId?: string } | undefined;

  // Always prefer auth middleware values to prevent body-based spoofing;
  // fall back to body only for endpoints that pass IDs in body but not in token
  const agentId = req.authAgentId || body?.agentId;
  const roomId = req.authRoomId || body?.roomId;

  if (!agentId || !roomId) {
    next();
    return;
  }

  try {
    const colyseusRoomId = getColyseusRoomId(roomId);
    if (!colyseusRoomId) {
      next();
      return;
    }

    const gameRoom = matchMaker.getLocalRoomById(colyseusRoomId) as GameRoom | undefined;
    if (!gameRoom) {
      next();
      return;
    }

    const entity = gameRoom.state.agents.get(agentId);
    if (entity && entity.kind === 'agent') {
      entity.updateActivity();
    }
  } catch (error) {
    console.warn('[activityTracker] Failed to update agent activity:', error);
  }

  next();
}
