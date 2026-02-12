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
import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
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
] as const;

const STATE_DIR = join(process.env.HOME || '~', '.openclaw-resident-agent');
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

  async checkDuplicate(title: string): Promise<boolean> {
    try {
      const searchTitle = title
        .replace(/\[.*?\]/g, '')
        .trim()
        .substring(0, 50);
      const result = execSync(
        `gh issue list --state open --search "${searchTitle}" --json number,title --limit 10`,
        { encoding: 'utf-8' }
      );
      const issues = JSON.parse(result);
      return issues.length > 0;
    } catch {
      return false;
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

    if (await this.checkDuplicate(title)) {
      console.log('[Issue] Duplicate found, skipping');
      return null;
    }

    try {
      const labels = ['resident-agent', issue.area.toLowerCase(), issue.severity.toLowerCase()];
      const result = execSync(
        `gh issue create --title "${title.replace(/"/g, '\\"')}" --body "${body.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" --label "${labels.join(',')}"`,
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
      execSync(`gh issue comment ${issueNumber} --body "${comment.replace(/"/g, '\\"')}"`, {
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
    const messageSets: Map<string, Set<string>> = new Map();

    for (const agent of agents) {
      const state = agent.getState();
      const messages = state.chatHistory.map(m => `${m.from}:${m.message}`);
      messageSets.set(state.agentId, new Set(messages));
    }

    const agentIds = Array.from(messageSets.keys());
    for (let i = 0; i < agentIds.length; i++) {
      for (let j = i + 1; j < agentIds.length; j++) {
        const set1 = messageSets.get(agentIds[i])!;
        const set2 = messageSets.get(agentIds[j])!;

        const diff1 = Array.from(set1).filter(m => !set2.has(m));
        const diff2 = Array.from(set2).filter(m => !set1.has(m));

        if (diff1.length > 0 || diff2.length > 0) {
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
              timestamps: [Date.now()],
              logs: [
                `Agent ${agentIds[i]} unique: ${diff1.join(', ')}`,
                `Agent ${agentIds[j]} unique: ${diff2.join(', ')}`,
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

  runAllDetections(agents: ResidentAgent[]): Issue | null {
    const detectors = [
      () => this.detectPositionDesync(agents),
      () => this.detectChatMismatch(agents),
      () => this.detectStuckAgent(agents),
      () => this.detectHighErrorRate(agents),
    ];

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
  }

  setCycleDelay(ms: number): void {
    this.cycleDelayMs = ms;
  }

  setChaosBehavior(): void {
    this.state.role = 'chaos';
  }

  private async performRoleBehavior(): Promise<void> {
    switch (this.state.role) {
      case 'explorer':
        await this.exploreWorld();
        break;
      case 'worker':
        await this.workCycle();
        break;
      case 'socializer':
        await this.socialize();
        break;
      case 'coordinator':
        await this.coordinate();
        break;
      case 'helper':
        await this.help();
        break;
      case 'merchant':
        await this.trade();
        break;
      case 'observer':
        await this.observe();
        break;
      case 'afk':
        await this.idleBehavior();
        break;
      case 'chaos':
        await this.chaosBehavior();
        break;
      case 'spammer':
        await this.spamBehavior();
        break;
    }
  }

  private async observe(): Promise<void> {
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
        }),
      });

      if (!response.ok) throw new Error(`Observe failed: ${response.status}`);

      const result = await response.json();
      if (result.status === 'ok' && result.data.entities) {
        for (const entity of result.data.entities) {
          this.state.observedEntities.set(entity.entityId, {
            entityId: entity.entityId,
            position: { x: entity.x, y: entity.y },
            timestamp: Date.now(),
          });
        }
        this.state.position = {
          x: result.data.self?.x || this.state.position.x,
          y: result.data.self?.y || this.state.position.y,
        };
      }
      this.state.lastAction = 'observe';
    } catch (error) {
      this.state.errorCount++;
      throw error;
    }
  }

  private async moveTo(tx: number, ty: number): Promise<void> {
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
      this.state.lastAction = `moveTo(${tx}, ${ty})`;
    } catch (error) {
      this.state.errorCount++;
      throw error;
    }
  }

  private async chat(message: string, channel = 'global'): Promise<void> {
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
      this.state.lastAction = `chat("${message.substring(0, 20)}...")`;
    } catch (error) {
      this.state.errorCount++;
      throw error;
    }
  }

  private async chatObserve(): Promise<void> {
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
          limit: 20,
        }),
      });

      if (!response.ok) throw new Error(`ChatObserve failed: ${response.status}`);

      const result = await response.json();
      if (result.status === 'ok' && result.data.messages) {
        this.state.chatHistory = result.data.messages.map(
          (m: { from: string; text: string; channel: string; serverTsMs: number }) => ({
            from: m.from,
            message: m.text,
            timestamp: m.serverTsMs,
            channel: m.channel,
          })
        );
      }
    } catch (error) {
      this.state.errorCount++;
      throw error;
    }
  }

  private async exploreWorld(): Promise<void> {
    await this.observe();
    const tx = Math.floor(Math.random() * 64);
    const ty = Math.floor(Math.random() * 64);
    await this.moveTo(tx, ty);
  }

  private async workCycle(): Promise<void> {
    await this.observe();
    const tx = (Math.floor(this.state.position.x / 32) + 1) % 64;
    const ty = Math.floor(this.state.position.y / 32);
    await this.moveTo(tx, ty);
  }

  private async socialize(): Promise<void> {
    await this.observe();
    await this.chatObserve();
    const greetings = ['Hello!', 'Hi there!', 'Hey!', 'Good day!', 'Greetings!'];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    await this.chat(greeting);
  }

  private async coordinate(): Promise<void> {
    await this.observe();
    await this.chat("Team, let's meet at the plaza!");
    await this.moveTo(32, 32); // Move to center
  }

  private async help(): Promise<void> {
    await this.observe();
    await this.chatObserve();
    await this.chat('Anyone need help?');
  }

  private async trade(): Promise<void> {
    await this.observe();
    await this.chat('Trading services available!');
  }

  private async idleBehavior(): Promise<void> {
    await this.observe();
  }

  private async chaosBehavior(): Promise<void> {
    await this.observe();
    for (let i = 0; i < 5; i++) {
      const tx = Math.floor(Math.random() * 64);
      const ty = Math.floor(Math.random() * 64);
      await this.moveTo(tx, ty);
      await this.chat(`Chaos ${i}!`);
    }
  }

  private async spamBehavior(): Promise<void> {
    for (let i = 0; i < 10; i++) {
      await this.chat(`Spam message ${i} from ${this.state.agentId}`);
      await sleep(100);
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
      await agent.register(this.config.roomId);
      this.agents.push(agent);
      this.state.agents.push(agent.getState().agentId);
    }

    console.log(`✅ ${this.agents.length} agents initialized`);
    saveState(this.state);
  }

  private async runCycle(): Promise<void> {
    this.state.cycleCount++;
    console.log(`\n--- Cycle ${this.state.cycleCount} ---`);

    const issue = this.issueDetector.runAllDetections(this.agents);

    if (issue) {
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

    console.log(`  Agents: ${this.agents.length}`);
    console.log(`  Total Issues: ${this.state.totalIssuesCreated}`);
    console.log(`  Escalations: ${this.state.escalationCount}`);

    saveState(this.state);
  }

  addAgents(count: number, role?: AgentRole): void {
    console.log(`  Adding ${count} agents...`);
    for (let i = 0; i < count; i++) {
      const agentRole = role || ROLES[Math.floor(Math.random() * ROLES.length)];
      const agent = new ResidentAgent(this.config.serverUrl, agentRole, this.config.cycleDelayMs);
      agent.register(this.config.roomId).then(() => {
        agent.start();
      });
      this.agents.push(agent);
    }
    this.state.agentCount = this.agents.length;
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
          config.agentCount = parseInt(nextArg, 10);
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
          config.cycleDelayMs = parseInt(nextArg, 10);
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

  process.on('SIGINT', () => {
    console.log('\n\nReceived SIGINT, shutting down...');
    loop.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\nReceived SIGTERM, shutting down...');
    loop.stop();
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
