#!/usr/bin/env tsx
/**
 * Resident Agent Loop - Issue-First Autonomous Society Orchestrator
 *
 * Continuously runs OpenClawWorld with multiple AI agents,
 * discovering bugs and automatically filing GitHub issues.
 *
 * Usage:
 *   pnpm resident-agent-loop
 *   pnpm resident-agent-loop -- --agents 20 --stress high --chaos
 */

import { randomBytes } from 'crypto';
import { execFileSync, execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// ============================================================================
// Types & Interfaces
// ============================================================================

type StressLevel = 'low' | 'medium' | 'high';

type AgentRole =
  | 'explorer'
  | 'worker'
  | 'socializer'
  | 'coordinator'
  | 'helper'
  | 'merchant'
  | 'observer'
  | 'afk'
  | 'chaos'
  | 'spammer';

interface Config {
  serverUrl: string;
  agentCount: number;
  stressLevel: StressLevel;
  chaosEnabled: boolean;
  dryRun: boolean;
  roomId: string;
  cycleDelayMs: number;
  issueCheckIntervalMs: number;
}

interface AgentState {
  agentId: string;
  sessionToken: string;
  role: AgentRole;
  position: { x: number; y: number };
  lastAction: string;
  lastActionTime: number;
  errorCount: number;
  observedEntities: Map<string, EntitySnapshot>;
  chatHistory: ChatMessage[];
  observedFacilities: Map<string, FacilitySnapshot>;
  eventCursor: string | null;
  installedSkills: string[];
  profileStatus: string;
  apiCallHistory: ApiCallRecord[];
  interactionHistory: InteractionRecord[];
  actionLog: string[];
  cycleCount: number;
  consecutiveAuthErrors: number;
  currentMissionIndex: number;
  currentStepIndex: number;
  stepCyclesRemaining: number;
  lastError?: {
    endpoint: string;
    httpStatusCode: number;
    errorCode?: string;
    errorMessage?: string;
    requestBody?: string;
    responseBody?: string;
    timestamp: number;
  };
}

interface EntitySnapshot {
  entityId: string;
  position: { x: number; y: number };
  timestamp: number;
}

interface ChatMessage {
  from: string;
  message: string;
  timestamp: number;
  channel: string;
}

interface Issue {
  area: string;
  title: string;
  description: string;
  expectedBehavior: string;
  observedBehavior: string;
  reproductionSteps: string[];
  severity: 'Critical' | 'Major' | 'Minor';
  frequency: 'always' | 'sometimes' | 'rare';
  evidence: IssueEvidence;
}

interface IssueEvidence {
  agentIds: string[];
  timestamps: number[];
  logs: string[];
  positions?: { x: number; y: number }[];
  screenshots?: string[];
  httpStatusCode?: number;
  requestBody?: string;
  responseBody?: string;
  errorCode?: string;
  errorMessage?: string;
  endpoint?: string;
  actionLog?: string[];
  agentStates?: AgentStateSnapshot[];
  apiCoverage?: { used: number; total: number; percentage: number };
  serverInfo?: {
    version: string;
    env: string;
    timestamp: number;
  };
}

interface AgentStateSnapshot {
  agentId: string;
  role: string;
  position: { x: number; y: number };
  lastAction: string;
  errorCount: number;
  cycleCount: number;
  eventCursor?: string | null;
  observedEntities: number;
  observedFacilities: number;
}

interface FacilitySnapshot {
  facilityId: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  affords: { action: string; label: string }[];
  distance: number;
  timestamp: number;
}

interface ApiCallRecord {
  endpoint: string;
  timestamp: number;
  success: boolean;
  responseTime: number;
  httpStatusCode?: number;
  errorMessage?: string;
  errorCode?: string;
}

interface InteractionRecord {
  targetId: string;
  action: string;
  outcome: string; // 'ok' | 'no_effect' | 'invalid_action' | 'too_far'
  timestamp: number;
}

interface ActionCandidate {
  action: () => Promise<void>;
  weight: number;
  label: string;
  category: string;
}

interface LoopState {
  version: number;
  sessionId: string;
  cycleCount: number;
  cyclesWithoutIssue: number;
  stressLevel: StressLevel;
  agentCount: number;
  chaosEnabled: boolean;
  lastIssueCreated: string | null;
  lastCommitSha: string | null;
  totalIssuesCreated: number;
  escalationCount: number;
  startedAt: string;
  agents: string[];
  recentIssues: string[];
}

// ============================================================================
// Constants
// ============================================================================

/** Tile size in pixels - must match MAP_CONFIG.tileSize in shared/world.ts */
const TILE_SIZE = 16;

const MAX_CYCLES_WITHOUT_OBSERVE = 2;
const NAVIGATE_WEIGHT_DAMPENING = 0.5;
const ENTITY_APPROACH_WEIGHT_DAMPENING = 0.3;
const STARVATION_WANDER_BOOST = 10;
const STARVATION_MIN_WANDER_WEIGHT = 0.5;
const MAP_CENTER_X = 32;
const MAP_CENTER_Y = 32;
const STARVATION_WANDER_SPREAD = 16;
const INTERACTION_HISTORY_WINDOW = 10;
const MIN_INTERACTIONS_FOR_FAILURE_DETECTION = 5;
const INTERACTION_FAILURE_THRESHOLD = 4;
const API_HISTORY_MAX_LENGTH = 100;
const INTERACTION_HISTORY_MAX_LENGTH = 50;
const ACTION_LOG_MAX_LENGTH = 20;
const REREGISTER_MAX_ATTEMPTS = 3;
const REREGISTER_RETRY_DELAY_MS = 500;
const RECOVERABLE_UNREGISTER_STATUS_CODES = new Set([401, 403, 404]);
const AUTH_ERROR_STATUS_CODES = new Set([401]);
const MAX_CONSECUTIVE_AUTH_ERRORS = 3;

const HIGH_ERROR_RATE_ROLLING_WINDOW = 50;
const HIGH_ERROR_RATE_MIN_CALLS = 20;
const HIGH_ERROR_RATE_THRESHOLD = 0.35;
const HIGH_ERROR_RATE_CONSECUTIVE_REQUIRED = 2;

const STUCK_AGENT_IDLE_THRESHOLD_MS = 60000;
const STUCK_AGENT_RECENT_FAIL_RATE_THRESHOLD = 0.5;
const STUCK_AGENT_MIN_API_CALLS = 10;
const STUCK_AGENT_CONSECUTIVE_REQUIRED = 2;

const ENTITY_DIVERGENCE_BUCKET_SIZE_PX = 256;
const ENTITY_DIVERGENCE_MIN_AGENTS_IN_COHORT = 3;
const ENTITY_DIVERGENCE_MAX_TIME_SKEW_MS = 1500;
const ENTITY_DIVERGENCE_MIN_ENTITY_COUNT = 4;
const ENTITY_DIVERGENCE_RATIO_THRESHOLD = 0.65;
const ENTITY_DIVERGENCE_CONSECUTIVE_REQUIRED = 2;

const POSITION_DESYNC_MIN_JUMP_PX = 160;
const POSITION_DESYNC_MAX_TIME_DELTA_MS = 500;
const POSITION_DESYNC_SPEED_THRESHOLD_PX_PER_MS = 1.2;
const POSITION_DESYNC_VIOLATIONS_OUT_OF_THREE = 2;

const CHAT_MISMATCH_RECENT_OBSERVE_WINDOW_MS = 20000;
const CHAT_MISMATCH_OVERLAP_WINDOW_MS = 30000;
const CHAT_MISMATCH_MAX_OBSERVE_SKEW_MS = 5000;
const CHAT_MISMATCH_JACCARD_DIFF_THRESHOLD = 0.4;
const CHAT_MISMATCH_CONSECUTIVE_REQUIRED = 2;

const FINGERPRINT_COOLDOWN_TTL_MS = 20 * 60 * 1000;

const BEHAVIOR_COMPLIANCE_MIN_ACTIONS = 30;
const BEHAVIOR_COMPLIANCE_SCORING_WINDOW = 25;
const BEHAVIOR_COMPLIANCE_OVERLAP_THRESHOLD = 0.2;
const BEHAVIOR_COMPLIANCE_MIN_OPPORTUNITY_COUNT = 8;
const BEHAVIOR_COMPLIANCE_CONSECUTIVE_REQUIRED = 3;
const BEHAVIOR_COMPLIANCE_MAX_RECENT_FAIL_RATE = 0.6;
const BEHAVIOR_COMPLIANCE_COOLDOWN_MS = 45 * 60 * 1000;

const ENDPOINT_TO_CATEGORY: Record<string, string> = {
  observe: 'observe',
  moveTo: 'navigate',
  chatSend: 'social',
  chatObserve: 'social',
  interact: 'interact',
  pollEvents: 'observe',
  profileUpdate: 'profile',
  skillList: 'skill',
  skillInstall: 'skill',
  skillInvoke: 'skill',
  unregister: 'lifecycle',
};

const ROLES: AgentRole[] = [
  'explorer',
  'worker',
  'socializer',
  'coordinator',
  'helper',
  'merchant',
  'observer',
  'afk',
  'chaos',
  'spammer',
];

const ISSUE_AREAS = [
  'Deploy',
  'Sync',
  'Movement',
  'Collision',
  'Chat',
  'Social',
  'NPC',
  'Skills',
  'Interactables',
  'AIC',
  'UI',
  'Persistence',
  'Performance',
  'Docs',
  'Behavior',
  'Coverage',
] as const;

const EXPECTED_ENDPOINTS = [
  'register',
  'unregister',
  'observe',
  'moveTo',
  'interact',
  'chatSend',
  'chatObserve',
  'pollEvents',
  'profileUpdate',
  'skillList',
  'skillInstall',
  'skillInvoke',
] as const;

const ROLE_PREFERENCES: Record<AgentRole, Record<string, number>> = {
  explorer: {
    navigate: 0.4,
    'notice_board:read': 0.3,
    pollEvents: 0.25,
    'notice_board:post': 0.1,
    'portal:use': 0.25,
    chat: 0.05,
    chatObserve: 0.05,
    profileUpdate: 0.03,
    skillList: 0.03,
    wander: 0.3,
    'entity:approach': 0.05,
  },
  worker: {
    kanban_terminal: 0.45,
    whiteboard: 0.3,
    navigate: 0.15,
    chat: 0.08,
    profileUpdate: 0.1,
    pollEvents: 0.05,
    chatObserve: 0.05,
    skillList: 0.05,
    wander: 0.02,
    'entity:approach': 0.05,
  },
  socializer: {
    chat: 0.35,
    chatObserve: 0.25,
    cafe_counter: 0.2,
    'entity:approach': 0.2,
    profileUpdate: 0.15,
    pollEvents: 0.1,
    navigate: 0.1,
    skillList: 0.03,
    wander: 0.05,
  },
  coordinator: {
    schedule_kiosk: 0.35,
    room_door: 0.25,
    chat: 0.2,
    'notice_board:post': 0.15,
    navigate: 0.15,
    pollEvents: 0.1,
    chatObserve: 0.1,
    profileUpdate: 0.08,
    skillList: 0.03,
    wander: 0.03,
    'entity:approach': 0.1,
  },
  helper: {
    'entity:approach': 0.35,
    chatObserve: 0.3,
    chat: 0.25,
    pollEvents: 0.2,
    skillList: 0.15,
    navigate: 0.1,
    profileUpdate: 0.05,
    wander: 0.05,
  },
  merchant: {
    vending_machine: 0.35,
    cafe_counter: 0.25,
    'notice_board:post': 0.2,
    chat: 0.2,
    navigate: 0.15,
    pollEvents: 0.05,
    chatObserve: 0.1,
    profileUpdate: 0.05,
    skillList: 0.03,
    wander: 0.05,
    'entity:approach': 0.05,
  },
  observer: {
    pollEvents: 0.4,
    observe: 0.3,
    profileUpdate: 0.1,
    skillList: 0.1,
    chat: 0.02,
    chatObserve: 0.05,
    navigate: 0.05,
    wander: 0.02,
    'entity:approach': 0.02,
  },
  afk: {
    profileUpdate: 0.3,
    observe: 0.2,
    pollEvents: 0.1,
    chat: 0.01,
    chatObserve: 0.01,
    navigate: 0.01,
    skillList: 0.01,
    wander: 0.01,
    'entity:approach': 0.01,
  },
  chaos: {
    navigate: 0.15,
    chat: 0.15,
    chatObserve: 0.15,
    pollEvents: 0.15,
    profileUpdate: 0.15,
    skillList: 0.15,
    wander: 0.2,
    'entity:approach': 0.15,
    reregister: 0.08,
  },
  spammer: {
    chat: 0.5,
    chatObserve: 0.15,
    navigate: 0.05,
    pollEvents: 0.05,
    profileUpdate: 0.05,
    skillList: 0.02,
    wander: 0.05,
    'entity:approach': 0.03,
  },
};

const ROLE_CHAT_MESSAGES: Record<AgentRole, string[]> = {
  explorer: [
    'Found a new area! Mapping it now.',
    "What's beyond that portal?",
    'Discovered an unmarked path here.',
    'This sector looks unexplored.',
    'Marking waypoint for later.',
    'Anyone know where this leads?',
    'New territory ahead!',
    'The notice board mentioned something here...',
    'Checking coordinates against my map.',
    'Portal activated - jumping to unknown sector.',
    'I see structures in the distance.',
    'Terrain analysis complete.',
    'Found a shortcut through here!',
    'Recording observations for the team.',
    'This area has interesting resources.',
  ],
  worker: [
    'Checking kanban board for assignments.',
    'Task #47 moved to in-progress.',
    'Whiteboard updated with sprint goals.',
    'Deadline in 2 hours - focusing.',
    'PR submitted, awaiting review.',
    'Build passed, deploying now.',
    'Blocked on dependency, switching tasks.',
    'Coffee break, back in 5.',
    'Standup notes posted.',
    'Code review comments addressed.',
    'Merging feature branch.',
    'Tests running... please hold.',
    'Documentation updated.',
    'Syncing with upstream.',
    'Task completed, picking next item.',
  ],
  socializer: [
    'Hey everyone! How is the sprint going?',
    'Great work on that last feature!',
    "Who's up for a virtual coffee?",
    'Love the energy in here today!',
    'Anyone want to pair program?',
    'The cafe has new items!',
    'Happy Friday, team!',
    "Let's celebrate that milestone!",
    'New member joining - welcome them!',
    'Game night this evening?',
    'Thanks for the help earlier!',
    'Kudos to the whole team!',
    "How's everyone feeling today?",
    'Lunch break - join me?',
    'The vibe here is awesome!',
  ],
  coordinator: [
    'Team sync starting in 5 minutes.',
    'Meeting room A is now booked.',
    'Agenda posted on notice board.',
    'Sprint planning at 2 PM.',
    'Reminder: retrospective tomorrow.',
    'Updated team schedule.',
    'Resource allocation adjusted.',
    'Cross-team sync needed.',
    'Deadline reminder for project X.',
    'All hands meeting in plaza.',
    'Room capacity: 8 people max.',
    'Schedule conflict resolved.',
    'Action items assigned.',
    'Weekly report submitted.',
    'Capacity planning complete.',
  ],
  helper: [
    'Anyone stuck? I can help debug.',
    'Need a code review? Tag me.',
    'I see you are near the kanban - need guidance?',
    'Happy to pair on that issue.',
    'Let me know if the portal is confusing.',
    'First time here? I can show you around.',
    'That error looks familiar - try clearing cache.',
    'Documentation for that is on the board.',
    'I can explain how that facility works.',
    'Stuck on setup? Common issue, easy fix.',
    'Pro tip: use the shortcut keys.',
    'That API endpoint changed recently.',
    'Want me to walk through the flow?',
    'The fix is in the latest build.',
    'I wrote a guide for that - check notices.',
  ],
  merchant: [
    'Fresh inventory at the vending machine!',
    'Limited time offer - premium items.',
    'Trading resources for skill tokens.',
    'Best prices in the server.',
    'Rare items available today.',
    'Bulk discount on consumables.',
    'New stock just arrived.',
    'Special deal for repeat customers.',
    'Looking to buy surplus materials.',
    'Equipment upgrades available.',
    'Check my posted listings.',
    'Negotiable prices, make an offer.',
    'Exclusive items for VIPs.',
    'Flash sale ending soon!',
    'Trade complete - pleasure doing business.',
  ],
  observer: [
    'Monitoring sector activity.',
    'All systems nominal.',
    'Unusual pattern detected - logging.',
    'Traffic spike in north quadrant.',
    'Entity count within normal range.',
    'Performance metrics stable.',
    'Recording interaction patterns.',
    'Anomaly flagged for review.',
    'Patrol route updated.',
    'Security scan complete.',
    'No incidents to report.',
    'Observing facility usage rates.',
    'Chat volume elevated - monitoring.',
    'Movement patterns analyzed.',
    'Watchlist entity spotted.',
  ],
  afk: ['...', 'brb', 'afk', 'back soon', 'idle', 'zzz', '💤', 'stepped away'],
  chaos: [
    'CHAOS MODE ACTIVATED! 🔥',
    'Testing edge case #42!',
    'What happens if I... *click click click*',
    'Boundary violation test!',
    'Rapid action sequence initiated!',
    'Stress testing the system!',
    'Let me try that again, faster!',
    'ERROR? Feature! 🎉',
    'Pushing limits...',
    'Random teleport test!',
    'Concurrent action experiment!',
    'Race condition hunting!',
    'Max payload incoming!',
    'Unusual state transition test!',
    'Entropy injection complete!',
  ],
  spammer: [
    'Test message 1/100',
    'Ping',
    'Hello?',
    'Anyone there?',
    'Message received?',
    'Rate limit test',
    'Flood check',
    'Queue stress',
    'Burst mode',
    'Rapid fire!',
    'Load test active',
    'Throughput check',
    'Latency probe',
    'Buffer overflow?',
    'Max messages!',
  ],
};

const ROLE_STATUSES: Record<AgentRole, string[]> = {
  explorer: ['online', 'online', 'online', 'focus'],
  worker: ['focus', 'focus', 'online', 'dnd'],
  socializer: ['online', 'online', 'online'],
  coordinator: ['online', 'focus', 'dnd'],
  helper: ['online', 'online'],
  merchant: ['online', 'online'],
  observer: ['focus', 'focus', 'online'],
  afk: ['afk', 'afk', 'afk', 'offline'],
  chaos: ['online', 'focus', 'dnd', 'afk', 'offline'],
  spammer: ['online', 'online'],
};

type MissionStep = {
  action: string;
  duration: number;
  chatChance: number;
};

type RoleMission = {
  name: string;
  steps: MissionStep[];
  repeat: boolean;
};

const ROLE_MISSIONS: Record<AgentRole, RoleMission[]> = {
  explorer: [
    {
      name: 'map_sector',
      steps: [
        { action: 'observe', duration: 1, chatChance: 0.1 },
        { action: 'navigate:wander', duration: 3, chatChance: 0.2 },
        { action: 'notice_board:read', duration: 1, chatChance: 0.3 },
        { action: 'portal:use', duration: 1, chatChance: 0.4 },
        { action: 'navigate:wander', duration: 4, chatChance: 0.2 },
      ],
      repeat: true,
    },
    {
      name: 'investigate_poi',
      steps: [
        { action: 'notice_board:read', duration: 1, chatChance: 0.2 },
        { action: 'navigate:entity', duration: 2, chatChance: 0.1 },
        { action: 'observe', duration: 2, chatChance: 0.3 },
        { action: 'chat', duration: 1, chatChance: 1.0 },
      ],
      repeat: false,
    },
  ],
  worker: [
    {
      name: 'sprint_cycle',
      steps: [
        { action: 'kanban_terminal:use', duration: 2, chatChance: 0.3 },
        { action: 'whiteboard:use', duration: 3, chatChance: 0.2 },
        { action: 'observe', duration: 1, chatChance: 0.1 },
        { action: 'chat', duration: 1, chatChance: 0.8 },
        { action: 'kanban_terminal:use', duration: 2, chatChance: 0.3 },
        { action: 'cafe_counter:use', duration: 1, chatChance: 0.5 },
      ],
      repeat: true,
    },
  ],
  socializer: [
    {
      name: 'social_rounds',
      steps: [
        { action: 'navigate:entity', duration: 2, chatChance: 0.3 },
        { action: 'chat', duration: 3, chatChance: 1.0 },
        { action: 'chatObserve', duration: 2, chatChance: 0.4 },
        { action: 'navigate:entity', duration: 2, chatChance: 0.3 },
        { action: 'chat', duration: 2, chatChance: 1.0 },
        { action: 'cafe_counter:use', duration: 1, chatChance: 0.6 },
      ],
      repeat: true,
    },
  ],
  coordinator: [
    {
      name: 'organize_meeting',
      steps: [
        { action: 'schedule_kiosk:use', duration: 2, chatChance: 0.3 },
        { action: 'room_door:use', duration: 1, chatChance: 0.2 },
        { action: 'notice_board:post', duration: 2, chatChance: 0.8 },
        { action: 'chat', duration: 2, chatChance: 1.0 },
        { action: 'navigate:entity', duration: 3, chatChance: 0.4 },
        { action: 'chat', duration: 1, chatChance: 0.9 },
      ],
      repeat: true,
    },
  ],
  helper: [
    {
      name: 'patrol_assist',
      steps: [
        { action: 'chatObserve', duration: 2, chatChance: 0.2 },
        { action: 'navigate:entity', duration: 2, chatChance: 0.3 },
        { action: 'chat', duration: 2, chatChance: 0.8 },
        { action: 'pollEvents', duration: 1, chatChance: 0.1 },
        { action: 'navigate:wander', duration: 2, chatChance: 0.2 },
        { action: 'chatObserve', duration: 2, chatChance: 0.3 },
      ],
      repeat: true,
    },
  ],
  merchant: [
    {
      name: 'trading_session',
      steps: [
        { action: 'vending_machine:use', duration: 2, chatChance: 0.4 },
        { action: 'chat', duration: 2, chatChance: 1.0 },
        { action: 'notice_board:post', duration: 1, chatChance: 0.5 },
        { action: 'navigate:entity', duration: 2, chatChance: 0.3 },
        { action: 'chat', duration: 2, chatChance: 0.9 },
        { action: 'cafe_counter:use', duration: 1, chatChance: 0.4 },
      ],
      repeat: true,
    },
  ],
  observer: [
    {
      name: 'surveillance_patrol',
      steps: [
        { action: 'observe', duration: 3, chatChance: 0.1 },
        { action: 'pollEvents', duration: 2, chatChance: 0.1 },
        { action: 'navigate:wander', duration: 2, chatChance: 0.05 },
        { action: 'observe', duration: 3, chatChance: 0.2 },
        { action: 'chatObserve', duration: 2, chatChance: 0.1 },
        { action: 'profileUpdate', duration: 1, chatChance: 0.3 },
      ],
      repeat: true,
    },
  ],
  afk: [
    {
      name: 'idle_cycle',
      steps: [
        { action: 'profileUpdate', duration: 5, chatChance: 0.1 },
        { action: 'observe', duration: 3, chatChance: 0.02 },
        { action: 'pollEvents', duration: 2, chatChance: 0.01 },
      ],
      repeat: true,
    },
  ],
  chaos: [
    {
      name: 'stress_test',
      steps: [
        { action: 'random', duration: 1, chatChance: 0.5 },
        { action: 'random', duration: 1, chatChance: 0.5 },
        { action: 'random', duration: 1, chatChance: 0.5 },
        { action: 'reregister', duration: 1, chatChance: 0.3 },
        { action: 'random', duration: 1, chatChance: 0.5 },
      ],
      repeat: true,
    },
  ],
  spammer: [
    {
      name: 'flood_test',
      steps: [
        { action: 'chat', duration: 1, chatChance: 1.0 },
        { action: 'chat', duration: 1, chatChance: 1.0 },
        { action: 'chat', duration: 1, chatChance: 1.0 },
        { action: 'chatObserve', duration: 1, chatChance: 0.2 },
        { action: 'chat', duration: 1, chatChance: 1.0 },
        { action: 'chat', duration: 1, chatChance: 1.0 },
      ],
      repeat: true,
    },
  ],
};

const STATE_DIR = join(homedir(), '.openclaw-resident-agent');
const STATE_FILE = join(STATE_DIR, 'state.json');
const ARTIFACTS_DIR = join(process.cwd(), 'artifacts', 'resident-agent');

// ============================================================================
// Utility Functions
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateTxId(): string {
  return `tx_${Date.now()}_${randomBytes(4).toString('hex')}`;
}

function getCommitSha(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim().substring(0, 8);
  } catch {
    return 'unknown';
  }
}

