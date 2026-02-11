import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import type { AicErrorCode } from '@openclawworld/shared';

export const RateLimits = {
  observe: { windowMs: 1000, max: 5 },
  pollEvents: { windowMs: 1000, max: 10 },
  chatSend: { windowMs: 1000, max: 3 },
  moveTo: { windowMs: 1000, max: 10 },
  interact: { windowMs: 1000, max: 10 },
  chatObserve: { windowMs: 1000, max: 10 },
  skillList: { windowMs: 1000, max: 10 },
  skillInstall: { windowMs: 1000, max: 5 },
  skillInvoke: { windowMs: 1000, max: 5 },
} as const;

function createRateLimitResponse(): {
  status: 'error';
  error: { code: AicErrorCode; message: string; retryable: boolean };
} {
  return {
    status: 'error',
    error: {
      code: 'rate_limited',
      message: 'Too many requests, please try again later',
      retryable: true,
    },
  };
}

function createRateLimiter(windowMs: number, max: number) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request): string => {
      return req.authToken ?? req.ip ?? 'unknown';
    },
    handler: (_req: Request, res: Response): void => {
      res.status(429).json(createRateLimitResponse());
    },
    skip: (_req: Request): boolean => {
      return process.env.NODE_ENV === 'test' && process.env.DISABLE_RATE_LIMIT === 'true';
    },
  });
}

export const observeRateLimiter = createRateLimiter(
  RateLimits.observe.windowMs,
  RateLimits.observe.max
);

export const pollEventsRateLimiter = createRateLimiter(
  RateLimits.pollEvents.windowMs,
  RateLimits.pollEvents.max
);

export const chatSendRateLimiter = createRateLimiter(
  RateLimits.chatSend.windowMs,
  RateLimits.chatSend.max
);

export const moveToRateLimiter = createRateLimiter(
  RateLimits.moveTo.windowMs,
  RateLimits.moveTo.max
);

export const interactRateLimiter = createRateLimiter(
  RateLimits.interact.windowMs,
  RateLimits.interact.max
);

export const chatObserveRateLimiter = createRateLimiter(
  RateLimits.chatObserve.windowMs,
  RateLimits.chatObserve.max
);

export const skillListRateLimiter = createRateLimiter(
  RateLimits.skillList.windowMs,
  RateLimits.skillList.max
);

export const skillInstallRateLimiter = createRateLimiter(
  RateLimits.skillInstall.windowMs,
  RateLimits.skillInstall.max
);

export const skillInvokeRateLimiter = createRateLimiter(
  RateLimits.skillInvoke.windowMs,
  RateLimits.skillInvoke.max
);
