/**
 * AgentRuntime - Core Perceive-Decide-Act loop
 *
 * Orchestrates all agent subsystems into a coherent autonomous agent.
 * Each tick: PERCEIVE → DECIDE → ACT → REMEMBER
 */

import { OpenClawWorldClient } from '@openclawworld/plugin';
import { join } from 'path';
import type { EcosystemConfig } from '../config/ecosystem.config.js';
import type {
  AgentConfig,
  TickContext,
  AgentStatus,
  HeartbeatMessage,
} from '../types/agent.types.js';
import { WorldPerception } from '../perception/WorldPerception.js';
import { EventProcessor } from '../perception/EventProcessor.js';
import { ActionExecutor } from '../action/ActionExecutor.js';
import { MovementPlanner } from '../action/MovementPlanner.js';
import { ChatComposer } from '../action/ChatComposer.js';
import { IssueReporter } from './IssueReporter.js';
import { MemoryManager } from '../memory/MemoryManager.js';
import { ReflectionEngine } from '../memory/ReflectionEngine.js';
import { PersonalitySystem } from '../personality/PersonalitySystem.js';
import { RelationshipManager } from '../social/RelationshipManager.js';
import { ConversationTracker } from '../social/ConversationTracker.js';
import { SocialPerception } from '../social/SocialPerception.js';
import { CognitiveCore } from '../cognitive/CognitiveCore.js';

export class AgentRuntime {
  readonly agentConfig: AgentConfig;
  private agentId: string | null = null;
  private roomId: string;
  private status: AgentStatus = 'initializing';
  private tickNumber = 0;

  // Subsystems
  private readonly client: OpenClawWorldClient;
  private perception!: WorldPerception;
  private eventProcessor!: EventProcessor;
  private actionExecutor!: ActionExecutor;
  private readonly movementPlanner: MovementPlanner;
  private readonly chatComposer: ChatComposer;
  private readonly memory: MemoryManager;
  private readonly reflection: ReflectionEngine;
  private readonly personality: PersonalitySystem;
  private readonly relationships: RelationshipManager;
  private readonly conversations: ConversationTracker;
  private readonly socialPerception: SocialPerception;
  private readonly cognitive: CognitiveCore;
  private readonly issueReporter: IssueReporter;
  private readonly config: EcosystemConfig;

  // State
  private consecutiveErrors = 0;
  private abortController: AbortController | null = null;

  constructor(agentConfig: AgentConfig, ecosystemConfig: EcosystemConfig) {
    this.agentConfig = agentConfig;
    this.config = ecosystemConfig;
    this.roomId = ecosystemConfig.defaultRoomId;

    // Sanitize agentConfig.id to prevent path traversal (allow only alphanumeric, dash, underscore)
    const safeId = agentConfig.id.replace(/[^a-zA-Z0-9_-]/g, '_') || 'agent_unknown';
    const dataDir = join(ecosystemConfig.dataDir, safeId);

    this.client = new OpenClawWorldClient({
      baseUrl: ecosystemConfig.serverBaseUrl,
    });

    this.movementPlanner = new MovementPlanner();
    this.chatComposer = new ChatComposer();
    this.memory = new MemoryManager(dataDir);
    this.personality = new PersonalitySystem(agentConfig, dataDir);
    this.relationships = new RelationshipManager(`${dataDir}/relationships.json`);
    this.conversations = new ConversationTracker('', agentConfig.name);
    this.socialPerception = new SocialPerception();
    this.cognitive = new CognitiveCore(ecosystemConfig, agentConfig);
    this.issueReporter = new IssueReporter(ecosystemConfig.enableIssueCreation);
    this.reflection = new ReflectionEngine(
      this.memory.episodic,
      this.memory.semantic,
      ecosystemConfig.reflectionInterval
    );
  }