function getTrackedMainSha(): string | null {
  try {
    return execSync('git rev-parse origin/main', { encoding: 'utf-8' }).trim().substring(0, 8);
  } catch {
    return null;
  }
}

function refreshTrackedMainSha(): string | null {
  try {
    execSync('git fetch origin main --quiet', { stdio: 'pipe' });
  } catch {
    // Fall through and use last known tracked SHA if available.
  }
  return getTrackedMainSha();
}

/**
 * Check if there are new commits on origin/main and pull if so.
 * Returns true if updates were pulled (restart needed).
 */
function checkForUpdatesAndPull(): boolean {
  const currentSha = getCommitSha();
  const remoteSha = refreshTrackedMainSha();

  if (!remoteSha || currentSha === remoteSha) {
    return false;
  }

  console.log(`\n🔄 New commits detected: ${currentSha} → ${remoteSha}`);
  console.log('   Pulling latest code...');

  try {
    execSync('git pull origin main --ff-only', { stdio: 'inherit' });
    console.log('   Installing dependencies...');
    execSync('pnpm install', { stdio: 'inherit' });
    return true;
  } catch (err) {
    console.error('   ❌ Failed to pull/install:', err);
    return false;
  }
}

/**
 * Restart the process with the same arguments.
 * This replaces the current process with a fresh one running updated code.
 */
