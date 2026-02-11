import type {
  SkillDefinition,
  SkillAction,
  SkillCategory,
  SkillInvokeOutcome,
  AgentSkillState,
  PendingCast,
} from '@openclawworld/shared';
import { RoomState } from '../schemas/RoomState.js';
import { EntitySchema } from '../schemas/EntitySchema.js';
import { ActiveEffectSchema } from '../schemas/ActiveEffectSchema.js';

/**
 * Handler function for skill action execution.
 * Invoked when a skill action completes (after cast time, if any).
 */
export type SkillActionHandler = (
  agentId: string,
  targetId: string | null,
  params: Record<string, unknown>,
  context: SkillExecutionContext
) => Promise<SkillInvokeOutcome>;

/**
 * Context passed to skill action handlers during execution.
 */
export type SkillExecutionContext = {
  sourceEntity: EntitySchema;
  targetEntity?: EntitySchema;
  skillDef: SkillDefinition;
  action: SkillAction;
  txId: string;
};

/**
 * Anti-spam configuration constants.
 * These values prevent abuse of the skill system.
 */
const ANTI_SPAM = {
  /** Maximum skill invocations per agent per second */
  maxInvokesPerAgentPerSecond: 5,
  /** Maximum concurrent pending casts per agent */
  maxPendingCastsPerAgent: 1,
  /** Minimum time (ms) between same action attempts */
  minTimeBetweenSameAction: 100,
} as const;

/** Movement tolerance for cast cancellation (in pixels) */
const CAST_MOVE_THRESHOLD = 5;

/**
 * SkillService - Authoritative server-side skill management.
 *
 * Responsibilities:
 * 1. Skill Registry - Register/unregister skill definitions
 * 2. Action Handlers - Register handlers for each action
 * 3. Agent Installation - Track which agents have which skills
 * 4. Cooldown Enforcement - Server-side cooldown validation
 * 5. Range Validation - Check distance between source and target
 * 6. Cast Time System - Handle pending casts with cancellation
 * 7. Effect Management - Apply and expire effects
 * 8. Deterministic Concurrency - Process simultaneous casts in order
 * 9. Anti-Spam Protection - Rate limiting per agent
 */
export class SkillService {
  /** Skill definitions registry: skillId -> SkillDefinition */
  private skills: Map<string, SkillDefinition> = new Map();

  /** Action handlers: skillId -> (actionId -> handler) */
  private actionHandlers: Map<string, Map<string, SkillActionHandler>> = new Map();

  /** Agent installed skills: agentId -> (skillId -> AgentSkillState) */
  private agentSkills: Map<string, Map<string, AgentSkillState>> = new Map();

  /** Pending casts waiting for completion: txId -> PendingCast */
  private pendingCasts: Map<string, PendingCast> = new Map();

  /** Agent invoke history for rate limiting: agentId -> timestamps[] */
  private agentInvokeHistory: Map<string, number[]> = new Map();

  /** Counter for generating unique effect IDs */
  private effectCounter: number = 0;

  constructor(private state: RoomState) {}

  // ===== SKILL REGISTRY =====

  /**
   * Register a new skill definition.
   * @param skill - The skill definition to register
   */
  registerSkill(skill: SkillDefinition): void {
    this.skills.set(skill.id, skill);
    if (!this.actionHandlers.has(skill.id)) {
      this.actionHandlers.set(skill.id, new Map());
    }
  }

  /**
   * Unregister a skill definition.
   * @param skillId - The ID of the skill to unregister
   * @returns true if skill was removed, false if not found
   */
  unregisterSkill(skillId: string): boolean {
    this.actionHandlers.delete(skillId);
    return this.skills.delete(skillId);
  }

  /**
   * Get a skill definition by ID.
   * @param skillId - The skill ID to look up
   * @returns The skill definition or undefined
   */
  getSkill(skillId: string): SkillDefinition | undefined {
    return this.skills.get(skillId);
  }