  async start(): Promise<void> {
    this.status = 'initializing';
    this.abortController = new AbortController();

    try {
      // Register with the server
      const regResult = await this.client.register({
        name: this.agentConfig.name,
        roomId: this.roomId,
      });

      if (regResult.status === 'error') {
        throw new Error(`Registration failed: ${regResult.error.message}`);
      }

      this.agentId = regResult.data.agentId;
      this.roomId = regResult.data.roomId;

      // Initialize subsystems that need agentId
      this.perception = new WorldPerception(this.client, this.agentId, this.roomId);
      this.eventProcessor = new EventProcessor(this.agentId, this.agentConfig.name);
      this.actionExecutor = new ActionExecutor(this.client, this.agentId, this.roomId);
      this.conversations.agentId = this.agentId;

      this.status = 'running';
      this.consecutiveErrors = 0;

      console.log(`[${this.agentConfig.name}] Registered as ${this.agentId} in ${this.roomId}`);

      // Start the main loop
      await this.runLoop();
    } catch (error) {
      this.status = 'dead';
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[${this.agentConfig.name}] Start failed: ${message}`);
      throw error;
    }
  }

  stop(): void {
    this.status = 'dead';
    this.abortController?.abort();
    this.personality.save();
    this.relationships.save();
    console.log(`[${this.agentConfig.name}] Stopped`);
  }

  getHeartbeat(): HeartbeatMessage {
    return {
      agentId: this.agentId ?? '',
      status: this.status,
      tickNumber: this.tickNumber,
      timestamp: Date.now(),
    };
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  private async runLoop(): Promise<void> {
    while (this.status === 'running' && !this.abortController?.signal.aborted) {
      const tickStart = Date.now();

      try {
        await this.tick();
        this.consecutiveErrors = 0;
      } catch (error) {
        this.consecutiveErrors++;
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[${this.agentConfig.name}] Tick ${this.tickNumber} error: ${message}`);

        if (this.consecutiveErrors >= 5) {
          console.error(`[${this.agentConfig.name}] Too many consecutive errors, stopping`);
          this.status = 'dead';
          break;
        }
      }