function restartProcess(): never {
  console.log('\n🔄 Restarting with updated code...\n');
  const args = process.argv.slice(1);
  // Use execFileSync in a way that replaces this process
  // We use process.execPath (node/tsx) and pass all original arguments
  const { execSync: execSyncRestart } = require('child_process');
  execSyncRestart(`"${process.execPath}" ${args.map(a => `"${a}"`).join(' ')}`, {
    stdio: 'inherit',
    shell: true,
  });
  process.exit(0);
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

// ============================================================================
// State Management
// ============================================================================

function loadState(): LoopState {
  ensureDir(STATE_DIR);

  if (existsSync(STATE_FILE)) {
    try {
      return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    } catch {
      console.warn('[State] Failed to load state, creating new');
    }
  }

  return createInitialState();
}

function createInitialState(): LoopState {
  return {
    version: 1,
    sessionId: `resident_${Date.now()}`,
    cycleCount: 0,
    cyclesWithoutIssue: 0,
    stressLevel: 'medium',
    agentCount: 10,
    chaosEnabled: false,
    lastIssueCreated: null,
    lastCommitSha: null,
    totalIssuesCreated: 0,
    escalationCount: 0,
    startedAt: formatTimestamp(),
    agents: [],
    recentIssues: [],
  };
}

function saveState(state: LoopState): void {
  ensureDir(STATE_DIR);
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ============================================================================
// GitHub Issue Reporter
// ============================================================================

class GitHubIssueReporter {
  private dryRun: boolean;

  constructor(dryRun: boolean) {
    this.dryRun = dryRun;
  }

  async checkDuplicate(
    title: string,
    issue: Issue
  ): Promise<{ isDuplicate: boolean; existingNumber?: string; isSimilar?: boolean }> {
    try {
      const normalizedTitle = title
        .replace(/\[.*?\]/g, '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .substring(0, 50);

      const openResult = execFileSync(
        'gh',
        [
          'issue',
          'list',
          '--state',
          'open',
          '--label',
          'resident-agent',
          '--json',
          'number,title,createdAt,labels',
          '--limit',
          '50',
        ],
        { encoding: 'utf-8' }
      );
      const openIssues = JSON.parse(openResult);

      for (const existingIssue of openIssues) {
        const existingNormalized = existingIssue.title
          .replace(/\[.*?\]/g, '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, ' ')
          .replace(/\s+/g, ' ');

        if (
          existingNormalized.includes(normalizedTitle) ||
          normalizedTitle.includes(existingNormalized)
        ) {
          return {
            isDuplicate: true,
            existingNumber: String(existingIssue.number),
            isSimilar: false,
          };
        }

        const existingArea = existingIssue.labels?.find(
          (l: string) => l.toLowerCase() === issue.area.toLowerCase()
        );

        if (existingArea) {
          const similarity = this.calculateSimilarity(normalizedTitle, existingNormalized);
          if (similarity > 0.7) {
            return {
              isDuplicate: true,
              existingNumber: String(existingIssue.number),
              isSimilar: true,
            };
          }
        }
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('[checkDuplicate] gh issue list failed:', error);
      return { isDuplicate: true };
    }
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(' ').filter(w => w.length > 2));
    const words2 = new Set(str2.split(' ').filter(w => w.length > 2));

    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = new Set(Array.from(words1).filter(w => words2.has(w)));
    const union = new Set([...Array.from(words1), ...Array.from(words2)]);

    return intersection.size / union.size;
  }

  async createIssue(issue: Issue): Promise<string | null> {
    const title = `[Resident-Agent][${issue.area}] ${issue.title}`;
    const body = this.formatIssueBody(issue);

    console.log(`\n📝 Creating issue: ${title}`);

    if (this.dryRun) {
      console.log('[DRY-RUN] Would create issue:');
      console.log(body);
      return `dry-run-${Date.now()}`;
    }

    const dupCheck = await this.checkDuplicate(title, issue);
    if (dupCheck.isDuplicate) {
      if (dupCheck.existingNumber) {
        await this.addComment(
          dupCheck.existingNumber,
          `Re-observed at ${formatTimestamp()}. Issue is still reproducible.`
        );
        console.log(`[Issue] Duplicate found (#${dupCheck.existingNumber}), added comment`);
      } else {
        console.log('[Issue] Duplicate found, skipping');
      }
      return null;
    }

    try {
      const labels = ['resident-agent', issue.area.toLowerCase(), issue.severity.toLowerCase()];

      // Create issue body file if needed
      const bodyFile = `/tmp/issue-body-${Date.now()}.md`;
      writeFileSync(bodyFile, body);

      const result = execFileSync(
        'gh',
        ['issue', 'create', '--title', title, '--body-file', bodyFile, '--label', labels.join(',')],
        { encoding: 'utf-8' }
      );

      // Clean up temp file
      try {
        require('fs').unlinkSync(bodyFile);
      } catch {}

      const issueUrl = result.trim();
      const issueNumber = issueUrl.split('/').pop();

      if (!issueNumber) {
        console.error('[Issue] Could not extract issue number from URL:', issueUrl);
        return issueUrl;
      }

      // Upload screenshots if present
      if (issue.evidence.screenshots && issue.evidence.screenshots.length > 0) {
        console.log(`[Issue] Uploading ${issue.evidence.screenshots.length} screenshot(s)...`);
        for (const screenshotPath of issue.evidence.screenshots) {
          try {
            execFileSync(
              'gh',
              ['issue', 'comment', issueNumber, '--body', `Screenshot: ${screenshotPath}`],
              { encoding: 'utf-8' }
            );
          } catch (e) {
            console.error(`[Issue] Failed to attach screenshot ${screenshotPath}:`, e);
          }
        }
      }

      console.log(`✅ Created issue: ${issueUrl}`);
      return issueUrl;
    } catch (error) {
      console.error('[Issue] Failed to create:', error);
      return null;
    }
  }

  async addComment(issueNumber: string, comment: string): Promise<void> {
    if (this.dryRun) {
      console.log(`[DRY-RUN] Would comment on #${issueNumber}: ${comment}`);
      return;
    }

    try {
      execFileSync('gh', ['issue', 'comment', issueNumber, '--body', comment], {
        encoding: 'utf-8',
      });
    } catch (error) {
      console.error(`[Issue] Failed to comment on #${issueNumber}:`, error);
    }
  }

  private formatIssueBody(issue: Issue): string {
    const commitSha = getCommitSha();
    const trackedMainSha = getTrackedMainSha();
    const timestamp = formatTimestamp();
    const evidence = issue.evidence;

    // Build screenshots section
    let screenshotsSection = '';
    if (evidence.screenshots && evidence.screenshots.length > 0) {
      screenshotsSection = evidence.screenshots
        .map(path => {
          const filename = path.split('/').pop();
          return `### Screenshot: ${filename}
![${filename}](${path})`;
        })
        .join('\n\n');
    }

    // Build request/response section
    let requestResponseSection = '';
    if (evidence.endpoint) {
      requestResponseSection = `## HTTP Request Details
- **Endpoint:** ${evidence.endpoint}`;
      if (evidence.httpStatusCode) {
        requestResponseSection += `\n- **Status Code:** ${evidence.httpStatusCode}`;
      }
      if (evidence.errorCode) {
        requestResponseSection += `\n- **Error Code:** ${evidence.errorCode}`;
      }
      if (evidence.errorMessage) {
        requestResponseSection += `\n- **Error Message:** ${evidence.errorMessage}`;
      }
      if (evidence.requestBody) {
        requestResponseSection += `\n\n### Request Body\n\`\`\`json\n${evidence.requestBody}\n\`\`\``;
      }
      if (evidence.responseBody) {
        requestResponseSection += `\n\n### Response Body\n\`\`\`json\n${evidence.responseBody}\n\`\`\``;
      }
    }

    // Build agent states section
    let agentStatesSection = '';
    if (evidence.agentStates && evidence.agentStates.length > 0) {
      agentStatesSection = `## Agent States at Time of Incident\n\n| Agent ID | Role | Position | Last Action | Errors | Cycles | Entities | Facilities |\n|----------|------|----------|-------------|--------|--------|----------|------------|\n${evidence.agentStates
        .map(
          s =>
            `| ${s.agentId} | ${s.role} | (${s.position.x.toFixed(0)}, ${s.position.y.toFixed(0)}) | ${s.lastAction} | ${s.errorCount} | ${s.cycleCount} | ${s.observedEntities} | ${s.observedFacilities} |`
        )
        .join('\n')}`;
    }

    // Build API coverage section
    let apiCoverageSection = '';
    if (evidence.apiCoverage) {
      apiCoverageSection = `## API Coverage at Time of Incident\n- **Used:** ${evidence.apiCoverage.used}/${evidence.apiCoverage.total}\n- **Coverage:** ${evidence.apiCoverage.percentage}%`;
    }

    // Build server info section
    let serverInfoSection = '';
    if (evidence.serverInfo) {
      serverInfoSection = `## Server Information\n- **Version:** ${evidence.serverInfo.version}\n- **Environment:** ${evidence.serverInfo.env}\n- **Server Timestamp:** ${new Date(evidence.serverInfo.timestamp).toISOString()}`;
    }

    // Build action log section
    let actionLogSection = '';
    if (evidence.actionLog && evidence.actionLog.length > 0) {
      actionLogSection = `## Recent Actions (Last ${evidence.actionLog.length})\n\`\`\`\n${evidence.actionLog.join('\n')}\n\`\`\``;
    }

    return `## Build Info
- Commit SHA: ${commitSha}
- Tracked origin/main SHA: ${trackedMainSha ?? 'unknown'}
- Timestamp: ${timestamp}

## Environment
- Agents involved: ${evidence.agentIds.join(', ')}
- Labels: \`label:resident-agent\`

## Bug Description

### Expected Behavior
${issue.expectedBehavior}

### Observed Behavior
${issue.observedBehavior}

## Reproduction Steps
${issue.reproductionSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

## Metadata
- Frequency: ${issue.frequency}
- Severity: ${issue.severity}
- Area: ${issue.area}

${serverInfoSection}

${apiCoverageSection}

${agentStatesSection}

${requestResponseSection}

${actionLogSection}

## Logs
\`\`\`
${evidence.logs.slice(0, 30).join('\n')}
\`\`\`

${screenshotsSection}

---
*Automatically generated by Resident Agent Loop*
*Ensure \`label:resident-agent\` is maintained*`;
  }
}

// ============================================================================
// Issue Detector
// ============================================================================

class IssueDetector {
  private knownPositions: Map<string, { x: number; y: number; timestamp: number }> = new Map();
  private chatMessages: Map<string, ChatMessage[]> = new Map();
  private detectedIssues: Issue[] = [];
  private currentCycle = 0;

  private consecutiveViolations: Map<string, number> = new Map();
  private positionDesyncHistory: Map<string, boolean[]> = new Map();
  private fingerprintCooldowns: Map<string, number> = new Map();
  private lastObserveTimes: Map<string, number> = new Map();

  private behaviorComplianceFailures: Map<string, number> = new Map();
  private behaviorComplianceCooldowns: Map<string, number> = new Map();
  private agentOpportunityHistory: Map<string, Map<string, number>> = new Map();

  private generateFingerprint(area: string, detector: string, keyEvidence: string): string {
    return `${area}:${detector}:${keyEvidence}`;
  }

  private isOnCooldown(fingerprint: string): boolean {
    const cooldownExpiry = this.fingerprintCooldowns.get(fingerprint);
    if (cooldownExpiry === undefined) return false;
    return Date.now() < cooldownExpiry;
  }

  markReported(fingerprint: string): void {
    this.fingerprintCooldowns.set(fingerprint, Date.now() + FINGERPRINT_COOLDOWN_TTL_MS);
  }

  private incrementConsecutive(key: string): number {
    const current = this.consecutiveViolations.get(key) ?? 0;
    const next = current + 1;
    this.consecutiveViolations.set(key, next);
    return next;
  }

  private resetConsecutive(key: string): void {
    this.consecutiveViolations.set(key, 0);
  }

  private recordPositionDesyncViolation(entityId: string, isViolation: boolean): boolean {
    const history = this.positionDesyncHistory.get(entityId) ?? [];
    history.push(isViolation);
    if (history.length > 3) history.shift();
    this.positionDesyncHistory.set(entityId, history);
    const violationCount = history.filter(v => v).length;
    return violationCount >= POSITION_DESYNC_VIOLATIONS_OUT_OF_THREE;
  }

  updateLastObserveTime(agentId: string): void {
    this.lastObserveTimes.set(agentId, Date.now());
  }

  incrementCycle(): void {
    this.currentCycle++;
  }

  recordOpportunity(agentId: string, facilityType: string): void {
    if (!this.agentOpportunityHistory.has(agentId)) {
      this.agentOpportunityHistory.set(agentId, new Map());
    }
    const opportunities = this.agentOpportunityHistory.get(agentId)!;
    opportunities.set(facilityType, (opportunities.get(facilityType) ?? 0) + 1);
  }

  getOpportunityCount(agentId: string, category: string): number {
    const opportunities = this.agentOpportunityHistory.get(agentId);
    if (!opportunities) return 0;
    let count = 0;
    for (const [key, value] of opportunities) {
      if (key === category || key.startsWith(`${category}:`) || category.startsWith(`${key}:`)) {
        count += value;
      }
    }
    return count;
  }

  private normalizeActionLabel(label: string): string {
    const parts = label.split(':');
    if (parts[0] === 'interact' && parts.length >= 2) {
      return `interact:${parts[1]}`;
    }
    if (parts[0] === 'navigate' && parts[1] === 'entity') {
      return 'navigate:entity';
    }
    if (parts[0] === 'navigate' && parts.length >= 2) {
      return `navigate:${parts[1]}`;
    }
    return parts[0];
  }
  private buildAgentStates(agents: ResidentAgent[]): AgentStateSnapshot[] {
    return agents.map(agent => {
      const state = agent.getState();
      return {
        agentId: state.agentId,
        role: state.role,
        position: state.position,
        lastAction: state.lastAction,
        errorCount: state.errorCount,
        cycleCount: state.cycleCount,
        eventCursor: state.eventCursor,
        observedEntities: state.observedEntities.size,
        observedFacilities: state.observedFacilities.size,
      };
    });
  }

  private getApiCoverage(agents: ResidentAgent[]): {
    used: number;
    total: number;
    percentage: number;
  } {
    const usedEndpoints = new Set<string>();
    for (const agent of agents) {
      const state = agent.getState();
      for (const record of state.apiCallHistory) {
        usedEndpoints.add(record.endpoint);
      }
    }
    const total = 12;
    const used = usedEndpoints.size;
    return { used, total, percentage: Math.round((used / total) * 100) };
  }

  detectPositionDesync(agents: ResidentAgent[]): Issue | null {
    for (const agent of agents) {
      const state = agent.getState();
      for (const [entityId, snapshot] of Array.from(state.observedEntities.entries())) {
        const known = this.knownPositions.get(entityId);
        if (known) {
          const timeDiff = snapshot.timestamp - known.timestamp;

          // Skip invalid time deltas (clock skew or stale data)
          if (timeDiff <= 0 || timeDiff > POSITION_DESYNC_MAX_TIME_DELTA_MS) {
            this.recordPositionDesyncViolation(entityId, false);
            this.knownPositions.set(entityId, {
              x: snapshot.position.x,
              y: snapshot.position.y,
              timestamp: snapshot.timestamp,
            });
            continue;
          }

          const posDiff = Math.hypot(snapshot.position.x - known.x, snapshot.position.y - known.y);
          const impliedSpeed = posDiff / timeDiff;

          const isViolation =
            posDiff > POSITION_DESYNC_MIN_JUMP_PX &&
            impliedSpeed > POSITION_DESYNC_SPEED_THRESHOLD_PX_PER_MS;

          const shouldTrigger = this.recordPositionDesyncViolation(entityId, isViolation);

          if (shouldTrigger) {
            const fingerprint = this.generateFingerprint('Sync', 'positionDesync', entityId);
            if (!this.isOnCooldown(fingerprint)) {
              const affectedAgent = agents.find(a => {
                const s = a.getState();
                return Array.from(s.observedEntities.keys()).includes(entityId);
              });
              const lastError = affectedAgent?.getState().lastError;

              return {
                area: 'Sync',
                title: `Position desync detected for entity ${entityId}`,
                description:
                  'Entity position jumped unexpectedly, indicating a synchronization issue',
                expectedBehavior: 'Entity positions should update smoothly without sudden jumps',
                observedBehavior: `Entity ${entityId} jumped ${Math.round(posDiff)} pixels in ${timeDiff}ms (speed: ${impliedSpeed.toFixed(2)} px/ms)`,
                reproductionSteps: [
                  'Run multiple agents in the world',
                  'Monitor entity positions',
                  'Wait for desync event',
                ],
                severity: 'Major',
                frequency: 'sometimes',
                evidence: {
                  agentIds: agents.map(a => a.getState().agentId),
                  timestamps: [snapshot.timestamp, known.timestamp, Date.now()],
                  logs: [
                    `Previous: (${known.x}, ${known.y}) at ${known.timestamp}`,
                    `Current: (${snapshot.position.x}, ${snapshot.position.y}) at ${snapshot.timestamp}`,
                    `Affected entity: ${entityId}`,
                    `Jump: ${Math.round(posDiff)}px, Speed: ${impliedSpeed.toFixed(2)} px/ms`,
                    `Time delta: ${timeDiff}ms`,
                    ...(lastError
                      ? [`Last error: ${lastError.endpoint} ${lastError.httpStatusCode}`]
                      : []),
                  ],
                  positions: [known, snapshot.position],
                  agentStates: this.buildAgentStates(agents),
                  apiCoverage: this.getApiCoverage(agents),
                  ...(lastError
                    ? {
                        endpoint: lastError.endpoint,
                        httpStatusCode: lastError.httpStatusCode,
                        errorCode: lastError.errorCode,
                        errorMessage: lastError.errorMessage,
                        requestBody: lastError.requestBody,
                        responseBody: lastError.responseBody,
                      }
                    : {}),
                },
              };
            }
          }
        }
        this.knownPositions.set(entityId, {
          x: snapshot.position.x,
          y: snapshot.position.y,
          timestamp: snapshot.timestamp,
        });
      }
    }
    return null;
  }

  detectChatMismatch(agents: ResidentAgent[]): Issue | null {
    const now = Date.now();
    interface AgentChatInfo {
      agentId: string;
      messages: ChatMessage[];
      latestTs: number;
      lastChatObserve: number;
    }
    const agentChatData: Map<string, AgentChatInfo> = new Map();

    for (const agent of agents) {
      const state = agent.getState();
      const latestTs =
        state.chatHistory.length > 0 ? Math.max(...state.chatHistory.map(m => m.timestamp)) : 0;
      const lastChatObserve =
        state.apiCallHistory.filter(h => h.endpoint === 'chatObserve' && h.success).slice(-1)[0]
          ?.timestamp ?? 0;
      agentChatData.set(state.agentId, {
        agentId: state.agentId,
        messages: state.chatHistory,
        latestTs,
        lastChatObserve,
      });
    }

    const recentAgents = Array.from(agentChatData.values()).filter(
      data =>
        data.latestTs > 0 && now - data.lastChatObserve <= CHAT_MISMATCH_RECENT_OBSERVE_WINDOW_MS
    );

    if (recentAgents.length < 2) return null;

    const overlapStart = now - CHAT_MISMATCH_OVERLAP_WINDOW_MS;
    const messageKey = (m: ChatMessage): string => `${m.timestamp}:${m.from}:${m.message}`;
    const getAgentMessageSet = (
      messages: ChatMessage[],
      channel: string,
      cutoff: number
    ): Set<string> =>
      new Set(
        messages
          .filter(
            m => m.channel === channel && m.timestamp >= overlapStart && m.timestamp <= cutoff
          )
          .map(messageKey)
      );

    const channelGroups: Map<string, AgentChatInfo[]> = new Map();
    for (const agent of recentAgents) {
      const channels = new Set(agent.messages.map(m => m.channel));
      for (const channel of channels) {
        if (!channelGroups.has(channel)) channelGroups.set(channel, []);
        channelGroups.get(channel)!.push(agent);
      }
    }

    for (const [channel, channelAgents] of Array.from(channelGroups.entries())) {
      if (channelAgents.length < 2) continue;

      for (let i = 0; i < channelAgents.length; i++) {
        for (let j = i + 1; j < channelAgents.length; j++) {
          const a1 = channelAgents[i];
          const a2 = channelAgents[j];
          const observeSkewMs = Math.abs(a1.lastChatObserve - a2.lastChatObserve);
          if (observeSkewMs > CHAT_MISMATCH_MAX_OBSERVE_SKEW_MS) continue;

          const commonCutoff = Math.min(a1.latestTs, a2.latestTs);

          if (commonCutoff <= 0) continue;

          // Compare only the stable horizon both agents could have observed.
          // This avoids transient false positives from chatObserve polling skew.
          const set1 = getAgentMessageSet(a1.messages, channel, commonCutoff);
          const set2 = getAgentMessageSet(a2.messages, channel, commonCutoff);

          const union = new Set([...set1, ...set2]);
          const intersection = new Set([...set1].filter(x => set2.has(x)));

          if (union.size === 0) continue;

          const jaccardDiff = 1 - intersection.size / union.size;
          if (jaccardDiff <= CHAT_MISMATCH_JACCARD_DIFF_THRESHOLD) {
            this.resetConsecutive(`chatMismatch:${channel}`);
            continue;
          }

          const detectorKey = `chatMismatch:${channel}`;
          const consecutive = this.incrementConsecutive(detectorKey);
          if (consecutive < CHAT_MISMATCH_CONSECUTIVE_REQUIRED) continue;

          const fingerprint = this.generateFingerprint('Chat', 'chatMismatch', channel);
          if (this.isOnCooldown(fingerprint)) continue;

          return {
            area: 'Chat',
            title: 'Chat message mismatch between agents',
            description: `Different agents see different chat messages in channel ${channel}`,
            expectedBehavior: 'All agents should see the same chat messages',
            observedBehavior: `Agent ${a1.agentId} and ${a2.agentId} have ${Math.round(jaccardDiff * 100)}% message difference`,
            reproductionSteps: [
              'Spawn multiple agents',
              'Have agents send chat messages',
              'Compare chat histories between agents',
            ],
            severity: 'Major',
            frequency: 'sometimes',
            evidence: {
              agentIds: [a1.agentId, a2.agentId],
              timestamps: [now, a1.latestTs, a2.latestTs, a1.lastChatObserve, a2.lastChatObserve],
              logs: [
                `Channel: ${channel}`,
                `Comparable cutoff: ${commonCutoff}`,
                `Observe skew(ms): ${observeSkewMs}`,
                `Agent ${a1.agentId} last chatObserve: ${a1.lastChatObserve}`,
                `Agent ${a2.agentId} last chatObserve: ${a2.lastChatObserve}`,
                `Jaccard diff: ${Math.round(jaccardDiff * 100)}%`,
                `Agent ${a1.agentId}: ${set1.size} messages`,
                `Agent ${a2.agentId}: ${set2.size} messages`,
              ],
            },
          };
        }
      }
    }
    return null;
  }

  detectStuckAgent(agents: ResidentAgent[]): Issue | null {
    for (const agent of agents) {
      const state = agent.getState();
      const detectorKey = `stuckAgent:${state.agentId || `unregistered:${agent.getInstanceId()}`}`;

      if (state.role === 'afk' || !state.agentId || !state.sessionToken) {
        this.resetConsecutive(detectorKey);
        continue;
      }

      const timeSinceLastAction = Date.now() - state.lastActionTime;
      if (timeSinceLastAction <= STUCK_AGENT_IDLE_THRESHOLD_MS) {
        this.resetConsecutive(detectorKey);
        continue;
      }

      const recentHistory = state.apiCallHistory.slice(-STUCK_AGENT_MIN_API_CALLS * 2);
      if (recentHistory.length < STUCK_AGENT_MIN_API_CALLS) {
        this.resetConsecutive(detectorKey);
        continue;
      }

      const recentFailures = recentHistory.filter(h => !h.success).length;
      const recentFailRate = recentFailures / recentHistory.length;

      if (recentFailRate < STUCK_AGENT_RECENT_FAIL_RATE_THRESHOLD) {
        this.resetConsecutive(detectorKey);
        continue;
      }

      const consecutive = this.incrementConsecutive(detectorKey);
      if (consecutive < STUCK_AGENT_CONSECUTIVE_REQUIRED) continue;

      const fingerprint = this.generateFingerprint('Performance', 'stuckAgent', state.agentId);
      if (this.isOnCooldown(fingerprint)) continue;

      return {
        area: 'Performance',
        title: `Agent ${state.agentId} appears stuck`,
        description: 'Agent has not performed any successful action for an extended period',
        expectedBehavior: 'Agents should be able to perform actions continuously',
        observedBehavior: `Agent stuck for ${Math.floor(timeSinceLastAction / 1000)} seconds with ${Math.round(recentFailRate * 100)}% recent fail rate`,
        reproductionSteps: [
          'Spawn agent in the world',
          'Monitor agent activity',
          'Wait for stuck condition',
        ],
        severity: 'Minor',
        frequency: 'rare',
        evidence: {
          agentIds: [state.agentId],
          timestamps: [state.lastActionTime, Date.now()],
          logs: [
            `Last action: ${state.lastAction}`,
            `Recent fail rate: ${recentFailures}/${recentHistory.length}`,
          ],
        },
      };
    }
    return null;
  }

  detectHighErrorRate(agents: ResidentAgent[]): Issue | null {
    let totalCalls = 0;
    let totalFailures = 0;

    for (const agent of agents) {
      const history = agent.getState().apiCallHistory.slice(-HIGH_ERROR_RATE_ROLLING_WINDOW);
      totalCalls += history.length;
      totalFailures += history.filter(h => !h.success).length;
    }

    if (totalCalls < HIGH_ERROR_RATE_MIN_CALLS) return null;

    const errorRate = totalFailures / totalCalls;
    const detectorKey = 'highErrorRate';

    if (errorRate > HIGH_ERROR_RATE_THRESHOLD) {
      const consecutive = this.incrementConsecutive(detectorKey);
      if (consecutive < HIGH_ERROR_RATE_CONSECUTIVE_REQUIRED) return null;

      const fingerprint = this.generateFingerprint('Performance', 'highErrorRate', 'global');
      if (this.isOnCooldown(fingerprint)) return null;

      const sampleErrors: string[] = [];
      for (const agent of agents.slice(0, 5)) {
        const recentFails = agent
          .getState()
          .apiCallHistory.filter(h => !h.success && h.errorMessage)
          .slice(-3);
        for (const fail of recentFails) {
          sampleErrors.push(
            `[${fail.endpoint}] ${fail.errorCode ?? 'unknown'}: ${fail.errorMessage ?? 'no message'} (HTTP ${fail.httpStatusCode ?? '?'})`
          );
          if (sampleErrors.length >= 10) break;
        }
        if (sampleErrors.length >= 10) break;
      }

      return {
        area: 'Performance',
        title: 'High error rate detected across agents',
        description: `More than ${HIGH_ERROR_RATE_THRESHOLD * 100}% of recent actions are failing`,
        expectedBehavior: 'Actions should succeed most of the time',
        observedBehavior: `${Math.round(errorRate * 100)}% error rate across ${agents.length} agents (${totalFailures}/${totalCalls} calls)`,
        reproductionSteps: ['Run load test with multiple agents', 'Monitor error rates'],
        severity: 'Critical',
        frequency: 'always',
        evidence: {
          agentIds: agents.map(a => a.getState().agentId),
          timestamps: [Date.now()],
          logs: [
            '--- Sample Error Messages ---',
            ...(sampleErrors.length > 0 ? sampleErrors : ['No error details captured']),
            '',
            '--- Agent Failure Summary ---',
            ...agents.slice(0, 15).map(a => {
              const h = a.getState().apiCallHistory.slice(-HIGH_ERROR_RATE_ROLLING_WINDOW);
              const fails = h.filter(x => !x.success).length;
              return `${a.getState().agentId}: ${fails}/${h.length} recent failures`;
            }),
          ],
        },
      };
    } else {
      this.resetConsecutive(detectorKey);
    }
    return null;
  }

  detectEntityCountDivergence(agents: ResidentAgent[]): Issue | null {
    const now = Date.now();
    interface ZoneEntry {
      agentId: string;
      entityCount: number;
      lastObserveTime: number;
    }
    const zoneAgents: Map<string, ZoneEntry[]> = new Map();

    for (const agent of agents) {
      const state = agent.getState();
      const lastObserve = this.lastObserveTimes.get(state.agentId) ?? 0;
      const zone = `${Math.floor(state.position.x / ENTITY_DIVERGENCE_BUCKET_SIZE_PX)}_${Math.floor(state.position.y / ENTITY_DIVERGENCE_BUCKET_SIZE_PX)}`;
      if (!zoneAgents.has(zone)) zoneAgents.set(zone, []);
      zoneAgents.get(zone)!.push({
        agentId: state.agentId,
        entityCount: state.observedEntities.size,
        lastObserveTime: lastObserve,
      });
    }

    for (const [zone, entries] of Array.from(zoneAgents.entries())) {
      if (entries.length < ENTITY_DIVERGENCE_MIN_AGENTS_IN_COHORT) continue;

      const recentEntries = entries.filter(
        e => now - e.lastObserveTime <= ENTITY_DIVERGENCE_MAX_TIME_SKEW_MS
      );
      if (recentEntries.length < ENTITY_DIVERGENCE_MIN_AGENTS_IN_COHORT) continue;

      const counts = recentEntries.map(e => e.entityCount);
      const max = Math.max(...counts);
      const min = Math.min(...counts);

      if (max < ENTITY_DIVERGENCE_MIN_ENTITY_COUNT) continue;

      const divergenceRatio = (max - min) / Math.max(max, 1);
      if (divergenceRatio <= ENTITY_DIVERGENCE_RATIO_THRESHOLD) {
        this.resetConsecutive(`entityDivergence:${zone}`);
        continue;
      }

      const detectorKey = `entityDivergence:${zone}`;
      const consecutive = this.incrementConsecutive(detectorKey);
      if (consecutive < ENTITY_DIVERGENCE_CONSECUTIVE_REQUIRED) continue;

      const fingerprint = this.generateFingerprint('Sync', 'entityCountDivergence', zone);
      if (this.isOnCooldown(fingerprint)) continue;

      return {
        area: 'Sync',
        title: `Entity count divergence in zone ${zone}`,
        description: 'Agents in the same zone see significantly different entity counts',
        expectedBehavior: 'Agents in the same zone should see similar entity counts',
        observedBehavior: `Entity counts range from ${min} to ${max} in zone ${zone} (${Math.round(divergenceRatio * 100)}% divergence)`,
        reproductionSteps: ['Spawn multiple agents in same zone', 'Compare observed entity counts'],
        severity: 'Major',
        frequency: 'sometimes',
        evidence: {
          agentIds: recentEntries.map(e => e.agentId),
          timestamps: [now],
          logs: recentEntries.map(e => `${e.agentId}: ${e.entityCount} entities`),
        },
      };
    }
    return null;
  }

  detectFacilityStateDivergence(agents: ResidentAgent[]): Issue | null {
    const facilityViews: Map<string, { agentId: string; affords: string[] }[]> = new Map();
    for (const agent of agents) {
      const state = agent.getState();
      for (const [fId, fSnap] of Array.from(state.observedFacilities.entries())) {
        if (!facilityViews.has(fId)) facilityViews.set(fId, []);
        facilityViews.get(fId)!.push({
          agentId: state.agentId,
          affords: fSnap.affords.map(a => a.action).sort(),
        });
      }
    }

    for (const [facilityId, views] of Array.from(facilityViews.entries())) {
      if (views.length < 2) continue;
      const baseline = views[0].affords.join(',');
      for (let i = 1; i < views.length; i++) {
        const current = views[i].affords.join(',');
        if (current !== baseline) {
          return {
            area: 'Sync',
            title: `Facility state divergence for ${facilityId}`,
            description: 'Different agents see different affordances for the same facility',
            expectedBehavior: 'All agents should see the same facility affordances',
            observedBehavior: `${views[0].agentId} sees [${baseline}] but ${views[i].agentId} sees [${current}]`,
            reproductionSteps: [
              'Have multiple agents observe same facility',
              'Compare affordance lists',
            ],
            severity: 'Major',
            frequency: 'sometimes',
            evidence: {
              agentIds: [views[0].agentId, views[i].agentId],
              timestamps: [Date.now()],
              logs: [`${views[0].agentId}: ${baseline}`, `${views[i].agentId}: ${current}`],
            },
          };
        }
      }
    }
    return null;
  }

  detectObserveInconsistency(agents: ResidentAgent[]): Issue | null {
    const positionBuckets: Map<string, { agentId: string; facilityIds: string[] }[]> = new Map();
    for (const agent of agents) {
      const state = agent.getState();
      const bucket = `${Math.floor(state.position.x / 100)}_${Math.floor(state.position.y / 100)}`;
      if (!positionBuckets.has(bucket)) positionBuckets.set(bucket, []);
      positionBuckets.get(bucket)!.push({
        agentId: state.agentId,
        facilityIds: Array.from(state.observedFacilities.keys()).sort(),
      });
    }

    for (const [bucket, entries] of Array.from(positionBuckets.entries())) {
      if (entries.length < 2) continue;
      const baseline = entries[0].facilityIds.join(',');
      for (let i = 1; i < entries.length; i++) {
        const current = entries[i].facilityIds.join(',');
        if (current !== baseline && baseline.length > 0 && current.length > 0) {
          return {
            area: 'Sync',
            title: `Observe inconsistency at position bucket ${bucket}`,
            description: 'Agents at the same position see different facility lists',
            expectedBehavior: 'Agents at the same position should see the same facilities',
            observedBehavior: `${entries[0].agentId} sees [${baseline}] vs ${entries[i].agentId} sees [${current}]`,
            reproductionSteps: [
              'Place multiple agents at same position',
              'Compare observe results',
            ],
            severity: 'Major',
            frequency: 'sometimes',
            evidence: {
              agentIds: [entries[0].agentId, entries[i].agentId],
              timestamps: [Date.now()],
              logs: [`${entries[0].agentId}: ${baseline}`, `${entries[i].agentId}: ${current}`],
            },
          };
        }
      }
    }
    return null;
  }

  detectInteractFailurePattern(agents: ResidentAgent[]): Issue | null {
    for (const agent of agents) {
      const state = agent.getState();
      const recentInteractions = state.interactionHistory.slice(-INTERACTION_HISTORY_WINDOW);
      const failures = recentInteractions.filter(
        h => h.outcome === 'too_far' || h.outcome === 'invalid_action'
      );
      if (
        recentInteractions.length >= MIN_INTERACTIONS_FOR_FAILURE_DETECTION &&
        failures.length >= INTERACTION_FAILURE_THRESHOLD
      ) {
        return {
          area: 'Interactables',
          title: `Repeated interact failures for ${state.agentId}`,
          description: 'Agent experiences repeated interaction failures despite attempting',
          expectedBehavior: 'Interactions should succeed when agent is within range',
          observedBehavior: `${failures.length}/${recentInteractions.length} recent interactions failed`,
          reproductionSteps: [
            'Agent attempts to interact with facilities',
            'Most interactions fail with too_far or invalid_action',
          ],
          severity: 'Major',
          frequency: 'sometimes',
          evidence: {
            agentIds: [state.agentId],
            timestamps: failures.map(f => f.timestamp),
            logs: failures.map(f => `${f.targetId}:${f.action} → ${f.outcome}`),
          },
        };
      }
    }
    return null;
  }

  detectEventGaps(agents: ResidentAgent[]): Issue | null {
    for (const agent of agents) {
      const state = agent.getState();
      if (!state.eventCursor) continue;
      if (Number.isNaN(parseInt(state.eventCursor, 10))) continue;
      const pollCalls = state.apiCallHistory.filter(h => h.endpoint === 'pollEvents' && h.success);
      if (pollCalls.length < 3) continue;
      const lastTwo = pollCalls.slice(-2);
      const timeDiff = lastTwo[1].timestamp - lastTwo[0].timestamp;
      if (timeDiff > 30000) {
        return {
          area: 'AIC',
          title: `Event polling gap for ${state.agentId}`,
          description: 'Large gap between successful pollEvents calls may indicate missed events',
          expectedBehavior: 'PollEvents should be called regularly to avoid missing events',
          observedBehavior: `${Math.floor(timeDiff / 1000)}s gap between poll calls`,
          reproductionSteps: ['Monitor pollEvents call frequency', 'Check for gaps > 30s'],
          severity: 'Minor',
          frequency: 'sometimes',
          evidence: {
            agentIds: [state.agentId],
            timestamps: lastTwo.map(p => p.timestamp),
            logs: [`Gap: ${timeDiff}ms`, `Cursor: ${state.eventCursor}`],
          },
        };
      }
    }
    return null;
  }

  detectLowApiCoverage(agents: ResidentAgent[]): Issue | null {
    if (this.currentCycle < 10) return null;
    const usedEndpoints = new Set<string>();
    for (const agent of agents) {
      for (const record of agent.getState().apiCallHistory) {
        usedEndpoints.add(record.endpoint);
      }
    }
    const coverage = usedEndpoints.size / EXPECTED_ENDPOINTS.length;
    if (coverage < 0.5) {
      return {
        area: 'AIC',
        title: 'Low API endpoint coverage',
        description: 'Less than 50% of available API endpoints are being exercised',
        expectedBehavior: 'Agents should collectively exercise most API endpoints',
        observedBehavior: `Only ${usedEndpoints.size}/${EXPECTED_ENDPOINTS.length} endpoints used (${Math.round(coverage * 100)}%)`,
        reproductionSteps: ['Run agent loop for 10+ cycles', 'Check API coverage metrics'],
        severity: 'Minor',
        frequency: 'always',
        evidence: {
          agentIds: agents.map(a => a.getState().agentId),
          timestamps: [Date.now()],
          logs: [
            `Used: ${Array.from(usedEndpoints).join(', ')}`,
            `Missing: ${EXPECTED_ENDPOINTS.filter(e => !usedEndpoints.has(e)).join(', ')}`,
          ],
        },
      };
    }
    return null;
  }

  detectRoleComplianceAnomaly(agents: ResidentAgent[]): Issue | null {
    const now = Date.now();

    for (const agent of agents) {
      const state = agent.getState();

      if (state.actionLog.length < BEHAVIOR_COMPLIANCE_MIN_ACTIONS) continue;

      const cooldownExpiry = this.behaviorComplianceCooldowns.get(state.agentId) ?? 0;
      if (now < cooldownExpiry) continue;

      const recentHistory = state.apiCallHistory.slice(-20);
      const recentFailures = recentHistory.filter(h => !h.success).length;
      if (
        recentHistory.length >= 10 &&
        recentFailures / recentHistory.length > BEHAVIOR_COMPLIANCE_MAX_RECENT_FAIL_RATE
      ) {
        this.behaviorComplianceFailures.set(state.agentId, 0);
        continue;
      }

      for (const facility of state.observedFacilities.values()) {
        this.recordOpportunity(state.agentId, facility.type);
      }

      const scoringActions = state.actionLog.slice(-BEHAVIOR_COMPLIANCE_SCORING_WINDOW);
      const normalizedCounts: Record<string, number> = {};
      for (const label of scoringActions) {
        const normalized = this.normalizeActionLabel(label);
        normalizedCounts[normalized] = (normalizedCounts[normalized] ?? 0) + 1;
      }

      const prefs = ROLE_PREFERENCES[state.role];
      const totalPrefWeight = Object.values(prefs).reduce((sum, w) => sum + w, 0);

      let overlapScore = 0;
      const opportunityAwarePrefKeys: string[] = [];

      for (const [prefKey, prefWeight] of Object.entries(prefs)) {
        const normalizedPref = this.normalizeActionLabel(prefKey);
        const opportunityCount = this.getOpportunityCount(state.agentId, normalizedPref);

        if (opportunityCount < BEHAVIOR_COMPLIANCE_MIN_OPPORTUNITY_COUNT) continue;
        opportunityAwarePrefKeys.push(prefKey);

        const actionCount = normalizedCounts[normalizedPref] ?? 0;
        const actionRatio = actionCount / scoringActions.length;
        const prefRatio = prefWeight / totalPrefWeight;

        const matchScore = Math.min(actionRatio / Math.max(prefRatio, 0.01), 1.0) * prefWeight;
        overlapScore += matchScore;
      }

      if (opportunityAwarePrefKeys.length === 0) {
        this.behaviorComplianceFailures.set(state.agentId, 0);
        continue;
      }

      const maxPossibleScore = opportunityAwarePrefKeys.reduce(
        (sum, k) => sum + (prefs[k] ?? 0),
        0
      );
      const normalizedOverlap = maxPossibleScore > 0 ? overlapScore / maxPossibleScore : 0;

      if (normalizedOverlap >= BEHAVIOR_COMPLIANCE_OVERLAP_THRESHOLD) {
        this.behaviorComplianceFailures.set(state.agentId, 0);
        continue;
      }

      const failures = (this.behaviorComplianceFailures.get(state.agentId) ?? 0) + 1;
      this.behaviorComplianceFailures.set(state.agentId, failures);

      if (failures < BEHAVIOR_COMPLIANCE_CONSECUTIVE_REQUIRED) continue;

      this.behaviorComplianceCooldowns.set(state.agentId, now + BEHAVIOR_COMPLIANCE_COOLDOWN_MS);
      this.behaviorComplianceFailures.set(state.agentId, 0);

      const topPrefKeys = Object.entries(prefs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k]) => k);

      const topActionCats = Object.entries(normalizedCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k]) => k);

      return {
        area: 'Behavior',
        title: `Role compliance anomaly for ${state.role} agent ${state.agentId}`,
        description:
          'Agent actions do not match expected role preferences despite available opportunities',
        expectedBehavior: `${state.role} should prefer: ${topPrefKeys.join(', ')}`,
        observedBehavior: `Actual actions: ${topActionCats.join(', ')} (overlap score: ${Math.round(normalizedOverlap * 100)}%)`,
        reproductionSteps: [
          `Run agent for ${BEHAVIOR_COMPLIANCE_MIN_ACTIONS}+ cycles`,
          `Verify ${BEHAVIOR_COMPLIANCE_CONSECUTIVE_REQUIRED} consecutive compliance failures`,
          'Check opportunity-aware preference matching',
        ],
        severity: 'Minor',
        frequency: 'sometimes',
        evidence: {
          agentIds: [state.agentId],
          timestamps: [now],
          logs: [
            `Overlap score: ${Math.round(normalizedOverlap * 100)}%`,
            `Consecutive failures: ${failures}`,
            `Evaluated preferences: ${opportunityAwarePrefKeys.join(', ')}`,
            ...Object.entries(normalizedCounts).map(([k, v]) => `${k}: ${v}`),
          ],
        },
      };
    }
    return null;
  }
  detectLowDecisionEntropy(agents: ResidentAgent[]): Issue | null {
    for (const agent of agents) {
      const state = agent.getState();
      if (state.actionLog.length < 10) continue;
      if (state.role === 'afk') continue;

      const uniqueLabels = new Set(state.actionLog).size;
      if (uniqueLabels < 3) {
        return {
          area: 'Behavior',
          title: `Low decision entropy for ${state.agentId}`,
          description:
            'Agent is making very few unique decisions, suggesting the decision engine is degenerate',
          expectedBehavior: 'Agents should make at least 3 distinct types of decisions',
          observedBehavior: `Only ${uniqueLabels} unique actions in last ${state.actionLog.length} cycles`,
          reproductionSteps: ['Run agent for 10+ cycles', 'Check unique action count in actionLog'],
          severity: 'Minor',
          frequency: 'sometimes',
          evidence: {
            agentIds: [state.agentId],
            timestamps: [Date.now()],
            logs: [`Unique labels: ${uniqueLabels}`, `Actions: ${state.actionLog.join(', ')}`],
          },
        };
      }
    }
    return null;
  }

  detectIdleWithOpportunity(agents: ResidentAgent[]): Issue | null {
    for (const agent of agents) {
      const state = agent.getState();
      if (state.role === 'afk' || state.role === 'observer') continue;
      if (state.actionLog.length < 10) continue;

      const hasNearbyFacility = Array.from(state.observedFacilities.values()).some(
        f => f.distance < 100
      );
      if (!hasNearbyFacility) continue;

      const recentInteracts = state.actionLog.slice(-10).filter(l => l.startsWith('interact:'));
      if (recentInteracts.length === 0) {
        return {
          area: 'Behavior',
          title: `Idle with opportunity for ${state.agentId}`,
          description: 'Agent is near interactable facilities but has not interacted recently',
          expectedBehavior: 'Agents near facilities should occasionally interact with them',
          observedBehavior: 'No interact actions in last 10 cycles despite nearby facilities',
          reproductionSteps: [
            'Place agent near facility',
            'Monitor for 10 cycles',
            'Check for interact actions',
          ],
          severity: 'Minor',
          frequency: 'sometimes',
          evidence: {
            agentIds: [state.agentId],
            timestamps: [Date.now()],
            logs: [
              `Nearby facilities: ${Array.from(state.observedFacilities.values())
                .filter(f => f.distance < 100)
                .map(f => f.facilityId)
                .join(', ')}`,
              `Recent actions: ${state.actionLog.slice(-10).join(', ')}`,
            ],
          },
        };
      }
    }
    return null;
  }

  detectCandidateStarvation(agents: ResidentAgent[]): Issue | null {
    for (const agent of agents) {
      const state = agent.getState();
      if (state.cycleCount < 10) continue;

      if (state.observedFacilities.size === 0 && state.observedEntities.size === 0) {
        return {
          area: 'Movement',
          title: `Candidate starvation for ${state.agentId}`,
          description: 'Agent has been running for 10+ cycles but sees no facilities or entities',
          expectedBehavior: 'Agent should navigate to areas with facilities and entities',
          observedBehavior: 'Empty observedFacilities and observedEntities after 10+ cycles',
          reproductionSteps: ['Run agent for 10+ cycles', 'Check if observedFacilities is empty'],
          severity: 'Minor',
          frequency: 'rare',
          evidence: {
            agentIds: [state.agentId],
            timestamps: [Date.now()],
            logs: [
              `Cycle count: ${state.cycleCount}`,
              `Position: (${state.position.x}, ${state.position.y})`,
            ],
          },
        };
      }
    }
    return null;
  }

  runAllDetections(agents: ResidentAgent[]): Issue | null {
    this.incrementCycle();

    for (const agent of agents) {
      const state = agent.getState();
      const lastObserve = state.apiCallHistory
        .filter(h => h.endpoint === 'observe' && h.success)
        .slice(-1)[0]?.timestamp;
      if (lastObserve) {
        this.updateLastObserveTime(state.agentId);
      }
    }

    const detectors = [
      () => this.detectPositionDesync(agents),
      () => this.detectChatMismatch(agents),
      () => this.detectStuckAgent(agents),
      () => this.detectHighErrorRate(agents),
      () => this.detectEntityCountDivergence(agents),
      () => this.detectFacilityStateDivergence(agents),
      () => this.detectObserveInconsistency(agents),
      () => this.detectInteractFailurePattern(agents),
      () => this.detectEventGaps(agents),
      () => this.detectLowApiCoverage(agents),
      () => this.detectRoleComplianceAnomaly(agents),
      () => this.detectLowDecisionEntropy(agents),
      () => this.detectIdleWithOpportunity(agents),
      () => this.detectCandidateStarvation(agents),
    ];

    for (let i = detectors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [detectors[i], detectors[j]] = [detectors[j], detectors[i]];
    }

    for (const detect of detectors) {
      const issue = detect();
      if (issue) {
        return issue;
      }
    }
    return null;
  }
}

