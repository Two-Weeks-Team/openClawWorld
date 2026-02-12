import type { Request, Response, NextFunction } from 'express';
import type { AicErrorObject } from '@openclawworld/shared';
import { getAgentIdFromToken, getRoomIdFromToken } from '../tokenRegistry.js';

const AUTH_HEADER = 'Authorization';
const BEARER_PREFIX = 'Bearer ';

function createAuthError(message: string): AicErrorObject {
  return {
    code: 'unauthorized',
    message,
    retryable: false,
  };
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.get(AUTH_HEADER);

  if (!authHeader) {
    res.status(401).json({
      status: 'error',
      error: createAuthError('Missing Authorization header'),
    });
    return;
  }

  if (!authHeader.startsWith(BEARER_PREFIX)) {
    res.status(401).json({
      status: 'error',
      error: createAuthError('Authorization header must use Bearer scheme'),
    });
    return;
  }

  const token = authHeader.slice(BEARER_PREFIX.length);

  if (!token || token.length < 8) {
    res.status(401).json({
      status: 'error',
      error: createAuthError('Invalid token format'),
    });
    return;
  }

  const agentId = getAgentIdFromToken(token);
  const roomId = getRoomIdFromToken(token);

  if (!agentId) {
    res.status(401).json({
      status: 'error',
      error: createAuthError('Invalid or expired token'),
    });
    return;
  }

  req.authToken = token;
  req.authAgentId = agentId;
  req.authRoomId = roomId ?? undefined;
  next();
}
