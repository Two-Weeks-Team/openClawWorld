import { Router } from 'express';
import {
  ObserveRequestSchema,
  MoveToRequestSchema,
  InteractRequestSchema,
  ChatSendRequestSchema,
  ChatObserveRequestSchema,
  PollEventsRequestSchema,
  RegisterRequestSchema,
  ProfileUpdateRequestSchema,
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
import { handleProfileUpdate } from './handlers/profileUpdate.js';

const router: Router = Router();

// Register endpoint is UNAUTHENTICATED - agents call this to get their first token
router.post(
  '/register',
  interactRateLimiter,
  validateRequest(RegisterRequestSchema),
  handleRegister
);

// All routes below require authentication
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
  '/profile/update',
  interactRateLimiter,
  validateRequest(ProfileUpdateRequestSchema),
  handleProfileUpdate
);

export default router;