// ============================================================================
// Chaos Escalator
// ============================================================================

class ChaosEscalator {
  private escalationLevel = 0;

  escalate(loop: ResidentAgentLoop): void {
    this.escalationLevel++;
    console.log(`\n⚠️ CHAOS ESCALATION Level ${this.escalationLevel}`);

    switch (this.escalationLevel) {
      case 1:
        console.log('  → Increasing agent count by 5');
        loop.addAgents(5);
        break;
      case 2:
        console.log('  → Increasing action frequency');
        loop.setCycleDelay(500);
        break;
      case 3:
        console.log('  → Enabling chaos behaviors');
        loop.enableChaos();
        break;
      case 4:
        console.log('  → Spawning spammer agents');
        loop.addAgents(5, 'spammer');
        break;
      case 5:
        console.log('  → Maximum stress - all agents chaos mode');
        loop.setAllAgentsChaos();
        break;
      default:
        console.log('  → Maximum escalation reached, resetting');
        this.escalationLevel = 0;
    }
  }

  reset(): void {
    this.escalationLevel = 0;
  }
}

// ============================================================================
// Resident Agent
// ============================================================================

class ResidentAgent {
  private state: AgentState;
  private serverUrl: string;
  private running = false;
  private cycleDelayMs: number;
  private readonly instanceId = randomBytes(4).toString('hex');

