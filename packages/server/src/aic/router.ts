import { Router } from 'express';
import {
  ObserveRequestSchema,
  MoveToRequestSchema,
  InteractRequestSchema,
  ChatSendRequestSchema,
  ChatObserveRequestSchema,
  PollEventsRequestSchema,
  RegisterRequestSchema,
  UnregisterRequestSchema,
  ReconnectRequestSchema,
  ProfileUpdateRequestSchema,
  SkillListRequestSchema,
  SkillInstallRequestSchema,
  SkillInvokeRequestSchema,
  MeetingListRequestSchema,
  MeetingJoinRequestSchema,
  MeetingLeaveRequestSchema,
  HeartbeatRequestSchema,
} from '@openclawworld/shared';
import {
  authMiddleware,
  activityTrackerMiddleware,
  validateRequest,
  observeRateLimiter,
  pollEventsRateLimiter,
  chatSendRateLimiter,
  moveToRateLimiter,
  interactRateLimiter,
  chatObserveRateLimiter,
  skillListRateLimiter,
  skillInstallRateLimiter,
  skillInvokeRateLimiter,
} from './middleware/index.js';
import { handleObserve } from './handlers/observe.js';
import { handleMoveTo } from './handlers/moveTo.js';
import { handleInteract } from './handlers/interact.js';
import { handleChatSend } from './handlers/chatSend.js';
import { handleChatObserve } from './handlers/chatObserve.js';
import { handlePollEvents } from './handlers/pollEvents.js';
import { handleRegister } from './handlers/register.js';
import { handleUnregister } from './handlers/unregister.js';
import { handleProfileUpdate } from './handlers/profileUpdate.js';
import { handleSkillList } from './handlers/skillList.js';
import { handleSkillInstall } from './handlers/skillInstall.js';
import { handleSkillInvoke } from './handlers/skillInvoke.js';
import { handleChannels } from './handlers/channels.js';
import { handleMeetingList } from './handlers/meetingList.js';
import { handleMeetingJoin } from './handlers/meetingJoin.js';
import { handleMeetingLeave } from './handlers/meetingLeave.js';
import { handleHeartbeat } from './handlers/heartbeat.js';
import { handleReconnect } from './handlers/reconnect.js';

const router: Router = Router();

// Channel list endpoint is UNAUTHENTICATED - clients call this before login
router.get('/channels', handleChannels);

// Register endpoint is UNAUTHENTICATED - agents call this to get their first token
router.post(
  '/register',
  interactRateLimiter,
  validateRequest(RegisterRequestSchema),
  handleRegister
);

// Reconnect endpoint is UNAUTHENTICATED - validates old token manually
router.post(
  '/reconnect',
  interactRateLimiter,
  validateRequest(ReconnectRequestSchema),
  handleReconnect
);

// All routes below require authentication
router.use(authMiddleware);
router.use(activityTrackerMiddleware);

router.post(
  '/unregister',
  interactRateLimiter,
  validateRequest(UnregisterRequestSchema),
  handleUnregister
);

router.post('/heartbeat', validateRequest(HeartbeatRequestSchema), handleHeartbeat);

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

router.post(
  '/skill/list',
  skillListRateLimiter,
  validateRequest(SkillListRequestSchema),
  handleSkillList
);

router.post(
  '/skill/install',
  skillInstallRateLimiter,
  validateRequest(SkillInstallRequestSchema),
  handleSkillInstall
);

router.post(
  '/skill/invoke',
  skillInvokeRateLimiter,
  validateRequest(SkillInvokeRequestSchema),
  handleSkillInvoke
);

router.post(
  '/meeting/list',
  interactRateLimiter,
  validateRequest(MeetingListRequestSchema),
  handleMeetingList
);

router.post(
  '/meeting/join',
  interactRateLimiter,
  validateRequest(MeetingJoinRequestSchema),
  handleMeetingJoin
);

router.post(
  '/meeting/leave',
  interactRateLimiter,
  validateRequest(MeetingLeaveRequestSchema),
  handleMeetingLeave
);

export default router;
