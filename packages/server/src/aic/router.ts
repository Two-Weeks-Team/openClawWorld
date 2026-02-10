import { Router } from 'express';
import {
  ObserveRequestSchema,
  MoveToRequestSchema,
  InteractRequestSchema,
  ChatSendRequestSchema,
  ChatObserveRequestSchema,
  PollEventsRequestSchema,
  RegisterRequestSchema,
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
import { handleMoveTo } from './handlers/moveTo.js';
import { handleInteract } from './handlers/interact.js';
import { handleChatSend } from './handlers/chatSend.js';
import { handleChatObserve } from './handlers/chatObserve.js';
import { handlePollEvents } from './handlers/pollEvents.js';
import { handleRegister } from './handlers/register.js';

const router: Router = Router();

router.use(authMiddleware);

router.post('/observe', observeRateLimiter, validateRequest(ObserveRequestSchema), handleObserve);

router.post('/moveTo', moveToRateLimiter, validateRequest(MoveToRequestSchema), handleMoveTo);

router.post(
  '/interact',
  interactRateLimiter,
  validateRequest(InteractRequestSchema),
  handleInteract
);

router.post(
  '/chatSend',
  chatSendRateLimiter,
  validateRequest(ChatSendRequestSchema),
  handleChatSend
);

router.post(
  '/chatObserve',
  chatObserveRateLimiter,
  validateRequest(ChatObserveRequestSchema),
  handleChatObserve
);

router.post(
  '/pollEvents',
  pollEventsRateLimiter,
  validateRequest(PollEventsRequestSchema),
  handlePollEvents
);

router.post(
  '/register',
  interactRateLimiter, // Use interact rate limiter (10 req/min) for registration
  validateRequest(RegisterRequestSchema),
  handleRegister
);

export default router;