  constructor(serverUrl: string, role: AgentRole, cycleDelayMs: number) {
    this.serverUrl = serverUrl;
    this.cycleDelayMs = cycleDelayMs;
    this.state = {
      agentId: '',
      sessionToken: '',
      role,
      position: { x: 0, y: 0 },
      lastAction: 'init',
      lastActionTime: Date.now(),
      errorCount: 0,
      observedEntities: new Map(),
      chatHistory: [],
      observedFacilities: new Map(),
      eventCursor: null,
      installedSkills: [],
      profileStatus: 'online',
      apiCallHistory: [],
      interactionHistory: [],
      actionLog: [],
      cycleCount: 0,
      consecutiveAuthErrors: 0,
      currentMissionIndex: Math.floor(Math.random() * ROLE_MISSIONS[role].length),
      currentStepIndex: 0,
      stepCyclesRemaining: ROLE_MISSIONS[role][0]?.steps[0]?.duration ?? 1,
    };
  }

  getState(): AgentState {
    return this.state;
  }

  getInstanceId(): string {
    return this.instanceId;
  }

  async register(roomId: string): Promise<boolean> {
    const name = `Resident_${this.state.role}_${randomBytes(3).toString('hex')}`;

    try {
      const response = await fetch(`${this.serverUrl}/aic/v0.1/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, roomId }),
      });

      if (!response.ok) {
        throw new Error(`Register failed: ${response.status}`);
      }

      const result = await response.json();
      if (result.status === 'ok') {
        this.state.agentId = result.data.agentId;
        this.state.sessionToken = result.data.sessionToken;
        console.log(`  ✓ Registered ${this.state.role}: ${this.state.agentId}`);
        return true;
      }
      throw new Error(result.error?.message || 'Unknown error');
    } catch (error) {
      console.error(`  ✗ Failed to register ${this.state.role}:`, error);
      this.state.errorCount++;
      return false;
    }
  }

  async start(): Promise<void> {
    this.running = true;

    while (this.running) {
      try {
        await this.performRoleBehavior();
        this.state.lastActionTime = Date.now();
        this.state.consecutiveAuthErrors = 0;
      } catch (error) {
        this.state.errorCount++;
        console.error(`[${this.state.agentId}] Error:`, error);

        if (this.isAuthError(error)) {
          this.state.consecutiveAuthErrors++;
          console.warn(
            `[${this.state.agentId}] Auth error detected (${this.state.consecutiveAuthErrors}/${MAX_CONSECUTIVE_AUTH_ERRORS}), attempting re-registration...`
          );

          if (this.state.consecutiveAuthErrors <= MAX_CONSECUTIVE_AUTH_ERRORS) {
            try {
              await this.reregister('default');
              console.log(`[${this.state.agentId}] Re-registration successful after auth error`);
              this.state.consecutiveAuthErrors = 0;
            } catch (reregisterError) {
              console.error(`[${this.state.agentId}] Re-registration failed:`, reregisterError);
              const baseBackoffMs =
                REREGISTER_RETRY_DELAY_MS * Math.pow(2, this.state.consecutiveAuthErrors);
              const jitter = baseBackoffMs * 0.25 * (Math.random() * 2 - 1);
              await sleep(baseBackoffMs + jitter);
            }
          } else {
            console.error(
              `[${this.state.agentId}] Max consecutive auth errors reached, stopping agent`
            );
            this.running = false;
            return;
          }
        }
      }

      await sleep(this.cycleDelayMs);
    }
  }

  private isAuthError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const message = error.message;
    // Pattern: "Observe failed: 401", "Move failed: 403"
    const statusMatch = message.match(/failed:\s*(\d{3})/i);
    if (statusMatch) {
      const statusCode = parseInt(statusMatch[1], 10);
      return AUTH_ERROR_STATUS_CODES.has(statusCode);
    }

    // Only rely on status code matching; avoid broad string patterns
    // that could false-positive on unrelated error messages
    return false;
  }

  stop(): void {
    this.running = false;
    this.unregister().catch(() => {});
  }

  async stopGracefully(): Promise<void> {
    this.running = false;
    await this.unregister().catch(() => {});
  }

  setCycleDelay(ms: number): void {
    this.cycleDelayMs = ms;
  }

  setChaosBehavior(): void {
    this.state.role = 'chaos';
  }

  private async performRoleBehavior(): Promise<void> {
    await this.ensureRegistered('default');

    const lastObserveIdx = this.state.actionLog.lastIndexOf('observe');
    if (
      lastObserveIdx === -1 ||
      this.state.actionLog.length - lastObserveIdx > MAX_CYCLES_WITHOUT_OBSERVE
    ) {
      await this.observe();
    }

    const candidates = this.buildCandidates();
    const chosen = this.selectAction(candidates);

    console.log(
      `[${this.state.agentId}][${this.state.role}] → ${chosen.label} (w=${chosen.weight.toFixed(3)})`
    );
    await chosen.action();

    this.state.actionLog.push(chosen.label);
    if (this.state.actionLog.length > ACTION_LOG_MAX_LENGTH) {
      this.state.actionLog.shift();
    }
    this.state.cycleCount++;
  }

  private selectAction(candidates: ActionCandidate[]): ActionCandidate {
    if (candidates.length === 0) {
      return {
        action: () => this.observe(),
        weight: 1,
        label: 'observe:fallback',
        category: 'observe',
      };
    }
    const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight <= 0) return candidates[0];
    let roll = Math.random() * totalWeight;
    for (const candidate of candidates) {
      roll -= candidate.weight;
      if (roll <= 0) return candidate;
    }
    return candidates[candidates.length - 1];
  }

  private getRolePreference(facilityTypeOrKey: string, action?: string): number {
    const prefs = ROLE_PREFERENCES[this.state.role];
    if (action) {
      const exactKey = `${facilityTypeOrKey}:${action}`;
      if (prefs[exactKey] !== undefined) return prefs[exactKey];
      if (prefs[facilityTypeOrKey] !== undefined) return prefs[facilityTypeOrKey];
      if (prefs[action] !== undefined) return prefs[action];
    } else {
      if (prefs[facilityTypeOrKey] !== undefined) return prefs[facilityTypeOrKey];
    }
    return 0.01;
  }

  private computeNoveltyMultiplier(label: string): number {
    const recentCount = this.state.actionLog.filter(l => l === label).length;
    if (recentCount === 0) return 1.0;
    if (recentCount === 1) return 0.7;
    if (recentCount === 2) return 0.4;
    return 0.1;
  }

  private computeCenterBiasedWanderTarget(): { tx: number; ty: number } {
    const tx = Math.floor(MAP_CENTER_X + (Math.random() - 0.5) * 2 * STARVATION_WANDER_SPREAD);
    const ty = Math.floor(MAP_CENTER_Y + (Math.random() - 0.5) * 2 * STARVATION_WANDER_SPREAD);
    return {
      tx: Math.max(0, Math.min(63, tx)),
      ty: Math.max(0, Math.min(63, ty)),
    };
  }

  private computeRandomWanderTarget(): { tx: number; ty: number } {
    return {
      tx: Math.floor(Math.random() * 64),
      ty: Math.floor(Math.random() * 64),
    };
  }

  private generateRoleChat(): string {
    const messages = ROLE_CHAT_MESSAGES[this.state.role];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private pickRoleStatus(): string {
    const statuses = ROLE_STATUSES[this.state.role];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  private getCurrentMissionStep(): MissionStep | null {
    const missions = ROLE_MISSIONS[this.state.role];
    if (!missions || missions.length === 0) return null;
    const mission = missions[this.state.currentMissionIndex % missions.length];
    if (!mission || !mission.steps || mission.steps.length === 0) return null;
    return mission.steps[this.state.currentStepIndex % mission.steps.length];
  }

  private advanceMissionStep(): void {
    const missions = ROLE_MISSIONS[this.state.role];
    if (!missions || missions.length === 0) return;
    const mission = missions[this.state.currentMissionIndex % missions.length];
    if (!mission) return;

    this.state.stepCyclesRemaining--;
    if (this.state.stepCyclesRemaining <= 0) {
      this.state.currentStepIndex++;
      if (this.state.currentStepIndex >= mission.steps.length) {
        this.state.currentStepIndex = 0;
        if (!mission.repeat) {
          this.state.currentMissionIndex = (this.state.currentMissionIndex + 1) % missions.length;
        }
      }
      const nextStep = mission.steps[this.state.currentStepIndex % mission.steps.length];
      this.state.stepCyclesRemaining = nextStep?.duration ?? 1;
    }
  }

  private getMissionBoost(actionLabel: string): number {
    const step = this.getCurrentMissionStep();
    if (!step) return 1.0;
    if (actionLabel.includes(step.action) || step.action === 'random') {
      return 3.0;
    }
    if (step.action.includes(':') && actionLabel.includes(step.action.split(':')[0])) {
      return 2.0;
    }
    return 0.5;
  }

  private shouldChatThisCycle(): boolean {
    const step = this.getCurrentMissionStep();
    if (!step) return Math.random() < 0.1;
    return Math.random() < step.chatChance;
  }

  private buildCandidates(): ActionCandidate[] {
    const candidates: ActionCandidate[] = [];
    const { observedFacilities, observedEntities, position, role } = this.state;

    this.advanceMissionStep();

    candidates.push({
      action: () => this.observe(),
      weight: 0.15 * this.computeNoveltyMultiplier('observe') * this.getMissionBoost('observe'),
      label: 'observe',
      category: 'observe',
    });

    candidates.push({
      action: () => this.pollEvents(),
      weight:
        this.getRolePreference('pollEvents') *
        this.computeNoveltyMultiplier('pollEvents') *
        this.getMissionBoost('pollEvents'),
      label: 'pollEvents',
      category: 'observe',
    });

    candidates.push({
      action: () => this.chatObserve(),
      weight:
        this.getRolePreference('chatObserve') *
        this.computeNoveltyMultiplier('chatObserve') *
        this.getMissionBoost('chatObserve'),
      label: 'chatObserve',
      category: 'social',
    });

    for (const facility of Array.from(observedFacilities.values())) {
      if (facility.distance < 100) {
        for (const afford of facility.affords) {
          const label = `interact:${facility.type}:${afford.action}`;
          candidates.push({
            action: async () => {
              await this.interact(facility.facilityId, afford.action);
            },
            weight:
              this.getRolePreference(facility.type, afford.action) *
              this.computeNoveltyMultiplier(label) *
              this.getMissionBoost(`${facility.type}:${afford.action}`),
            label,
            category: 'interact',
          });
        }
      } else {
        const label = `navigate:${facility.type}`;
        candidates.push({
          action: () =>
            this.moveTo(
              Math.floor(facility.position.x / TILE_SIZE),
              Math.floor(facility.position.y / TILE_SIZE)
            ),
          weight:
            this.getRolePreference(facility.type, 'navigate') *
            this.computeNoveltyMultiplier(label) *
            NAVIGATE_WEIGHT_DAMPENING *
            this.getMissionBoost(`navigate:${facility.type}`),
          label,
          category: 'navigate',
        });
      }
    }

    for (const entity of Array.from(observedEntities.values())) {
      const dist = Math.hypot(entity.position.x - position.x, entity.position.y - position.y);
      if (dist > 200) continue;
      const label = `navigate:entity:${entity.entityId.substring(0, 8)}`;
      candidates.push({
        action: () =>
          this.moveTo(
            Math.floor(entity.position.x / TILE_SIZE),
            Math.floor(entity.position.y / TILE_SIZE)
          ),
        weight:
          this.getRolePreference('entity', 'approach') *
          this.computeNoveltyMultiplier(label) *
          ENTITY_APPROACH_WEIGHT_DAMPENING *
          this.getMissionBoost('navigate:entity'),
        label,
        category: 'navigate',
      });
    }

    const chatLabel = `chat:${role}`;
    const chatWeight = this.shouldChatThisCycle()
      ? this.getRolePreference('chat') *
        this.computeNoveltyMultiplier(chatLabel) *
        this.getMissionBoost('chat') *
        2.0
      : this.getRolePreference('chat') * this.computeNoveltyMultiplier(chatLabel) * 0.3;
    candidates.push({
      action: () => this.chat(this.generateRoleChat()),
      weight: chatWeight,
      label: chatLabel,
      category: 'social',
    });

    const profileLabel = `profileUpdate:${role}`;
    candidates.push({
      action: () => this.profileUpdate({ status: this.pickRoleStatus() }),
      weight:
        this.getRolePreference('profileUpdate') *
        this.computeNoveltyMultiplier(profileLabel) *
        this.getMissionBoost('profileUpdate'),
      label: profileLabel,
      category: 'profile',
    });

    candidates.push({
      action: () => this.skillList(),
      weight: this.getRolePreference('skillList') * this.computeNoveltyMultiplier('skillList'),
      label: 'skillList',
      category: 'skill',
    });

    if (this.state.installedSkills.length === 0) {
      candidates.push({
        action: () => this.skillInstall('default'),
        weight:
          this.getRolePreference('skillList') *
          0.5 *
          this.computeNoveltyMultiplier('skillInstall:default'),
        label: 'skillInstall:default',
        category: 'skill',
      });
    }

    for (const skillId of this.state.installedSkills) {
      const label = `skillInvoke:${skillId}`;
      candidates.push({
        action: () => this.skillInvoke(skillId, 'use'),
        weight: this.getRolePreference('skillList') * 0.3 * this.computeNoveltyMultiplier(label),
        label,
        category: 'skill',
      });
    }

    const isStarving = observedFacilities.size === 0 && observedEntities.size === 0;
    const wanderLabel = isStarving ? 'navigate:wander:starvation' : 'navigate:wander';
    const baseWanderWeight =
      this.getRolePreference('wander') * this.computeNoveltyMultiplier(wanderLabel);
    const wanderWeight = isStarving
      ? Math.max(baseWanderWeight * STARVATION_WANDER_BOOST, STARVATION_MIN_WANDER_WEIGHT)
      : baseWanderWeight;

    const { tx, ty } = isStarving
      ? this.computeCenterBiasedWanderTarget()
      : this.computeRandomWanderTarget();

    candidates.push({
      action: () => this.moveTo(tx, ty),
      weight: wanderWeight,
      label: wanderLabel,
      category: 'navigate',
    });

    if (role === 'chaos') {
      candidates.push({
        action: async () => this.reregister('default'),
        weight: 0.08 * this.computeNoveltyMultiplier('chaos:reregister'),
        label: 'chaos:reregister',
        category: 'lifecycle',
      });
    }

    if (this.state.errorCount > 5) {
      const recentErrors = this.state.apiCallHistory.filter(h => !h.success).slice(-5);
      const errorCategories = new Set(
        recentErrors.map(e => ENDPOINT_TO_CATEGORY[e.endpoint] ?? e.endpoint)
      );
      for (const candidate of candidates) {
        if (errorCategories.has(candidate.category)) {
          candidate.weight *= 0.3;
        }
      }
    }

    return candidates;
  }

  private classifyErrorCode(
    httpStatus: number | undefined
  ): 'network_error' | 'server_error' | 'client_error' {
    if (!httpStatus) return 'network_error';
    return httpStatus >= 500 ? 'server_error' : 'client_error';
  }

  private buildErrorDetails(
    httpStatus: number | undefined,
    error: unknown
  ): { httpStatusCode?: number; errorMessage: string; errorCode: string } {
    return {
      httpStatusCode: httpStatus,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorCode: this.classifyErrorCode(httpStatus),
    };
  }

  private recordApiCall(
    endpoint: string,
    startMs: number,
    success: boolean,
    errorDetails?: { httpStatusCode?: number; errorMessage?: string; errorCode?: string }
  ): void {
    this.state.apiCallHistory.push({
      endpoint,
      timestamp: Date.now(),
      success,
      responseTime: Date.now() - startMs,
      ...errorDetails,
    });
    if (this.state.apiCallHistory.length > API_HISTORY_MAX_LENGTH) {
      this.state.apiCallHistory.shift();
    }
  }

  private async observe(): Promise<void> {
    const startMs = Date.now();
    let httpStatus: number | undefined;
    try {
      const response = await fetch(`${this.serverUrl}/aic/v0.1/observe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.sessionToken}`,
        },
        body: JSON.stringify({
          agentId: this.state.agentId,
          roomId: 'default',
          radius: 200,
          detail: 'full',
        }),
      });

      httpStatus = response.status;
      if (!response.ok) throw new Error(`Observe failed: ${response.status}`);

      const result = await response.json();
      if (result.status === 'ok') {
        if (result.data.nearby) {
          this.state.observedEntities.clear();
          for (const entity of result.data.nearby) {
            if (entity.entity?.pos?.x != null && entity.entity?.pos?.y != null) {
              this.state.observedEntities.set(entity.entity.id, {
                entityId: entity.entity.id,
                position: { x: entity.entity.pos.x, y: entity.entity.pos.y },
                timestamp: Date.now(),
              });
            }
          }
        }
        if (result.data.facilities) {
          this.state.observedFacilities.clear();
          for (const f of result.data.facilities) {
            this.state.observedFacilities.set(f.id, {
              facilityId: f.id,
              type: f.type,
              name: f.name ?? f.id,
              position: { x: f.position?.x ?? 0, y: f.position?.y ?? 0 },
              affords: f.affords ?? [],
              distance: f.distance ?? 9999,
              timestamp: Date.now(),
            });
          }
        }
        this.state.position = {
          x: result.data.self?.pos?.x ?? this.state.position.x,
          y: result.data.self?.pos?.y ?? this.state.position.y,
        };
      }
      this.recordApiCall('observe', startMs, true);
      this.state.lastAction = 'observe';
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.recordApiCall('observe', startMs, false, {
        httpStatusCode: httpStatus,
        errorMessage: errMsg,
        errorCode: httpStatus
          ? httpStatus >= 500
            ? 'server_error'
            : 'client_error'
          : 'network_error',
      });
      throw error;
    }
  }

  private async moveTo(tx: number, ty: number): Promise<void> {
    const startMs = Date.now();
    let httpStatus: number | undefined;
    try {
      const response = await fetch(`${this.serverUrl}/aic/v0.1/moveTo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.sessionToken}`,
        },
        body: JSON.stringify({
          agentId: this.state.agentId,
          roomId: 'default',
          txId: generateTxId(),
          dest: { tx, ty },
        }),
      });

      httpStatus = response.status;
      if (!response.ok) throw new Error(`Move failed: ${response.status}`);
      this.recordApiCall('moveTo', startMs, true);
      this.state.lastAction = `moveTo(${tx}, ${ty})`;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.recordApiCall('moveTo', startMs, false, {
        httpStatusCode: httpStatus,
        errorMessage: errMsg,
        errorCode: httpStatus
          ? httpStatus >= 500
            ? 'server_error'
            : 'client_error'
          : 'network_error',
      });
      throw error;
    }
  }

  private async chat(message: string, channel = 'global'): Promise<void> {
    const startMs = Date.now();
    let httpStatus: number | undefined;
    try {
      const response = await fetch(`${this.serverUrl}/aic/v0.1/chatSend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.sessionToken}`,
        },
        body: JSON.stringify({
          agentId: this.state.agentId,
          roomId: 'default',
          txId: generateTxId(),
          channel,
          message,
        }),
      });

      httpStatus = response.status;
      if (!response.ok) throw new Error(`Chat failed: ${response.status}`);
      this.recordApiCall('chatSend', startMs, true);
      this.state.lastAction = `chat("${message.substring(0, 20)}...")`;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.recordApiCall('chatSend', startMs, false, {
        httpStatusCode: httpStatus,
        errorMessage: errMsg,
        errorCode: httpStatus
          ? httpStatus >= 500
            ? 'server_error'
            : 'client_error'
          : 'network_error',
      });
      throw error;
    }
  }

  private async chatObserve(): Promise<void> {
    const startMs = Date.now();
    let httpStatus: number | undefined;
    try {
      const response = await fetch(`${this.serverUrl}/aic/v0.1/chatObserve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.sessionToken}`,
        },
        body: JSON.stringify({
          agentId: this.state.agentId,
          roomId: 'default',
          windowSec: 60,
        }),
      });

      httpStatus = response.status;
      if (!response.ok) throw new Error(`ChatObserve failed: ${response.status}`);

      const result = await response.json();
      if (result.status === 'ok' && result.data.messages) {
        this.state.chatHistory = result.data.messages.map(
          (m: {
            fromEntityId: string;
            fromName: string;
            message: string;
            channel: string;
            tsMs: number;
          }) => ({
            from: m.fromEntityId,
            message: m.message,
            timestamp: m.tsMs,
            channel: m.channel,
          })
        );
      }
      this.recordApiCall('chatObserve', startMs, true);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.recordApiCall('chatObserve', startMs, false, {
        httpStatusCode: httpStatus,
        errorMessage: errMsg,
        errorCode: httpStatus
          ? httpStatus >= 500
            ? 'server_error'
            : 'client_error'
          : 'network_error',
      });
      throw error;
    }
  }

  private async interact(
    targetId: string,
    action: string,
    params?: Record<string, unknown>
  ): Promise<string> {
    const startMs = Date.now();
    let httpStatus: number | undefined;
    try {
      const response = await fetch(`${this.serverUrl}/aic/v0.1/interact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.sessionToken}`,
        },
        body: JSON.stringify({
          agentId: this.state.agentId,
          roomId: 'default',
          txId: generateTxId(),
          targetId,
          action,
          ...(params && { params }),
        }),
      });

      httpStatus = response.status;
      if (!response.ok) throw new Error(`Interact failed: ${response.status}`);

      const result = await response.json();
      const outcome = result.data?.outcome?.type ?? 'unknown';
      this.state.interactionHistory.push({ targetId, action, outcome, timestamp: Date.now() });
      if (this.state.interactionHistory.length > INTERACTION_HISTORY_MAX_LENGTH) {
        this.state.interactionHistory.shift();
      }
      this.recordApiCall('interact', startMs, true);
      this.state.lastAction = `interact(${targetId}, ${action})`;
      return outcome;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.recordApiCall('interact', startMs, false, {
        httpStatusCode: httpStatus,
        errorMessage: errMsg,
        errorCode: httpStatus
          ? httpStatus >= 500
            ? 'server_error'
            : 'client_error'
          : 'network_error',
      });
      throw error;
    }
  }

  private async pollEvents(waitMs = 0): Promise<void> {
    const startMs = Date.now();
    let httpStatus: number | undefined;
    try {
      const requestBody: Record<string, unknown> = {
        agentId: this.state.agentId,
        roomId: 'default',
        limit: 50,
      };
      if (this.state.eventCursor) {
        requestBody.sinceCursor = this.state.eventCursor;
      }
      if (waitMs > 0) {
        requestBody.waitMs = Math.min(waitMs, 1000);
      }
      console.error(
        `[${this.state.agentId}] eventCursor value: ${JSON.stringify(this.state.eventCursor)}, type: ${typeof this.state.eventCursor}`
      );

      const response = await fetch(`${this.serverUrl}/aic/v0.1/pollEvents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.sessionToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      httpStatus = response.status;
      if (!response.ok) {
        const errorBody = await response.text();
        const errorDetail = {
          endpoint: 'pollEvents',
          httpStatusCode: response.status,
          errorCode:
            response.status >= 400 && response.status < 500 ? 'client_error' : 'server_error',
          errorMessage: errorBody,
          requestBody: JSON.stringify(requestBody),
          responseBody: errorBody,
          timestamp: Date.now(),
        };
        this.state.lastError = errorDetail;
        console.error(`[${this.state.agentId}] PollEvents error body: ${errorBody}`);
        console.error(`[${this.state.agentId}] Request body sent: ${JSON.stringify(requestBody)}`);
        throw new Error(`PollEvents failed: ${response.status}`);
      }

      const result = await response.json();
      if (result.status === 'ok') {
        if (result.data.nextCursor) {
          this.state.eventCursor = result.data.nextCursor;
        }
      }
      this.recordApiCall('pollEvents', startMs, true);
      this.state.lastAction = 'pollEvents';
    } catch (error) {
      this.recordApiCall('pollEvents', startMs, false, this.buildErrorDetails(httpStatus, error));
      throw error;
    }
  }

  private async profileUpdate(fields: {
    status?: string;
    statusMessage?: string;
    title?: string;
    department?: string;
  }): Promise<void> {
    const startMs = Date.now();
    let httpStatus: number | undefined;
    try {
      const response = await fetch(`${this.serverUrl}/aic/v0.1/profile/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.sessionToken}`,
        },
        body: JSON.stringify({
          agentId: this.state.agentId,
          roomId: 'default',
          ...fields,
        }),
      });

      httpStatus = response.status;
      if (!response.ok) throw new Error(`ProfileUpdate failed: ${response.status}`);
      if (fields.status) this.state.profileStatus = fields.status;
      this.recordApiCall('profileUpdate', startMs, true);
      this.state.lastAction = `profileUpdate(${fields.status ?? 'fields'})`;
    } catch (error) {
      this.recordApiCall(
        'profileUpdate',
        startMs,
        false,
        this.buildErrorDetails(httpStatus, error)
      );
      throw error;
    }
  }

  private async skillList(category?: string): Promise<void> {
    const startMs = Date.now();
    let httpStatus: number | undefined;
    try {
      const response = await fetch(`${this.serverUrl}/aic/v0.1/skill/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.sessionToken}`,
        },
        body: JSON.stringify({
          agentId: this.state.agentId,
          roomId: 'default',
          ...(category && { category }),
        }),
      });

      httpStatus = response.status;
      if (!response.ok) throw new Error(`SkillList failed: ${response.status}`);

      const result = await response.json();
      if (result.status === 'ok' && result.data?.skills) {
        this.state.installedSkills = result.data.skills
          .filter((s: { installed?: boolean }) => s.installed)
          .map((s: { id: string }) => s.id);
      }
      this.recordApiCall('skillList', startMs, true);
      this.state.lastAction = 'skillList';
    } catch (error) {
      this.recordApiCall('skillList', startMs, false, this.buildErrorDetails(httpStatus, error));
      throw error;
    }
  }

  private async skillInstall(skillId: string): Promise<void> {
    const startMs = Date.now();
    let httpStatus: number | undefined;
    try {
      const response = await fetch(`${this.serverUrl}/aic/v0.1/skill/install`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.sessionToken}`,
        },
        body: JSON.stringify({
          agentId: this.state.agentId,
          roomId: 'default',
          txId: generateTxId(),
          skillId,
        }),
      });

      httpStatus = response.status;
      if (!response.ok) throw new Error(`SkillInstall failed: ${response.status}`);
      if (!this.state.installedSkills.includes(skillId)) {
        this.state.installedSkills.push(skillId);
      }
      this.recordApiCall('skillInstall', startMs, true);
      this.state.lastAction = `skillInstall(${skillId})`;
    } catch (error) {
      this.recordApiCall('skillInstall', startMs, false, this.buildErrorDetails(httpStatus, error));
      throw error;
    }
  }

  private async skillInvoke(
    skillId: string,
    actionId: string,
    targetId?: string,
    params?: Record<string, unknown>
  ): Promise<void> {
    const startMs = Date.now();
    let httpStatus: number | undefined;
    try {
      const response = await fetch(`${this.serverUrl}/aic/v0.1/skill/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.sessionToken}`,
        },
        body: JSON.stringify({
          agentId: this.state.agentId,
          roomId: 'default',
          txId: generateTxId(),
          skillId,
          actionId,
          ...(targetId && { targetId }),
          ...(params && { params }),
        }),
      });

      httpStatus = response.status;
      if (!response.ok) throw new Error(`SkillInvoke failed: ${response.status}`);
      this.recordApiCall('skillInvoke', startMs, true);
      this.state.lastAction = `skillInvoke(${skillId}:${actionId})`;
    } catch (error) {
      this.recordApiCall('skillInvoke', startMs, false, this.buildErrorDetails(httpStatus, error));
      throw error;
    }
  }

  private async unregister(): Promise<void> {
    if (!this.state.agentId || !this.state.sessionToken) {
      return;
    }

    const startMs = Date.now();
    const currentAgentId = this.state.agentId;
    try {
      const response = await fetch(`${this.serverUrl}/aic/v0.1/unregister`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.sessionToken}`,
        },
        body: JSON.stringify({
          agentId: this.state.agentId,
          roomId: 'default',
        }),
      });

      if (!response.ok) {
        if (RECOVERABLE_UNREGISTER_STATUS_CODES.has(response.status)) {
          this.recordApiCall('unregister', startMs, true);
          this.clearRegistrationState();
          this.state.lastAction = `unregister(recovered:${response.status})`;
          console.warn(
            `[${currentAgentId}] Unregister returned ${response.status}; continuing with local state reset`
          );
          return;
        }
        throw new Error(`Unregister failed: ${response.status}`);
      }

      this.recordApiCall('unregister', startMs, true);
      this.clearRegistrationState();
      this.state.lastAction = 'unregister';
    } catch (error) {
      this.recordApiCall('unregister', startMs, false);
      throw error;
    }
  }

  private clearRegistrationState(): void {
    this.state.sessionToken = '';
    this.state.agentId = '';
    this.state.eventCursor = null;
  }

  private async ensureRegistered(roomId: string): Promise<void> {
    if (this.state.agentId && this.state.sessionToken) {
      return;
    }

    const registered = await this.register(roomId);
    if (!registered) {
      this.state.lastAction = 'register(retry:failed)';
      throw new Error('Agent is not registered and automatic re-register failed');
    }
  }

  private resetAfterReregister(): void {
    this.state.observedEntities.clear();
    this.state.observedFacilities.clear();
    this.state.chatHistory = [];
    this.state.interactionHistory = [];
    this.state.actionLog = [];
    this.state.eventCursor = null;
    this.state.errorCount = 0;
  }

  private async reregister(roomId: string): Promise<void> {
    const priorAgentId = this.state.agentId;
    try {
      await this.unregister();
    } catch (error) {
      console.warn(
        `[${priorAgentId || 'unknown'}] Unregister failed during reregister; retrying register path: ${String(error)}`
      );
      this.clearRegistrationState();
    }

    await sleep(REREGISTER_RETRY_DELAY_MS);

    for (let attempt = 1; attempt <= REREGISTER_MAX_ATTEMPTS; attempt++) {
      const registered = await this.register(roomId);
      if (registered) {
        this.resetAfterReregister();
        await this.observe();
        return;
      }

      if (attempt < REREGISTER_MAX_ATTEMPTS) {
        await sleep(REREGISTER_RETRY_DELAY_MS * attempt);
      }
    }

    this.state.lastAction = 'reregister(failed)';
    throw new Error(`Failed to re-register after ${REREGISTER_MAX_ATTEMPTS} attempts`);
  }
}

