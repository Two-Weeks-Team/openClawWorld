import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const REQUEST_ID_HEADER = 'X-Request-Id';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.get(REQUEST_ID_HEADER) ?? uuidv4()) as string;
  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}
