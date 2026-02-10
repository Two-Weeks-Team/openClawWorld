import { Router, type Request, type Response } from 'express';
import type { AicErrorCode } from '@openclawworld/shared';
import {
  ObserveRequestSchema,
  MoveToRequestSchema,
  InteractRequestSchema,
  ChatSendRequestSchema,
  ChatObserveRequestSchema,
  PollEventsRequestSchema,
} from '@openclawworld/shared';
import {
  authMiddleware,
  validateRequest,
  observeRateLimiter,
  pollEventsRateLimiter,
  chatSendRateLimiter,
  moveToRateLimiter,
  interactRateLimiter,
  chatObserveRateLimiter,
} from './middleware/index.js';
import { handleObserve } from './handlers/observe.js';

const router: Router = Router();

router.use(authMiddleware);

function createNotImplementedError(endpoint: string): {
  status: 'error';
  error: { code: AicErrorCode; message: string; retryable: false };
} {
  return {
    status: 'error',
    error: {
      code: 'internal',
      message: `Endpoint ${endpoint} not implemented yet`,
      retryable: false,
    },
  };
}

router.post('/observe', observeRateLimiter, validateRequest(ObserveRequestSchema), handleObserve);

router.post(
  '/moveTo',
  moveToRateLimiter,
  validateRequest(MoveToRequestSchema),
  (_req: Request, res: Response): void => {
    res.status(501).json(createNotImplementedError('moveTo'));
  }
);

router.post(
  '/interact',
  interactRateLimiter,
  validateRequest(InteractRequestSchema),
  (_req: Request, res: Response): void => {
    res.status(501).json(createNotImplementedError('interact'));
  }
);

router.post(
  '/chatSend',
  chatSendRateLimiter,
  validateRequest(ChatSendRequestSchema),
  (_req: Request, res: Response): void => {
    res.status(501).json(createNotImplementedError('chatSend'));
  }
);

router.post(
  '/chatObserve',
  chatObserveRateLimiter,
  validateRequest(ChatObserveRequestSchema),
  (_req: Request, res: Response): void => {
    res.status(501).json(createNotImplementedError('chatObserve'));
  }
);

router.post(
  '/pollEvents',
  pollEventsRateLimiter,
  validateRequest(PollEventsRequestSchema),
  (_req: Request, res: Response): void => {
    res.status(501).json(createNotImplementedError('pollEvents'));
  }
);

export default router;