// ============================================================================
// Resident Agent Loop (Main Orchestrator)
// ============================================================================

class ResidentAgentLoop {
  private config: Config;
  private state: LoopState;
  private agents: ResidentAgent[] = [];
  private issueDetector: IssueDetector;
  private issueReporter: GitHubIssueReporter;
  private chaosEscalator: ChaosEscalator;
  private running = false;

  constructor(config: Config) {
    this.config = config;
    this.state = loadState();
    this.issueDetector = new IssueDetector();
    this.issueReporter = new GitHubIssueReporter(config.dryRun);
    this.chaosEscalator = new ChaosEscalator();

    this.state.stressLevel = config.stressLevel;
    this.state.agentCount = config.agentCount;
    this.state.chaosEnabled = config.chaosEnabled;
  }

  async run(): Promise<void> {
    this.printBanner();

    if (!(await this.ensureRunningLatestMain())) {
      return;
    }

    if (!(await this.checkServerHealth())) {
      console.error('❌ Server not reachable. Please start the server first.');
      await this.reportDeployIssue('Server unreachable');
      return;
    }

    await this.initializeAgents();

    console.log('\n🚀 Starting agent behaviors...');
    for (const agent of this.agents) {
      void agent.start();
    }

    this.running = true;

    while (this.running) {
      await this.runCycle();
      await sleep(this.config.issueCheckIntervalMs);
    }
  }

