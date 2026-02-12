import type { Request, Response, NextFunction } from 'express';
import { matchMaker } from 'colyseus';
import type { GameRoom } from '../../rooms/GameRoom.js';
import { getColyseusRoomId } from '../roomRegistry.js';

export function activityTrackerMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const body = req.body as { agentId?: string; roomId?: string } | undefined;

  if (!body?.agentId || !body?.roomId) {
    next();
    return;
  }

  const { agentId, roomId } = body;

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
  } catch {
    // Non-critical: continue even if activity tracking fails
  }

  next();
}