  /**
   * Get all registered skill definitions.
   * @returns Array of all skill definitions
   */
  getAllSkills(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get skills filtered by category.
   * @param category - The category to filter by
   * @returns Array of skill definitions matching the category
   */
  getSkillsByCategory(category: SkillCategory): SkillDefinition[] {
    return this.getAllSkills().filter(s => s.category === category);
  }

  // ===== ACTION HANDLERS =====

  /**
   * Register a custom action handler for a skill action.
   * @param skillId - The skill ID
   * @param actionId - The action ID within the skill
   * @param handler - The handler function to execute
   */
  registerActionHandler(skillId: string, actionId: string, handler: SkillActionHandler): void {
    let handlers = this.actionHandlers.get(skillId);
    if (!handlers) {
      handlers = new Map();
      this.actionHandlers.set(skillId, handlers);
    }
    handlers.set(actionId, handler);
  }

  // ===== AGENT INSTALLATION =====

  /**
   * Install a skill for an agent.
   * @param agentId - The agent ID
   * @param skillId - The skill ID to install
   * @param credentials - Optional credentials for the skill
   * @returns true if installed successfully, false if skill not found
   */
  installSkillForAgent(
    agentId: string,
    skillId: string,
    credentials?: Record<string, string>
  ): boolean {
    const skill = this.skills.get(skillId);
    if (!skill) return false;

    let agentSkillMap = this.agentSkills.get(agentId);
    if (!agentSkillMap) {
      agentSkillMap = new Map();
      this.agentSkills.set(agentId, agentSkillMap);
    }

    agentSkillMap.set(skillId, {
      skillId,
      installedAt: Date.now(),
      enabled: true,
      credentials,
    });

    return true;
  }

  /**
   * Uninstall a skill from an agent.
   * @param agentId - The agent ID
   * @param skillId - The skill ID to uninstall
   * @returns true if uninstalled, false if not found
   */
  uninstallSkillForAgent(agentId: string, skillId: string): boolean {
    const agentSkillMap = this.agentSkills.get(agentId);
    if (!agentSkillMap) return false;
    return agentSkillMap.delete(skillId);
  }

  /**
   * Get all skills installed for an agent.
   * @param agentId - The agent ID
   * @returns Array of installed skill states
   */
  getAgentSkills(agentId: string): AgentSkillState[] {
    const agentSkillMap = this.agentSkills.get(agentId);
    if (!agentSkillMap) return [];
    return Array.from(agentSkillMap.values());
  }

  /**
   * Check if an agent has a specific skill installed.
   * @param agentId - The agent ID
   * @param skillId - The skill ID to check
   * @returns true if installed, false otherwise
   */
  hasSkillInstalled(agentId: string, skillId: string): boolean {
    const agentSkillMap = this.agentSkills.get(agentId);
    if (!agentSkillMap) return false;
    return agentSkillMap.has(skillId);
  }

  // ===== ANTI-SPAM =====

  /**
   * Check if agent is within rate limits.
   * Records the invoke attempt if allowed.
   * @param agentId - The agent ID
   * @returns true if allowed, false if rate limited
   */
  private checkAntiSpam(agentId: string): boolean {
    const now = Date.now();
    let history = this.agentInvokeHistory.get(agentId);
    if (!history) {
      history = [];
      this.agentInvokeHistory.set(agentId, history);
    }

    const oneSecondAgo = now - 1000;
    while (history.length > 0 && history[0] < oneSecondAgo) {
      history.shift();
    }

    if (history.length >= ANTI_SPAM.maxInvokesPerAgentPerSecond) {
      return false;
    }

    history.push(now);
    return true;
  }

  /**
   * Check if agent already has a pending cast.
   * @param agentId - The agent ID
   * @returns true if a pending cast exists
   */
  private hasPendingCast(agentId: string): boolean {
    for (const cast of this.pendingCasts.values()) {
      if (cast.sourceEntityId === agentId) {
        return true;
      }
    }
    return false;
  }

  // ===== VALIDATION =====

  /**
   * Validate that cooldown has elapsed for an action.
   * @param entity - The source entity
   * @param skillId - The skill ID
   * @param actionId - The action ID
   * @param cooldownMs - The cooldown duration
   * @returns true if ready, false if on cooldown
   */
  private validateCooldown(
    entity: EntitySchema,
    skillId: string,
    actionId: string,
    cooldownMs: number
  ): boolean {
    const state = entity.getSkillState(skillId, actionId);
    if (!state) return true; // Never used, no cooldown
    return state.isReady(cooldownMs);
  }

  /**
   * Validate that target is within range of source.
   * @param source - The source entity
   * @param target - The target entity
   * @param rangeUnits - The maximum range in pixels
   * @returns true if within range
   */
  private validateRange(source: EntitySchema, target: EntitySchema, rangeUnits: number): boolean {
    const dx = target.pos.x - source.pos.x;
    const dy = target.pos.y - source.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= rangeUnits;
  }

  // ===== MAIN INVOKE =====

  /**
   * Invoke a skill action.
   * This is the main entry point for skill execution.
   *
   * @param agentId - The agent invoking the skill
   * @param skillId - The skill ID
   * @param actionId - The action ID within the skill
   * @param params - Parameters for the action
   * @param txId - Transaction ID for tracking
   * @returns The outcome of the invocation
   */
  async invokeAction(
    agentId: string,
    skillId: string,
    actionId: string,
    params: Record<string, unknown>,
    txId: string
  ): Promise<SkillInvokeOutcome> {
    if (!this.checkAntiSpam(agentId)) {
      return { type: 'error', message: 'Rate limit exceeded' };
    }

    if (this.hasPendingCast(agentId)) {
      return { type: 'error', message: 'Already casting' };
    }

    const skill = this.skills.get(skillId);
    if (!skill) {
      return { type: 'error', message: `Skill '${skillId}' not found` };
    }

    const action = skill.actions.find(a => a.id === actionId);
    if (!action) {
      return { type: 'error', message: `Action '${actionId}' not found in skill '${skillId}'` };
    }

    if (!this.hasSkillInstalled(agentId, skillId)) {
      return { type: 'error', message: `Skill '${skillId}' not installed for agent '${agentId}'` };
    }

    const sourceEntity = this.state.getEntity(agentId);
    if (!sourceEntity) {
      return { type: 'error', message: 'Source entity not found' };
    }

    const cooldownMs = action.cooldownMs ?? 0;
    if (cooldownMs > 0 && !this.validateCooldown(sourceEntity, skillId, actionId, cooldownMs)) {
      const state = sourceEntity.getSkillState(skillId, actionId);
      const remaining = state ? cooldownMs - (Date.now() - state.lastUsedTime) : 0;
      return {
        type: 'error',
        message: `Cooldown active (${Math.ceil(remaining / 1000)}s remaining)`,
      };
    }

    const targetId = params.targetId as string | undefined;
    let targetEntity: EntitySchema | undefined;

    if (targetId) {
      targetEntity = this.state.getEntity(targetId);
      if (!targetEntity) {
        return { type: 'error', message: 'Target entity not found' };
      }

      const rangeUnits = action.rangeUnits ?? Infinity;
      if (rangeUnits < Infinity && !this.validateRange(sourceEntity, targetEntity, rangeUnits)) {
        return { type: 'error', message: 'Target out of range' };
      }
    }

    const castTimeMs = action.castTimeMs ?? 0;
    if (castTimeMs > 0) {
      const pendingCast: PendingCast = {
        txId,
        skillId,
        actionId,
        sourceEntityId: agentId,
        targetEntityId: targetId ?? '',
        startTime: Date.now(),
        completionTime: Date.now() + castTimeMs,
        startPosition: { x: sourceEntity.pos.x, y: sourceEntity.pos.y },
      };
      this.pendingCasts.set(txId, pendingCast);
      return {
        type: 'pending',
        message: `Casting (${castTimeMs}ms)`,
        data: { txId, completionTime: pendingCast.completionTime },
      };
    }

    return this.executeAction(agentId, skillId, actionId, params, txId, sourceEntity, targetEntity);
  }

  // ===== EXECUTE ACTION =====

  /**
   * Execute a skill action after all validations pass.
   * @param agentId - The agent ID
   * @param skillId - The skill ID
   * @param actionId - The action ID
   * @param params - Action parameters
   * @param txId - Transaction ID
   * @param sourceEntity - The source entity
   * @param targetEntity - The target entity (if any)
   * @returns The execution outcome
   */
  private async executeAction(
    agentId: string,
    skillId: string,
    actionId: string,
    params: Record<string, unknown>,
    txId: string,
    sourceEntity: EntitySchema,
    targetEntity?: EntitySchema
  ): Promise<SkillInvokeOutcome> {
    const skill = this.skills.get(skillId)!;
    const action = skill.actions.find(a => a.id === actionId)!;

    const handlers = this.actionHandlers.get(skillId);
    const handler = handlers?.get(actionId);

    const cooldownMs = action.cooldownMs ?? 0;
    if (cooldownMs > 0) {
      const state = sourceEntity.setSkillState(skillId, actionId);
      state.markUsed();
      state.updateCooldownRemaining(cooldownMs);
    }

    if (action.effect && targetEntity) {
      const effectId = `eff_${++this.effectCounter}`;
      const effect = new ActiveEffectSchema(
        effectId,
        action.effect.id,
        agentId,
        targetEntity.id,
        action.effect.durationMs,
        action.effect.statModifiers?.speedMultiplier ?? 1.0
      );
      targetEntity.addEffect(effect);
    }

    if (handler) {
      const context: SkillExecutionContext = {
        sourceEntity,
        targetEntity,
        skillDef: skill,
        action,
        txId,
      };
      return handler(agentId, (params.targetId as string | null) ?? null, params, context);
    }

    return {
      type: 'ok',
      message: `Action '${actionId}' executed`,
      data: { skillId, actionId, targetId: targetEntity?.id },
    };
  }

  // ===== CAST PROCESSING (called from game tick) =====

  /**
   * Process all pending casts.
   * Should be called each game tick.
   * Uses deterministic ordering for consistent behavior.
   *
   * @returns Array of completed cast results
   */
  processPendingCasts(): Array<{ txId: string; outcome: SkillInvokeOutcome }> {
    const results: Array<{ txId: string; outcome: SkillInvokeOutcome }> = [];
    const now = Date.now();

    const sortedCasts = Array.from(this.pendingCasts.entries()).sort((a, b) => {
      const castA = a[1];
      const castB = b[1];
      if (castA.completionTime !== castB.completionTime) {
        return castA.completionTime - castB.completionTime;
      }
      if (castA.skillId !== castB.skillId) {
        return castA.skillId.localeCompare(castB.skillId);
      }
      if (castA.sourceEntityId !== castB.sourceEntityId) {
        return castA.sourceEntityId.localeCompare(castB.sourceEntityId);
      }
      return castA.txId.localeCompare(castB.txId);
    });

    for (const [txId, cast] of sortedCasts) {
      if (now < cast.completionTime) continue;

      const sourceEntity = this.state.getEntity(cast.sourceEntityId);
      if (!sourceEntity) {
        this.pendingCasts.delete(txId);
        results.push({
          txId,
          outcome: { type: 'error', message: 'Source entity no longer exists' },
        });
        continue;
      }

      const movedDistance = Math.sqrt(
        Math.pow(sourceEntity.pos.x - cast.startPosition.x, 2) +
          Math.pow(sourceEntity.pos.y - cast.startPosition.y, 2)
      );
      if (movedDistance > CAST_MOVE_THRESHOLD) {
        this.pendingCasts.delete(txId);
        results.push({
          txId,
          outcome: { type: 'cancelled', message: 'Cast cancelled due to movement' },
        });
        continue;
      }

      let targetEntity: EntitySchema | undefined;
      if (cast.targetEntityId) {
        targetEntity = this.state.getEntity(cast.targetEntityId);
        if (!targetEntity) {
          this.pendingCasts.delete(txId);
          results.push({
            txId,
            outcome: { type: 'error', message: 'Target no longer exists' },
          });
          continue;
        }

        const skill = this.skills.get(cast.skillId);
        const action = skill?.actions.find(a => a.id === cast.actionId);
        const rangeUnits = action?.rangeUnits ?? Infinity;
        if (rangeUnits < Infinity && !this.validateRange(sourceEntity, targetEntity, rangeUnits)) {
          this.pendingCasts.delete(txId);
          results.push({
            txId,
            outcome: { type: 'error', message: 'Target moved out of range' },
          });
          continue;
        }
      }

      this.pendingCasts.delete(txId);

      void this.executeAction(
        cast.sourceEntityId,
        cast.skillId,
        cast.actionId,
        { targetId: cast.targetEntityId },
        txId,
        sourceEntity,
        targetEntity
      );

      results.push({
        txId,
        outcome: { type: 'ok', message: 'Cast completed', data: { skillId: cast.skillId } },
      });
    }

    return results;
  }

  /**
   * Process pending casts asynchronously with proper await.
   * Use this for proper async handler support.
   *
   * @returns Promise resolving to array of completed cast results
   */
  async processPendingCastsAsync(): Promise<Array<{ txId: string; outcome: SkillInvokeOutcome }>> {
    const results: Array<{ txId: string; outcome: SkillInvokeOutcome }> = [];
    const now = Date.now();

    const sortedCasts = Array.from(this.pendingCasts.entries()).sort((a, b) => {
      const castA = a[1];
      const castB = b[1];
      if (castA.completionTime !== castB.completionTime) {
        return castA.completionTime - castB.completionTime;
      }
      if (castA.skillId !== castB.skillId) {
        return castA.skillId.localeCompare(castB.skillId);
      }
      if (castA.sourceEntityId !== castB.sourceEntityId) {
        return castA.sourceEntityId.localeCompare(castB.sourceEntityId);
      }
      return castA.txId.localeCompare(castB.txId);
    });

    for (const [txId, cast] of sortedCasts) {
      if (now < cast.completionTime) continue;

      const sourceEntity = this.state.getEntity(cast.sourceEntityId);
      if (!sourceEntity) {
        this.pendingCasts.delete(txId);
        results.push({
          txId,
          outcome: { type: 'error', message: 'Source entity no longer exists' },
        });
        continue;
      }

      const movedDistance = Math.sqrt(
        Math.pow(sourceEntity.pos.x - cast.startPosition.x, 2) +
          Math.pow(sourceEntity.pos.y - cast.startPosition.y, 2)
      );
      if (movedDistance > CAST_MOVE_THRESHOLD) {
        this.pendingCasts.delete(txId);
        results.push({
          txId,
          outcome: { type: 'cancelled', message: 'Cast cancelled due to movement' },
        });
        continue;
      }

      let targetEntity: EntitySchema | undefined;
      if (cast.targetEntityId) {
        targetEntity = this.state.getEntity(cast.targetEntityId);
        if (!targetEntity) {
          this.pendingCasts.delete(txId);
          results.push({
            txId,
            outcome: { type: 'error', message: 'Target no longer exists' },
          });
          continue;
        }

        const skill = this.skills.get(cast.skillId);
        const action = skill?.actions.find(a => a.id === cast.actionId);
        const rangeUnits = action?.rangeUnits ?? Infinity;
        if (rangeUnits < Infinity && !this.validateRange(sourceEntity, targetEntity, rangeUnits)) {
          this.pendingCasts.delete(txId);
          results.push({
            txId,
            outcome: { type: 'error', message: 'Target moved out of range' },
          });
          continue;
        }
      }

      this.pendingCasts.delete(txId);

      const outcome = await this.executeAction(
        cast.sourceEntityId,
        cast.skillId,
        cast.actionId,
        { targetId: cast.targetEntityId },
        txId,
        sourceEntity,
        targetEntity
      );
      results.push({ txId, outcome });
    }

    return results;
  }

  // ===== EFFECT PROCESSING (called from game tick) =====

  /**
   * Process and remove expired effects from all entities.
   * Should be called each game tick.
   *
   * @returns Array of expired effect IDs (currently returns empty; cleanup happens on entities)
   */
  processEffectExpirations(): string[] {
    const expiredEffectIds: string[] = [];

    const allEntities = [
      ...Array.from(this.state.humans.values()),
      ...Array.from(this.state.agents.values()),
    ];

    for (const entity of allEntities) {
      entity.cleanupExpiredEffects();
    }

    return expiredEffectIds;
  }

  // ===== UTILITY =====

  /**
   * Cancel a specific pending cast.
   * @param txId - The transaction ID of the cast to cancel
   * @returns true if cancelled, false if not found
   */
  cancelCast(txId: string): boolean {
    return this.pendingCasts.delete(txId);
  }

  /**
   * Cancel all pending casts for an agent.
   * @param agentId - The agent ID
   * @returns Number of casts cancelled
   */
  cancelAllCastsForAgent(agentId: string): number {
    let cancelled = 0;
    for (const [txId, cast] of this.pendingCasts.entries()) {
      if (cast.sourceEntityId === agentId) {
        this.pendingCasts.delete(txId);
        cancelled++;
      }
    }
    return cancelled;
  }

  /**
   * Get the pending cast for an agent (if any).
   * @param agentId - The agent ID
   * @returns The pending cast or undefined
   */
  getPendingCast(agentId: string): PendingCast | undefined {
    for (const cast of this.pendingCasts.values()) {
      if (cast.sourceEntityId === agentId) {
        return cast;
      }
    }
    return undefined;
  }

  /**
   * Get all pending casts.
   * @returns Map of txId to PendingCast
   */
  getAllPendingCasts(): Map<string, PendingCast> {
    return new Map(this.pendingCasts);
  }

  /**
   * Clean up agent data when they disconnect.
   * @param agentId - The agent ID to clean up
   */
  cleanupAgent(agentId: string): void {
    this.agentSkills.delete(agentId);
    this.agentInvokeHistory.delete(agentId);
    this.cancelAllCastsForAgent(agentId);
  }
}
