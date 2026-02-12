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

const MAX_CYCLES_WITHOUT_OBSERVE = 2;
const NAVIGATE_WEIGHT_DAMPENING = 0.5;
const ENTITY_APPROACH_WEIGHT_DAMPENING = 0.3;
const INTERACTION_HISTORY_WINDOW = 10;
const MIN_INTERACTIONS_FOR_FAILURE_DETECTION = 5;
const INTERACTION_FAILURE_THRESHOLD = 4;
const API_HISTORY_MAX_LENGTH = 100;
const INTERACTION_HISTORY_MAX_LENGTH = 50;
const ACTION_LOG_MAX_LENGTH = 20;

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
  explorer: ['Found a new area!', "What's over there?", 'Exploring...', 'Interesting path here.'],
  worker: ['Back to work.', 'Task updated.', 'Checking the board.', 'Deadline approaching.'],
  socializer: [
    'Hello everyone!',
    'Nice day!',
    "How's it going?",
    'Great to see you!',
    'Hey there!',
  ],
  coordinator: ['Team sync in 5!', "Let's meet at the plaza.", 'Agenda updated.', 'Room booked.'],
  helper: [
    'Anyone need help?',
    'I can assist!',
    'Let me know if you need anything.',
    'Happy to help!',
  ],
  merchant: [
    'Items for sale!',
    'Check out the vending machine.',
    'Trading services available.',
    'Good deals today!',
  ],
  observer: ['Monitoring...', 'All clear.', 'Noted.', 'Interesting activity detected.'],
  afk: ['...', 'brb', 'afk'],
  chaos: ['CHAOS!', 'Random action!', 'Testing boundaries!', 'Expect the unexpected!', '🔥'],
  spammer: ['Spam 1', 'Spam 2', 'Spam 3', 'Testing', 'Hello', 'Ping', 'Message', 'Test'],
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

  async checkDuplicate(title: string): Promise<{ isDuplicate: boolean; existingNumber?: string }> {
    try {
      const searchTitle = title
        .replace(/\[.*?\]/g, '')
        .trim()
        .substring(0, 50);
      const result = execFileSync(
        'gh',
        [
          'issue',
          'list',
          '--state',
          'open',
          '--search',
          searchTitle,
          '--json',
          'number,title',
          '--limit',
          '10',
        ],
        { encoding: 'utf-8' }
      );
      const issues = JSON.parse(result);
      if (issues.length > 0) {
        return { isDuplicate: true, existingNumber: String(issues[0].number) };
      }
      return { isDuplicate: false };
    } catch (error) {
      console.error('[checkDuplicate] gh issue list failed:', error);
      return { isDuplicate: true };
    }
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

    const dupCheck = await this.checkDuplicate(title);
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
      const result = execFileSync(
        'gh',
        ['issue', 'create', '--title', title, '--body', body, '--label', labels.join(',')],
        { encoding: 'utf-8' }
      );
      const issueUrl = result.trim();
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
    const timestamp = formatTimestamp();

    return `## Build Info
- Commit SHA: ${commitSha}
- Timestamp: ${timestamp}

## Environment
- Agents involved: ${issue.evidence.agentIds.join(', ')}

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

## Evidence
\`\`\`
${issue.evidence.logs.slice(0, 20).join('\n')}
\`\`\`

---
*Automatically generated by Resident Agent Loop*`;
  }
}

// ============================================================================
// Issue Detector
// ============================================================================

class IssueDetector {
  private knownPositions: Map<string, { x: number; y: number; timestamp: number }> = new Map();
  private chatMessages: Map<string, ChatMessage[]> = new Map();
  private detectedIssues: Issue[] = [];
  private recentlyReportedAreas: Map<string, number> = new Map();
  private currentCycle = 0;

  private isOnCooldown(area: string): boolean {
    const lastReported = this.recentlyReportedAreas.get(area);
    if (lastReported === undefined) return false;
    return this.currentCycle - lastReported < 3;
  }

  markReported(area: string): void {
    this.recentlyReportedAreas.set(area, this.currentCycle);
  }

  incrementCycle(): void {
    this.currentCycle++;
  }