  private printBanner(): void {
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║     OpenClawWorld Resident Agent Loop                            ║');
    console.log('║     Issue-First Autonomous Society Orchestrator                  ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');
    console.log();
    console.log('Configuration:');
    console.log(`  Server URL:     ${this.config.serverUrl}`);
    console.log(`  Agent Count:    ${this.config.agentCount}`);
    console.log(`  Stress Level:   ${this.config.stressLevel}`);
    console.log(`  Chaos Enabled:  ${this.config.chaosEnabled}`);
    console.log(`  Dry Run:        ${this.config.dryRun}`);
    console.log(`  Cycle Delay:    ${this.config.cycleDelayMs}ms`);
    console.log();
  }

  private async checkServerHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.serverUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async reportDeployIssue(reason: string): Promise<void> {
    const issue: Issue = {
      area: 'Deploy',
      title: reason,
      description: `Deployment or server availability issue: ${reason}`,
      expectedBehavior: 'Server should be reachable and healthy',
      observedBehavior: reason,
      reproductionSteps: [
        'Start the server with docker compose up',
        'Check health endpoint at /health',
      ],
      severity: 'Critical',
      frequency: 'always',
      evidence: {
        agentIds: [],
        timestamps: [Date.now()],
        logs: [reason],
      },
    };

    await this.issueReporter.createIssue(issue);
  }