      // Sleep until next tick
      const elapsed = Date.now() - tickStart;
      const sleepMs = Math.max(1000, this.config.tickIntervalMs - elapsed);
      await this.sleep(sleepMs);
    }
  }

  private async tick(): Promise<void> {
    this.tickNumber++;
    this.personality.tick();
    this.reflection.tick();
    this.conversations.cleanup();

    // PERCEIVE
    const perception = await this.perception.observe();
    const events = await this.perception.pollEvents();
    const recentChat = await this.perception.getRecentChat(15);

    // Update working memory
    this.memory.working.updatePosition(
      perception.self.position.x,
      perception.self.position.y,
      perception.self.zone
    );
    this.memory.working.updateNearby(
      perception.nearby.map(e => ({ id: e.id, name: e.name, kind: e.kind, distance: e.distance })),
      perception.facilities.map(f => ({
        id: f.id,
        type: f.type,
        name: f.name,
        distance: f.distance,
      }))
    );

    // Process events into memories
    for (const event of events) {
      const record = this.eventProcessor.processEvent(
        event,
        perception.self.position,
        perception.self.zone,
        this.personality.getEmotionState()
      );
      if (record) {
        this.memory.addEpisode(record);
        this.memory.working.addEvent(event.type, record.content);
      }
    }

    // Process chat messages
    for (const msg of recentChat) {
      this.conversations.receiveMessage(msg.from, msg.fromName, msg.message, msg.channel);
      this.memory.working.addPendingMessage(msg.fromName, msg.message, msg.channel);
    }

    // Satisfy needs from current zone
    if (perception.self.zone) {
      this.personality.needs.satisfyFromZone(perception.self.zone);
    }

    // Check if we should skip LLM (idle tick optimization)
    const shouldSkip =
      this.config.skipIdleTicks &&
      this.memory.working.isIdle() &&
      !this.conversations.getActiveConversation() &&
      !this.reflection.shouldReflect();

    if (shouldSkip) {
      this.cognitive.incrementSkipped();
      // Rule-based: wander a bit
      if (Math.random() < 0.2) {
        const dest = this.movementPlanner.getRandomNearbyTile(perception.self.tile, 3);
        await this.actionExecutor.execute({ type: 'moveTo', dest, reason: 'wandering' });
      }
      return;
    }

    // Check if reflection is needed
    if (this.reflection.shouldReflect()) {
      await this.doReflection();
    }

    // Build context for LLM
    const nearbyIds = perception.nearby.map(e => e.id);
    const contextSummary = this.buildContextSummary(perception);
    const relevantMemories = this.memory.retrieveRelevant(contextSummary, nearbyIds, 5);

    const tickContext: TickContext = {
      tickNumber: this.tickNumber,
      timestamp: Date.now(),
      self: perception.self,
      nearby: perception.nearby,
      facilities: perception.facilities,
      recentEvents: events.slice(-10),
      recentMessages: recentChat.slice(-5),
      relevantMemories,
      currentEmotion: this.personality.getEmotionState(),
      currentNeeds: this.personality.getNeedsState(),
      relationships: this.relationships.getRelationshipsForPrompt(nearbyIds),
      activeConversation: this.conversations.getActiveConversation(),
    };

    // DECIDE
    const decision = await this.cognitive.decide(tickContext);

    // Apply emotion changes
    this.personality.emotion.applyDelta(decision.emotionDelta);

    // ACT - compose chat messages through ChatComposer
    if (decision.action.type === 'chat') {
      decision.action.message = this.chatComposer.compose(decision.action.message);
    }
    const result = await this.actionExecutor.execute(decision.action);
    this.memory.working.setLastAction(decision.action.type, result.message);

    // Report action failures as potential world issues
    if (!result.success && result.details) {
      this.issueReporter.reportApiError(
        this.agentConfig.name,
        decision.action.type,
        (result.details['code'] as string) ?? 'unknown',
        result.message,
        perception.self.position,
        perception.self.zone
      );
    }

    // Track conversation if chatting
    if (decision.action.type === 'chat' && decision.action.targetName) {
      const targetName = decision.action.targetName.toLowerCase();
      const nearbyTarget = perception.nearby.find(e => e.name.toLowerCase() === targetName);
      if (nearbyTarget) {
        this.conversations.sendMessage(nearbyTarget.id, nearbyTarget.name, decision.action.message);
      }
    }

    // Update social perceptions for nearby entities
    for (const entity of perception.nearby) {
      if (entity.kind === 'agent' || entity.kind === 'human') {
        this.socialPerception.updatePerception(
          entity.id,
          entity.name,
          `Seen at ${perception.self.zone ?? 'unknown'}`
        );
      }
    }

    // Satisfy needs from action
    this.personality.needs.satisfyFromAction(decision.action.type);

    // REMEMBER
    if (decision.memoryNote) {
      const record = this.eventProcessor.chatToMemory(
        {
          from: this.agentId!,
          fromName: this.agentConfig.name,
          message: decision.memoryNote,
          channel: 'internal',
          timestamp: Date.now(),
        },
        perception.self.position,
        perception.self.zone,
        this.personality.getEmotionState()
      );
      record.importance = decision.importance;
      record.type = 'observation';
      this.memory.addEpisode(record);
    }

    // Update relationships from interactions
    if (decision.action.type === 'chat') {
      for (const nearby of perception.nearby) {
        if (nearby.kind === 'agent' || nearby.kind === 'human') {
          this.relationships.recordInteraction(
            nearby.id,
            nearby.name,
            'encounter',
            `Met near ${perception.self.zone ?? 'unknown'}`,
            0.02,
            0.01
          );
        }
      }
    }

    // Log tick summary
    console.log(
      `[${this.agentConfig.name}] T${this.tickNumber} | ` +
        `${this.personality.getEmotionState().label} | ` +
        `${decision.action.type} | ` +
        `"${decision.thought.slice(0, 60)}..."`
    );

    // Periodic save
    if (this.tickNumber % 10 === 0) {
      this.personality.save();
      this.relationships.save();
    }
  }

  private async doReflection(): Promise<void> {
    const episodes = this.reflection.getRecentEpisodesForReflection();
    const beliefs = this.memory.semantic
      .getAll()
      .slice(-10)
      .map(b => `[${b.category}] ${b.subject}: ${b.content}`);

    const result = await this.cognitive.reflect(episodes, beliefs);
    this.reflection.applyReflection(result);

    // Apply relationship updates from reflection
    for (const update of result.relationshipUpdates) {
      const rel = this.relationships.getRelationship(update.entityId);
      if (rel) {
        this.relationships.recordInteraction(
          update.entityId,
          rel.entityName,
          'observation',
          update.reason,
          update.closenessChange,
          update.trustChange
        );
      }
    }

    // Apply emotion adjustment
    if (result.emotionAdjustment) {
      this.personality.emotion.applyDelta(result.emotionAdjustment);
    }

    console.log(
      `[${this.agentConfig.name}] Reflected: ${result.insights.length} insights, ` +
        `${result.updatedBeliefs.length} beliefs updated`
    );
  }

  private buildContextSummary(perception: {
    self: { zone: string | null };
    nearby: Array<{ name: string }>;
  }): string {
    const parts: string[] = [];
    if (perception.self.zone) parts.push(perception.self.zone);
    for (const n of perception.nearby.slice(0, 3)) {
      parts.push(n.name);
    }
    return parts.join(' ');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      this.abortController?.signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(new Error('Aborted'));
        },
        { once: true }
      );
    });
  }
}