  detectPositionDesync(agents: ResidentAgent[]): Issue | null {
    for (const agent of agents) {
      const state = agent.getState();
      for (const [entityId, snapshot] of Array.from(state.observedEntities.entries())) {
        const known = this.knownPositions.get(entityId);
        if (known) {
          const timeDiff = snapshot.timestamp - known.timestamp;
          const posDiff =
            Math.abs(snapshot.position.x - known.x) + Math.abs(snapshot.position.y - known.y);

          if (posDiff > 100 && timeDiff < 100) {
            return {
              area: 'Sync',
              title: `Position desync detected for entity ${entityId}`,
              description:
                'Entity position jumped unexpectedly, indicating a synchronization issue',
              expectedBehavior: 'Entity positions should update smoothly without sudden jumps',
              observedBehavior: `Entity ${entityId} jumped ${posDiff} pixels in ${timeDiff}ms`,
              reproductionSteps: [
                'Run multiple agents in the world',
                'Monitor entity positions',
                'Wait for desync event',
              ],
              severity: 'Major',
              frequency: 'sometimes',
              evidence: {
                agentIds: [state.agentId],
                timestamps: [snapshot.timestamp, known.timestamp],
                logs: [
                  `Previous: (${known.x}, ${known.y}) at ${known.timestamp}`,
                  `Current: (${snapshot.position.x}, ${snapshot.position.y}) at ${snapshot.timestamp}`,
                ],
                positions: [known, snapshot.position],
              },
            };
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
    const agentChatData: Map<string, { messages: ChatMessage[]; latestTs: number }> = new Map();

    for (const agent of agents) {
      const state = agent.getState();
      const latestTs =
        state.chatHistory.length > 0 ? Math.max(...state.chatHistory.map(m => m.timestamp)) : 0;
      agentChatData.set(state.agentId, { messages: state.chatHistory, latestTs });
    }

    // Filter out agents that haven't observed chat yet (latestTs === 0)
    // These agents haven't called chatObserve() yet, so comparing them would
    // produce false positives (empty set vs populated set = "mismatch")
    const agentsWithHistory = Array.from(agentChatData.entries()).filter(
      ([, data]) => data.latestTs > 0
    );

    // Need at least 2 agents with chat history to compare
    if (agentsWithHistory.length < 2) return null;

    const agentIds = agentsWithHistory.map(([id]) => id);
    const latestTimestamps = agentsWithHistory.map(([, data]) => data.latestTs);
    const commonCutoff = Math.min(...latestTimestamps);
    if (commonCutoff === 0 || commonCutoff === Infinity) return null;

    const filteredSets: Map<string, Set<string>> = new Map();
    for (const [agentId] of agentsWithHistory) {
      const data = agentChatData.get(agentId)!;
      const filtered = data.messages
        .filter(m => m.timestamp <= commonCutoff)
        .map(m => `${m.from}:${m.message}`);
      filteredSets.set(agentId, new Set(filtered));
    }

    for (let i = 0; i < agentIds.length; i++) {
      for (let j = i + 1; j < agentIds.length; j++) {
        const set1 = filteredSets.get(agentIds[i])!;
        const set2 = filteredSets.get(agentIds[j])!;

        const diff1 = Array.from(set1).filter(m => !set2.has(m));
        const diff2 = Array.from(set2).filter(m => !set1.has(m));

        if (diff1.length > 0 || diff2.length > 0) {
          const data1 = agentChatData.get(agentIds[i])!;
          const data2 = agentChatData.get(agentIds[j])!;
          return {
            area: 'Chat',
            title: 'Chat message mismatch between agents',
            description: 'Different agents see different chat messages',
            expectedBehavior: 'All agents should see the same chat messages',
            observedBehavior: `Agent ${agentIds[i]} and ${agentIds[j]} have different message histories`,
            reproductionSteps: [
              'Spawn multiple agents',
              'Have agents send chat messages',
              'Compare chat histories between agents',
            ],
            severity: 'Major',
            frequency: 'sometimes',
            evidence: {
              agentIds: [agentIds[i], agentIds[j]],
              timestamps: [commonCutoff, data1.latestTs, data2.latestTs],
              logs: [
                `Common cutoff: ${commonCutoff}`,
                `Agent ${agentIds[i]} latest: ${data1.latestTs}, unique: ${diff1.join(', ')}`,
                `Agent ${agentIds[j]} latest: ${data2.latestTs}, unique: ${diff2.join(', ')}`,
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
      const timeSinceLastAction = Date.now() - state.lastActionTime;

      if (timeSinceLastAction > 30000 && state.errorCount > 3) {
        return {
          area: 'Performance',
          title: `Agent ${state.agentId} appears stuck`,
          description: 'Agent has not performed any successful action for an extended period',
          expectedBehavior: 'Agents should be able to perform actions continuously',
          observedBehavior: `Agent stuck for ${Math.floor(timeSinceLastAction / 1000)} seconds with ${state.errorCount} errors`,
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
            logs: [`Last action: ${state.lastAction}`, `Error count: ${state.errorCount}`],
          },
        };
      }
    }
    return null;
  }

  detectHighErrorRate(agents: ResidentAgent[]): Issue | null {
    const totalErrors = agents.reduce((sum, a) => sum + a.getState().errorCount, 0);
    const totalActions = agents.length * 10;

    const errorRate = totalErrors / totalActions;

    if (errorRate > 0.5) {
      return {
        area: 'Performance',
        title: 'High error rate detected across agents',
        description: 'More than 50% of actions are failing',
        expectedBehavior: 'Actions should succeed most of the time',
        observedBehavior: `${Math.round(errorRate * 100)}% error rate across ${agents.length} agents`,
        reproductionSteps: ['Run load test with multiple agents', 'Monitor error rates'],
        severity: 'Critical',
        frequency: 'always',
        evidence: {
          agentIds: agents.map(a => a.getState().agentId),
          timestamps: [Date.now()],
          logs: agents.map(a => `${a.getState().agentId}: ${a.getState().errorCount} errors`),
        },
      };
    }
    return null;
  }

  detectEntityCountDivergence(agents: ResidentAgent[]): Issue | null {
    const zoneAgents: Map<string, { agentId: string; entityCount: number }[]> = new Map();
    for (const agent of agents) {
      const state = agent.getState();
      const zone = `${Math.floor(state.position.x / 512)}_${Math.floor(state.position.y / 512)}`;
      if (!zoneAgents.has(zone)) zoneAgents.set(zone, []);
      zoneAgents.get(zone)!.push({
        agentId: state.agentId,
        entityCount: state.observedEntities.size,
      });
    }

    for (const [zone, entries] of Array.from(zoneAgents.entries())) {
      if (entries.length < 2) continue;
      const counts = entries.map(e => e.entityCount);
      const max = Math.max(...counts);
      const min = Math.min(...counts);
      if (max > 0 && min >= 0 && (max - min) / Math.max(max, 1) > 0.5) {
        return {
          area: 'Sync',
          title: `Entity count divergence in zone ${zone}`,
          description: 'Agents in the same zone see significantly different entity counts',
          expectedBehavior: 'Agents in the same zone should see similar entity counts',
          observedBehavior: `Entity counts range from ${min} to ${max} in zone ${zone}`,
          reproductionSteps: [
            'Spawn multiple agents in same zone',
            'Compare observed entity counts',
          ],
          severity: 'Major',
          frequency: 'sometimes',
          evidence: {
            agentIds: entries.map(e => e.agentId),
            timestamps: [Date.now()],
            logs: entries.map(e => `${e.agentId}: ${e.entityCount} entities`),
          },
        };
      }
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
    for (const agent of agents) {
      const state = agent.getState();
      if (state.actionLog.length < 10) continue;

      const baseCategoryCount: Record<string, number> = {};
      for (const label of state.actionLog) {
        const base = label.split(':')[0];
        baseCategoryCount[base] = (baseCategoryCount[base] ?? 0) + 1;
      }

      const prefs = ROLE_PREFERENCES[state.role];
      const topPrefKeys = Object.entries(prefs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k]) => k);

      const topActionCats = Object.entries(baseCategoryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k]) => k);

      const topPrefBases = topPrefKeys.map(k => k.split(':')[0]);
      const overlap = topPrefKeys.filter((k, i) =>
        topActionCats.some(
          ac => ac === k || ac === topPrefBases[i] || k.includes(ac) || ac.includes(k)
        )
      );

      if (overlap.length === 0) {
        return {
          area: 'Behavior',
          title: `Role compliance anomaly for ${state.role} agent ${state.agentId}`,
          description: 'Agent actions do not match expected role preferences',
          expectedBehavior: `${state.role} should prefer: ${topPrefKeys.join(', ')}`,
          observedBehavior: `Actual top actions: ${topActionCats.join(', ')}`,
          reproductionSteps: [
            'Run agent for 10+ cycles',
            'Compare action distribution to role preferences',
          ],
          severity: 'Minor',
          frequency: 'sometimes',
          evidence: {
            agentIds: [state.agentId],
            timestamps: [Date.now()],
            logs: Object.entries(baseCategoryCount).map(([k, v]) => `${k}: ${v}`),
          },
        };
      }
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
      if (issue && !this.isOnCooldown(issue.area)) {
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
    };
  }

  getState(): AgentState {
    return this.state;
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
      } catch (error) {
        this.state.errorCount++;
        console.error(`[${this.state.agentId}] Error:`, error);
      }

      await sleep(this.cycleDelayMs);
    }
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

  private generateRoleChat(): string {
    const messages = ROLE_CHAT_MESSAGES[this.state.role];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private pickRoleStatus(): string {
    const statuses = ROLE_STATUSES[this.state.role];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  private buildCandidates(): ActionCandidate[] {
    const candidates: ActionCandidate[] = [];
    const { observedFacilities, observedEntities, position, role } = this.state;

    candidates.push({
      action: () => this.observe(),
      weight: 0.15 * this.computeNoveltyMultiplier('observe'),
      label: 'observe',
      category: 'observe',
    });

    candidates.push({
      action: () => this.pollEvents(),
      weight: this.getRolePreference('pollEvents') * this.computeNoveltyMultiplier('pollEvents'),
      label: 'pollEvents',
      category: 'observe',
    });

    candidates.push({
      action: () => this.chatObserve(),
      weight: this.getRolePreference('chatObserve') * this.computeNoveltyMultiplier('chatObserve'),
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
              this.computeNoveltyMultiplier(label),
            label,
            category: 'interact',
          });
        }
      } else {
        const label = `navigate:${facility.type}`;
        candidates.push({
          action: () =>
            this.moveTo(Math.floor(facility.position.x / 32), Math.floor(facility.position.y / 32)),
          weight:
            this.getRolePreference(facility.type, 'navigate') *
            this.computeNoveltyMultiplier(label) *
            NAVIGATE_WEIGHT_DAMPENING,
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
          this.moveTo(Math.floor(entity.position.x / 32), Math.floor(entity.position.y / 32)),
        weight:
          this.getRolePreference('entity', 'approach') *
          this.computeNoveltyMultiplier(label) *
          ENTITY_APPROACH_WEIGHT_DAMPENING,
        label,
        category: 'navigate',
      });
    }

    const chatLabel = `chat:${role}`;
    candidates.push({
      action: () => this.chat(this.generateRoleChat()),
      weight: this.getRolePreference('chat') * this.computeNoveltyMultiplier(chatLabel),
      label: chatLabel,
      category: 'social',
    });

    const profileLabel = `profileUpdate:${role}`;
    candidates.push({
      action: () => this.profileUpdate({ status: this.pickRoleStatus() }),
      weight: this.getRolePreference('profileUpdate') * this.computeNoveltyMultiplier(profileLabel),
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

    const tx = Math.floor(Math.random() * 64);
    const ty = Math.floor(Math.random() * 64);
    candidates.push({
      action: () => this.moveTo(tx, ty),
      weight: this.getRolePreference('wander') * this.computeNoveltyMultiplier('navigate:wander'),
      label: 'navigate:wander',
      category: 'navigate',
    });

    if (role === 'chaos') {
      candidates.push({
        action: async () => {
          await this.unregister();
          await sleep(500);
          await this.register('default');
          this.state.observedEntities.clear();
          this.state.observedFacilities.clear();
          this.state.interactionHistory = [];
          this.state.actionLog = [];
          this.state.eventCursor = null;
          this.state.errorCount = 0;
          await this.observe();
        },
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

  private recordApiCall(endpoint: string, startMs: number, success: boolean): void {
    this.state.apiCallHistory.push({
      endpoint,
      timestamp: Date.now(),
      success,
      responseTime: Date.now() - startMs,
    });
    if (this.state.apiCallHistory.length > API_HISTORY_MAX_LENGTH) {
      this.state.apiCallHistory.shift();
    }
  }

  private async observe(): Promise<void> {
    const startMs = Date.now();
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
      this.recordApiCall('observe', startMs, false);
      throw error;
    }
  }

  private async moveTo(tx: number, ty: number): Promise<void> {
    const startMs = Date.now();
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

      if (!response.ok) throw new Error(`Move failed: ${response.status}`);
      this.recordApiCall('moveTo', startMs, true);
      this.state.lastAction = `moveTo(${tx}, ${ty})`;
    } catch (error) {
      this.recordApiCall('moveTo', startMs, false);
      throw error;
    }
  }

  private async chat(message: string, channel = 'global'): Promise<void> {
    const startMs = Date.now();
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

      if (!response.ok) throw new Error(`Chat failed: ${response.status}`);
      this.recordApiCall('chatSend', startMs, true);
      this.state.lastAction = `chat("${message.substring(0, 20)}...")`;
    } catch (error) {
      this.recordApiCall('chatSend', startMs, false);
      throw error;
    }
  }

  private async chatObserve(): Promise<void> {
    const startMs = Date.now();
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
      this.recordApiCall('chatObserve', startMs, false);
      throw error;
    }
  }

  private async interact(
    targetId: string,
    action: string,
    params?: Record<string, unknown>
  ): Promise<string> {
    const startMs = Date.now();
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
      this.recordApiCall('interact', startMs, false);
      throw error;
    }
  }

  private async pollEvents(waitMs = 0): Promise<void> {
    const startMs = Date.now();
    try {
      const response = await fetch(`${this.serverUrl}/aic/v0.1/pollEvents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.sessionToken}`,
        },
        body: JSON.stringify({
          agentId: this.state.agentId,
          roomId: 'default',
          ...(this.state.eventCursor && { sinceCursor: this.state.eventCursor }),
          limit: 50,
          ...(waitMs > 0 && { waitMs: Math.min(waitMs, 1000) }),
        }),
      });

      if (!response.ok) throw new Error(`PollEvents failed: ${response.status}`);

      const result = await response.json();
      if (result.status === 'ok') {
        if (result.data.nextCursor) {
          this.state.eventCursor = result.data.nextCursor;
        }
      }
      this.recordApiCall('pollEvents', startMs, true);
      this.state.lastAction = 'pollEvents';
    } catch (error) {
      this.recordApiCall('pollEvents', startMs, false);
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

      if (!response.ok) throw new Error(`ProfileUpdate failed: ${response.status}`);
      if (fields.status) this.state.profileStatus = fields.status;
      this.recordApiCall('profileUpdate', startMs, true);
      this.state.lastAction = `profileUpdate(${fields.status ?? 'fields'})`;
    } catch (error) {
      this.recordApiCall('profileUpdate', startMs, false);
      throw error;
    }
  }

  private async skillList(category?: string): Promise<void> {
    const startMs = Date.now();
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
      this.recordApiCall('skillList', startMs, false);
      throw error;
    }
  }

  private async skillInstall(skillId: string): Promise<void> {
    const startMs = Date.now();
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

      if (!response.ok) throw new Error(`SkillInstall failed: ${response.status}`);
      if (!this.state.installedSkills.includes(skillId)) {
        this.state.installedSkills.push(skillId);
      }
      this.recordApiCall('skillInstall', startMs, true);
      this.state.lastAction = `skillInstall(${skillId})`;
    } catch (error) {
      this.recordApiCall('skillInstall', startMs, false);
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

      if (!response.ok) throw new Error(`SkillInvoke failed: ${response.status}`);
      this.recordApiCall('skillInvoke', startMs, true);
      this.state.lastAction = `skillInvoke(${skillId}:${actionId})`;
    } catch (error) {
      this.recordApiCall('skillInvoke', startMs, false);
      throw error;
    }
  }

  private async unregister(): Promise<void> {
    const startMs = Date.now();
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

      if (!response.ok) throw new Error(`Unregister failed: ${response.status}`);
      this.recordApiCall('unregister', startMs, true);
      this.state.lastAction = 'unregister';
    } catch (error) {
      this.recordApiCall('unregister', startMs, false);
      throw error;
    }
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

    const issue = this.issueDetector.runAllDetections(this.agents);

    if (issue) {
      this.issueDetector.markReported(issue.area);
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