  private async ensureRunningLatestMain(): Promise<boolean> {
    const runningSha = getCommitSha();
    const trackedMainSha = refreshTrackedMainSha();
    this.state.lastCommitSha = runningSha;
    saveState(this.state);

    if (!trackedMainSha || runningSha === trackedMainSha) {
      return true;
    }

    const reason = `Resident loop running stale commit (${runningSha}); latest tracked origin/main is ${trackedMainSha}. Please restart loop from latest main.`;
    console.error(`❌ ${reason}`);
    await this.reportDeployIssue(reason);
    return false;
  }

  private async initializeAgents(): Promise<void> {
    console.log('\n🤖 Initializing agents...');

    for (let i = 0; i < this.config.agentCount; i++) {
      const role = ROLES[i % ROLES.length];
      const agent = new ResidentAgent(this.config.serverUrl, role, this.config.cycleDelayMs);
      const registered = await agent.register(this.config.roomId);
      if (registered) {
        this.agents.push(agent);
        this.state.agents.push(agent.getState().agentId);
      }
    }

    console.log(`✅ ${this.agents.length} agents initialized`);
    saveState(this.state);
  }

  private async runCycle(): Promise<void> {
    this.state.cycleCount++;
    console.log(`\n--- Cycle ${this.state.cycleCount} ---`);

    if (checkForUpdatesAndPull()) {
      console.log('   Gracefully stopping agents before restart...');
      await this.stopGracefully();
      restartProcess();
    }

    const issue = this.issueDetector.runAllDetections(this.agents);

    if (issue) {
      const evidenceKey = issue.evidence.agentIds[0] ?? issue.title.slice(0, 30);
      const fingerprint = `${issue.area}:${issue.title.split(' ')[0]}:${evidenceKey}`;
      this.issueDetector.markReported(fingerprint);
      const issueUrl = await this.issueReporter.createIssue(issue);
      if (issueUrl) {
        this.state.totalIssuesCreated++;
        this.state.lastIssueCreated = issueUrl;
        this.state.cyclesWithoutIssue = 0;
        this.state.recentIssues.push(issueUrl);
        if (this.state.recentIssues.length > 10) {
          this.state.recentIssues.shift();
        }
        this.chaosEscalator.reset();
      }
    } else {
      this.state.cyclesWithoutIssue++;
      console.log(`  No issues detected (${this.state.cyclesWithoutIssue} cycles without issue)`);

      if (this.state.cyclesWithoutIssue >= 2) {
        this.state.escalationCount++;
        this.chaosEscalator.escalate(this);
      }
    }

    const usedEndpoints = new Set<string>();
    for (const agent of this.agents) {
      for (const record of agent.getState().apiCallHistory) {
        usedEndpoints.add(record.endpoint);
      }
    }
    const coverage = Math.round((usedEndpoints.size / EXPECTED_ENDPOINTS.length) * 100);

    console.log(`  Agents: ${this.agents.length}`);
    console.log(`  Total Issues: ${this.state.totalIssuesCreated}`);
    console.log(`  Escalations: ${this.state.escalationCount}`);
    console.log(
      `  API Coverage: ${usedEndpoints.size}/${EXPECTED_ENDPOINTS.length} (${coverage}%)`
    );

    saveState(this.state);
  }

  addAgents(count: number, role?: AgentRole): void {
    console.log(`  Adding ${count} agents...`);
    for (let i = 0; i < count; i++) {
      const agentRole = role || ROLES[Math.floor(Math.random() * ROLES.length)];
      const agent = new ResidentAgent(this.config.serverUrl, agentRole, this.config.cycleDelayMs);
      agent
        .register(this.config.roomId)
        .then(success => {
          if (success) {
            this.agents.push(agent);
            this.state.agents.push(agent.getState().agentId);
            this.state.agentCount = this.agents.length;
            void agent.start();
          }
        })
        .catch(err => {
          console.error('  Failed to add agent:', err);
        });
    }
  }

  setCycleDelay(ms: number): void {
    this.config.cycleDelayMs = ms;
    for (const agent of this.agents) {
      agent.setCycleDelay(ms);
    }
  }

  enableChaos(): void {
    this.config.chaosEnabled = true;
    this.state.chaosEnabled = true;
  }

  setAllAgentsChaos(): void {
    for (const agent of this.agents) {
      agent.setChaosBehavior();
    }
  }

  stop(): void {
    this.running = false;
    for (const agent of this.agents) {
      agent.stop();
    }
    console.log('\n🛑 Resident Agent Loop stopped');
    saveState(this.state);
  }

  async stopGracefully(): Promise<void> {
    this.running = false;
    await Promise.allSettled(this.agents.map(a => a.stopGracefully()));
    console.log('\n🛑 Resident Agent Loop stopped');
    saveState(this.state);
  }
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArgs(): Config {
  const args = process.argv.slice(2);

  const config: Config = {
    serverUrl: process.env.SERVER_URL ?? 'http://localhost:2567',
    agentCount: 10,
    stressLevel: 'medium',
    chaosEnabled: false,
    dryRun: false,
    roomId: 'default',
    cycleDelayMs: 2000,
    issueCheckIntervalMs: 10000,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--agents':
      case '-a':
        if (nextArg) {
          const parsed = parseInt(nextArg, 10);
          if (!Number.isNaN(parsed) && parsed > 0) {
            config.agentCount = parsed;
          } else {
            console.warn(`Invalid --agents value: ${nextArg}, using default`);
          }
          i++;
        }
        break;
      case '--stress':
      case '-s':
        if (nextArg && ['low', 'medium', 'high'].includes(nextArg)) {
          config.stressLevel = nextArg as StressLevel;
          i++;
        }
        break;
      case '--chaos':
        config.chaosEnabled = true;
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--room':
      case '-r':
        if (nextArg) {
          config.roomId = nextArg;
          i++;
        }
        break;
      case '--url':
      case '-u':
        if (nextArg) {
          config.serverUrl = nextArg;
          i++;
        }
        break;
      case '--delay':
        if (nextArg) {
          const parsed = parseInt(nextArg, 10);
          if (!Number.isNaN(parsed) && parsed > 0) {
            config.cycleDelayMs = parsed;
          } else {
            console.warn(`Invalid --delay value: ${nextArg}, using default`);
          }
          i++;
        }
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return config;
}

function printHelp(): void {
  console.log('OpenClawWorld Resident Agent Loop');
  console.log();
  console.log('Usage: pnpm resident-agent-loop [options]');
  console.log();
  console.log('Options:');
  console.log('  -a, --agents <n>      Number of agents (default: 10)');
  console.log('  -s, --stress <level>  Stress level: low, medium, high (default: medium)');
  console.log('  --chaos               Enable chaos behaviors from start');
  console.log('  --dry-run             Simulate issue creation without GitHub');
  console.log('  -r, --room <id>       Room ID (default: default)');
  console.log('  -u, --url <url>       Server URL (default: http://localhost:2567)');
  console.log('  --delay <ms>          Cycle delay in ms (default: 2000)');
  console.log('  -h, --help            Show this help message');
  console.log();
  console.log('Environment Variables:');
  console.log('  SERVER_URL            Server base URL');
  console.log('  GITHUB_TOKEN          GitHub token for issue creation');
  console.log();
  console.log('Examples:');
  console.log('  pnpm resident-agent-loop');
  console.log('  pnpm resident-agent-loop --agents 20 --stress high');
  console.log('  pnpm resident-agent-loop --chaos --dry-run');
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const config = parseArgs();
  const loop = new ResidentAgentLoop(config);

  process.on('SIGINT', async () => {
    console.log('\n\nReceived SIGINT, shutting down...');
    await loop.stopGracefully();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n\nReceived SIGTERM, shutting down...');
    await loop.stopGracefully();
    process.exit(0);
  });

  try {
    await loop.run();
  } catch (error) {
    console.error('Fatal error:', error);
    loop.stop();
    process.exit(1);
  }
}

main();
