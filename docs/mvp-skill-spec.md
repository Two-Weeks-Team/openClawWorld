# MVP Skill System Specification

> Version: 1.0.0  
> Status: Draft  
> Last Updated: 2026-02-11

## Overview

This specification defines the MVP skill system for OpenClawWorld, including a complete test skill ("Slow Aura"), cooldown mechanics, effect management, cast flow, anti-spam protection, and deterministic conflict resolution.

---

## 1. MVP Skill Definition: Slow Aura

### Full Skill Object

```typescript
const SLOW_AURA_SKILL: SkillDefinition = {
  id: 'slow_aura',
  name: 'Slow Aura',
  version: '1.0.0',
  description: 'Emit an aura that slows nearby targets',
  category: 'social',
  emoji: '🐌',
  source: { type: 'builtin' },
  actions: [
    {
      id: 'cast',
      name: 'Cast Slow Aura',
      description: 'Apply a slowing effect to target within range',
      params: [
        {
          name: 'targetId',
          type: 'string',
          required: true,
          description: 'Entity ID of the target to slow'
        }
      ],
      cooldownMs: 5000,
      castTimeMs: 1000,
      rangeUnits: 200,
      effect: {
        id: 'slowed',
        durationMs: 3000,
        statModifiers: {
          speedMultiplier: 0.5
        }
      }
    }
  ],
  triggers: ['slow', 'aura']
};
```

### Skill Constants

| Property | Value | Notes |
|----------|-------|-------|
| `cooldownMs` | 5000 | 5 second cooldown after successful cast |
| `castTimeMs` | 1000 | 1 second cast time (interruptible) |
| `rangeUnits` | 200 | 200 pixel range |
| `effect.durationMs` | 3000 | 3 second effect duration |
| `effect.speedMultiplier` | 0.5 | 50% speed reduction |

---

## 2. Type Definitions

### Core Skill Types

```typescript
/**
 * Skill source - where the skill comes from
 */
type SkillSource =
  | { type: 'builtin' }
  | { type: 'item'; itemId: string }
  | { type: 'zone'; zoneId: string }
  | { type: 'npc'; npcId: string };

/**
 * Skill category - matches existing game categories
 */
type SkillCategory = 'social' | 'utility' | 'movement' | 'combat';

/**
 * Action parameter definition
 */
type ActionParam = {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'entityId';
  required: boolean;
  description: string;
  default?: unknown;
};

/**
 * Stat modifiers applied by effects
 */
type StatModifiers = {
  speedMultiplier?: number;      // Multiplier for movement speed (0.5 = 50% speed)
  visibilityRange?: number;      // Override visibility range in pixels
  interactionRange?: number;     // Override interaction range in pixels
  // Future extensions:
  // damageMultiplier?: number;
  // healingMultiplier?: number;
};

/**
 * Effect definition within an action
 */
type EffectDefinition = {
  id: string;                    // Effect type identifier (e.g., 'slowed')
  durationMs: number;            // How long the effect lasts
  statModifiers: StatModifiers;  // What stats are modified
};

/**
 * Action definition - what the skill can do
 */
type SkillAction = {
  id: string;                    // Unique action ID within skill
  name: string;                  // Human-readable name
  description: string;           // What this action does
  params: ActionParam[];         // Required/optional parameters
  cooldownMs: number;            // Cooldown after successful use
  castTimeMs: number;            // Time to cast (0 = instant)
  rangeUnits: number;            // Range in pixels (0 = self-only)
  effect?: EffectDefinition;     // Effect applied on success
};

/**
 * Complete skill definition
 */
type SkillDefinition = {
  id: string;                    // Unique skill identifier
  name: string;                  // Human-readable name
  version: string;               // Semver version
  description: string;           // What this skill does
  category: SkillCategory;       // Skill category
  emoji: string;                 // Visual representation
  source: SkillSource;           // Where the skill comes from
  actions: SkillAction[];        // Available actions
  triggers: string[];            // Keywords that trigger this skill
};
```

### Skill State Types

```typescript
/**
 * Per-agent, per-skill state tracking
 */
type SkillState = {
  skillId: string;               // Which skill this state is for
  lastUsedTime: number;          // Unix timestamp (ms) of last successful cast
  cooldownRemaining: number;     // Computed: ms until next cast allowed
};

/**
 * Compute cooldown remaining
 * @param lastUsedTime - When skill was last used (Unix ms)
 * @param cooldownMs - Total cooldown duration
 * @returns Milliseconds remaining (0 if ready)
 */
function computeCooldownRemaining(
  lastUsedTime: number,
  cooldownMs: number
): number {
  const elapsed = Date.now() - lastUsedTime;
  return Math.max(0, cooldownMs - elapsed);
}

/**
 * Check if skill is ready to use
 */
function isSkillReady(lastUsedTime: number, cooldownMs: number): boolean {
  return Date.now() - lastUsedTime >= cooldownMs;
}
```

### Active Effect Types

```typescript
/**
 * Active effect instance on an entity
 */
type ActiveEffect = {
  id: string;                    // Unique instance ID (uuid)
  effectType: string;            // Effect type (e.g., 'slowed')
  sourceEntityId: string;        // Who applied this effect
  targetEntityId: string;        // Who has this effect
  startTime: number;             // When applied (Unix ms)
  expirationTime: number;        // When to remove (Unix ms)
  statModifiers: StatModifiers;  // Active stat modifications
};

/**
 * Entity's effect container
 */
type EntityEffects = {
  entityId: string;
  activeEffects: Map<string, ActiveEffect>;  // effectInstanceId -> effect
};
```

### Cast State Types

```typescript
/**
 * Pending cast state
 */
type PendingCast = {
  txId: string;                  // Transaction ID
  skillId: string;               // Skill being cast
  actionId: string;              // Action being performed
  casterId: string;              // Who is casting
  targetId: string;              // Target of the cast
  startTime: number;             // When cast started (Unix ms)
  completionTime: number;        // When cast completes (Unix ms)
  casterStartPos: Vec2;          // Caster position at cast start
  targetStartPos: Vec2;          // Target position at cast start
};

/**
 * Cast outcome types
 */
type CastOutcomeType =
  | 'ok'              // Cast completed successfully
  | 'pending'         // Cast started, waiting for completion
  | 'cancelled'       // Cast was cancelled (caster moved)
  | 'interrupted'     // Cast was interrupted (caster damaged/stunned)
  | 'error';          // Cast failed (validation error)

/**
 * Cast outcome with details
 */
type CastOutcome = {
  type: CastOutcomeType;
  txId: string;
  message?: string;
  effectInstanceId?: string;     // If ok, the applied effect ID
};

/**
 * Cast rejection reasons
 */
type CastRejectionReason =
  | 'skill_not_found'
  | 'skill_not_installed'
  | 'action_not_found'
  | 'cooldown_active'
  | 'target_not_found'
  | 'target_out_of_range'
  | 'already_casting'
  | 'invalid_params'
  | 'rate_limited';
```

---

## 3. Cast Flow Specification

### Flow Diagram (Text)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SKILL INVOKE FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

Agent Request                    Server Processing                    Response
─────────────                    ─────────────────                    ────────
     │                                  │                                 │
     │  invoke(skillId, actionId,       │                                 │
     │         targetId, txId)          │                                 │
     │─────────────────────────────────>│                                 │
     │                                  │                                 │
     │                           ┌──────┴──────┐                          │
     │                           │  VALIDATE   │                          │
     │                           └──────┬──────┘                          │
     │                                  │                                 │
     │                    ┌─────────────┼─────────────┐                   │
     │                    │             │             │                   │
     │              skill exists?  cooldown ok?  target in range?         │
     │                    │             │             │                   │
     │                    └─────────────┼─────────────┘                   │
     │                                  │                                 │
     │                           [validation failed]                      │
     │                                  │─────────────────────────────────>│
     │                                  │     outcome: error              │
     │                                  │     reason: <rejection_reason>  │
     │                                  │                                 │
     │                           [validation passed]                      │
     │                                  │                                 │
     │                    ┌─────────────┴─────────────┐                   │
     │                    │     castTimeMs > 0?       │                   │
     │                    └─────────────┬─────────────┘                   │
     │                                  │                                 │
     │                    ┌─────────────┴─────────────┐                   │
     │                    │                           │                   │
     │               [YES: Cast Time]           [NO: Instant]             │
     │                    │                           │                   │
     │           Set caster state              Apply effect               │
     │           to 'casting'                  immediately                │
     │                    │                           │                   │
     │           Store PendingCast             Set lastUsedTime           │
     │                    │                           │                   │
     │                    │─────────────────────────────────────────────> │
     │                    │     outcome: pending      │                   │
     │                    │     txId: <txId>          │     outcome: ok   │
     │                    │                           │─────────────────> │
     │                    │                           │                   │
     │           ┌────────┴────────┐                  │                   │
     │           │  DURING CAST    │                  │                   │
     │           └────────┬────────┘                  │                   │
     │                    │                           │                   │
     │      ┌─────────────┼─────────────┐             │                   │
     │      │             │             │             │                   │
     │  caster moved?  target moved   cast timer      │                   │
     │      │          out of range?   complete?      │                   │
     │      │             │             │             │                   │
     │      │             │             │             │                   │
     │  [CANCEL]      [FAIL]       [COMPLETE]         │                   │
     │      │             │             │             │                   │
     │      │             │        Apply effect       │                   │
     │      │             │        Set lastUsedTime   │                   │
     │      │             │        Clear casting      │                   │
     │      │             │             │             │                   │
     │      └─────────────┴─────────────┴─────────────────────────────────>│
     │                                                    outcome: <type> │
     │                                                                    │
```

### Detailed Cast Flow Steps

#### Step 1: Agent Sends Invoke Request

```typescript
type SkillInvokeRequest = {
  agentId: string;
  roomId: string;
  txId: string;
  skillId: string;
  actionId: string;
  params: {
    targetId: string;
    // ... other action-specific params
  };
};
```

#### Step 2: Server Validation (Synchronous)

| Check | Rejection Reason | Message |
|-------|-----------------|---------|
| Skill exists | `skill_not_found` | `Skill '${skillId}' does not exist` |
| Skill installed on agent | `skill_not_installed` | `Skill '${skillId}' not installed` |
| Action exists in skill | `action_not_found` | `Action '${actionId}' not found in skill` |
| Cooldown elapsed | `cooldown_active` | `Skill on cooldown for ${remaining}ms` |
| Target exists | `target_not_found` | `Target '${targetId}' not found` |
| Target in range | `target_out_of_range` | `Target is ${distance}px away, max ${range}px` |
| Not already casting | `already_casting` | `Already casting '${pendingSkillId}'` |
| Rate limit OK | `rate_limited` | `Rate limit exceeded` |

#### Step 3: Cast Time Handling

**If `castTimeMs === 0` (Instant Cast):**
1. Apply effect immediately
2. Set `lastUsedTime = Date.now()`
3. Return `{ type: 'ok', txId, effectInstanceId }`

**If `castTimeMs > 0` (Channeled Cast):**
1. Set agent state to `casting`
2. Create `PendingCast` record:
   ```typescript
   {
     txId,
     skillId,
     actionId,
     casterId: agentId,
     targetId: params.targetId,
     startTime: Date.now(),
     completionTime: Date.now() + action.castTimeMs,
     casterStartPos: caster.pos,
     targetStartPos: target.pos
   }
   ```
3. Return `{ type: 'pending', txId }`

#### Step 4: Cast Processing (During Cast Time)

**On Each Game Tick:**

```typescript
function processPendingCasts(tick: number, now: number): void {
  for (const cast of pendingCasts.values()) {
    // Check caster moved (cancel)
    const caster = getEntity(cast.casterId);
    if (distance(caster.pos, cast.casterStartPos) > CAST_MOVE_THRESHOLD) {
      cancelCast(cast, 'caster_moved');
      continue;
    }

    // Check target out of range (fail)
    const target = getEntity(cast.targetId);
    const skill = getSkill(cast.skillId);
    const action = skill.actions.find(a => a.id === cast.actionId);
    if (distance(caster.pos, target.pos) > action.rangeUnits) {
      failCast(cast, 'target_moved_out_of_range');
      continue;
    }

    // Check completion
    if (now >= cast.completionTime) {
      completeCast(cast);
    }
  }
}
```

**Cast Move Threshold:**
```typescript
const CAST_MOVE_THRESHOLD = 5; // pixels - any movement > 5px cancels cast
```

#### Step 5: Cast Completion

```typescript
function completeCast(cast: PendingCast): void {
  const skill = getSkill(cast.skillId);
  const action = skill.actions.find(a => a.id === cast.actionId);
  
  // Apply effect if action has one
  if (action.effect) {
    const effectInstance: ActiveEffect = {
      id: generateUuid(),
      effectType: action.effect.id,
      sourceEntityId: cast.casterId,
      targetEntityId: cast.targetId,
      startTime: Date.now(),
      expirationTime: Date.now() + action.effect.durationMs,
      statModifiers: { ...action.effect.statModifiers }
    };
    
    applyEffect(cast.targetId, effectInstance);
  }
  
  // Set cooldown
  setLastUsedTime(cast.casterId, cast.skillId, Date.now());
  
  // Clear casting state
  clearCastingState(cast.casterId);
  
  // Emit event
  emitEvent({
    type: 'skill.cast_complete',
    payload: {
      txId: cast.txId,
      skillId: cast.skillId,
      actionId: cast.actionId,
      casterId: cast.casterId,
      targetId: cast.targetId,
      effectInstanceId: effectInstance?.id
    }
  });
}
```

---

## 4. Cooldown System

### Rules

1. **Cooldown Start**: Cooldown timer begins AFTER cast completes successfully, not at cast start
2. **Cancelled Casts**: If cast is cancelled (caster moved), cooldown is NOT applied
3. **Failed Casts**: If cast fails (target moved out of range), cooldown is NOT applied
4. **Cooldown Check**: `Date.now() - lastUsedTime >= cooldownMs`
5. **UI Display**: Client reads `cooldownRemaining` for progress display

### Cooldown State Management

```typescript
// Per-agent skill state storage
type AgentSkillStates = Map<string, Map<string, SkillState>>;
// agentId -> (skillId -> SkillState)

function getSkillState(
  agentId: string,
  skillId: string
): SkillState | undefined {
  return agentSkillStates.get(agentId)?.get(skillId);
}

function setLastUsedTime(
  agentId: string,
  skillId: string,
  time: number
): void {
  let agentStates = agentSkillStates.get(agentId);
  if (!agentStates) {
    agentStates = new Map();
    agentSkillStates.set(agentId, agentStates);
  }
  
  agentStates.set(skillId, {
    skillId,
    lastUsedTime: time,
    cooldownRemaining: 0  // Computed on read
  });
}

function isCooldownReady(agentId: string, skillId: string): boolean {
  const state = getSkillState(agentId, skillId);
  if (!state) return true;  // Never used = ready
  
  const skill = getSkill(skillId);
  const action = skill.actions[0];  // MVP: single action per skill
  
  return Date.now() - state.lastUsedTime >= action.cooldownMs;
}
```

---

## 5. Effect System

### Effect Lifecycle

```
┌───────────────────────────────────────────────────────────────┐
│                    EFFECT LIFECYCLE                           │
└───────────────────────────────────────────────────────────────┘

1. CREATION
   ─────────
   Cast completes successfully
        │
        v
   Create ActiveEffect instance
        │
        v
   Generate unique effect instance ID
        │
        v
   Set startTime = now
   Set expirationTime = now + durationMs


2. APPLICATION
   ───────────
   Add to target's activeEffects map
        │
        v
   Recompute target's effective stats
        │
        v
   Emit 'effect.applied' event


3. ACTIVE
   ──────
   Effect is active on target
        │
        v
   Target's speed = baseSpeed * speedMultiplier
        │
        v
   (Effect modifiers applied on every stat read)


4. EXPIRATION
   ──────────
   Game tick: currentTime >= expirationTime
        │
        v
   Remove from target's activeEffects map
        │
        v
   Recompute target's effective stats
        │
        v
   Emit 'effect.expired' event
```

### Effect Processing

```typescript
function processEffects(now: number): void {
  for (const [entityId, effects] of entityEffects.entries()) {
    for (const [effectId, effect] of effects.activeEffects.entries()) {
      if (now >= effect.expirationTime) {
        // Remove expired effect
        effects.activeEffects.delete(effectId);
        
        // Emit event
        emitEvent({
          type: 'effect.expired',
          payload: {
            effectInstanceId: effectId,
            effectType: effect.effectType,
            targetEntityId: entityId,
            sourceEntityId: effect.sourceEntityId
          }
        });
      }
    }
  }
}
```

### Effective Stat Calculation

```typescript
function getEffectiveSpeed(entityId: string): number {
  const entity = getEntity(entityId);
  const baseSpeed = entity.speed ?? DEFAULT_SPEED;
  
  const effects = entityEffects.get(entityId);
  if (!effects) return baseSpeed;
  
  // MVP: Use latest effect's multiplier (no stacking)
  let latestSlowEffect: ActiveEffect | undefined;
  let latestTime = 0;
  
  for (const effect of effects.activeEffects.values()) {
    if (effect.statModifiers.speedMultiplier !== undefined) {
      if (effect.startTime > latestTime) {
        latestTime = effect.startTime;
        latestSlowEffect = effect;
      }
    }
  }
  
  if (latestSlowEffect) {
    return baseSpeed * latestSlowEffect.statModifiers.speedMultiplier!;
  }
  
  return baseSpeed;
}
```

---

## 6. Anti-Spam Protection

### Rate Limit Constants

```typescript
const ANTI_SPAM = {
  /**
   * Maximum skill invocations per agent per second
   * Prevents rapid-fire skill spam
   */
  maxInvokesPerAgentPerSecond: 5,

  /**
   * Maximum concurrent pending casts per agent
   * Ensures only one cast at a time
   */
  maxPendingCastsPerAgent: 1,

  /**
   * Minimum time (ms) between same action attempts
   * Prevents accidental double-clicks
   */
  minTimeBetweenSameAction: 100,

  /**
   * Sliding window size for rate limiting (ms)
   */
  rateLimitWindowMs: 1000,
} as const;
```

### Rate Limiter Implementation

```typescript
type InvokeRecord = {
  agentId: string;
  skillId: string;
  actionId: string;
  timestamp: number;
};

class SkillRateLimiter {
  private invokeHistory: Map<string, InvokeRecord[]> = new Map();

  canInvoke(
    agentId: string,
    skillId: string,
    actionId: string
  ): { allowed: boolean; reason?: CastRejectionReason; retryAfterMs?: number } {
    const now = Date.now();
    const history = this.invokeHistory.get(agentId) ?? [];
    
    // Clean old records outside window
    const recentHistory = history.filter(
      r => now - r.timestamp < ANTI_SPAM.rateLimitWindowMs
    );
    
    // Check: max invokes per second
    if (recentHistory.length >= ANTI_SPAM.maxInvokesPerAgentPerSecond) {
      const oldestInWindow = recentHistory[0];
      const retryAfterMs = ANTI_SPAM.rateLimitWindowMs - (now - oldestInWindow.timestamp);
      return {
        allowed: false,
        reason: 'rate_limited',
        retryAfterMs
      };
    }
    
    // Check: min time between same action
    const lastSameAction = recentHistory
      .filter(r => r.skillId === skillId && r.actionId === actionId)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    
    if (lastSameAction) {
      const timeSince = now - lastSameAction.timestamp;
      if (timeSince < ANTI_SPAM.minTimeBetweenSameAction) {
        return {
          allowed: false,
          reason: 'rate_limited',
          retryAfterMs: ANTI_SPAM.minTimeBetweenSameAction - timeSince
        };
      }
    }
    
    return { allowed: true };
  }

  recordInvoke(agentId: string, skillId: string, actionId: string): void {
    const now = Date.now();
    const history = this.invokeHistory.get(agentId) ?? [];
    
    history.push({ agentId, skillId, actionId, timestamp: now });
    
    // Keep only recent records
    const recentHistory = history.filter(
      r => now - r.timestamp < ANTI_SPAM.rateLimitWindowMs * 2
    );
    
    this.invokeHistory.set(agentId, recentHistory);
  }
}
```

---

## 7. Deterministic Conflict Resolution

### Problem Statement

When multiple skill casts resolve in the same game tick, we need a deterministic order to ensure consistent behavior across server restarts and replays.

### Resolution Order

**Sort Key**: `(serverTick, skillId, sourceEntityId, txId)` ascending

```typescript
type ResolvedCast = {
  serverTick: number;
  skillId: string;
  sourceEntityId: string;
  txId: string;
  cast: PendingCast;
};

function sortCastsForResolution(casts: ResolvedCast[]): ResolvedCast[] {
  return casts.sort((a, b) => {
    // 1. Server tick (should be same for same-tick casts)
    if (a.serverTick !== b.serverTick) {
      return a.serverTick - b.serverTick;
    }
    
    // 2. Skill ID (alphabetical)
    if (a.skillId !== b.skillId) {
      return a.skillId.localeCompare(b.skillId);
    }
    
    // 3. Source entity ID (alphabetical)
    if (a.sourceEntityId !== b.sourceEntityId) {
      return a.sourceEntityId.localeCompare(b.sourceEntityId);
    }
    
    // 4. Transaction ID (alphabetical - includes timestamp usually)
    return a.txId.localeCompare(b.txId);
  });
}
```

### Example Scenario

**Tick 100:** Two agents cast slow_aura simultaneously

| Agent | txId | Target |
|-------|------|--------|
| agent_alice | tx_001 | agent_charlie |
| agent_bob | tx_002 | agent_charlie |

**Processing Order:**
1. `tx_001` (agent_alice) processes first (alice < bob alphabetically)
2. `tx_002` (agent_bob) processes second

**Result:** Both effects apply to agent_charlie

### Same Target Rule: Duration Refresh

When multiple effects of the same type target the same entity:

**Rule**: Later effect REFRESHES duration (no stacking)

```typescript
function applyEffect(targetId: string, newEffect: ActiveEffect): void {
  const effects = entityEffects.get(targetId) ?? { entityId: targetId, activeEffects: new Map() };
  
  // Check for existing effect of same type from any source
  let existingEffect: ActiveEffect | undefined;
  for (const effect of effects.activeEffects.values()) {
    if (effect.effectType === newEffect.effectType) {
      existingEffect = effect;
      break;
    }
  }
  
  if (existingEffect) {
    // REFRESH: Update existing effect's expiration time
    existingEffect.expirationTime = newEffect.expirationTime;
    existingEffect.sourceEntityId = newEffect.sourceEntityId;  // Track who refreshed
    existingEffect.startTime = newEffect.startTime;
    
    emitEvent({
      type: 'effect.refreshed',
      payload: {
        effectInstanceId: existingEffect.id,
        effectType: existingEffect.effectType,
        targetEntityId: targetId,
        sourceEntityId: newEffect.sourceEntityId,
        newExpirationTime: newEffect.expirationTime
      }
    });
  } else {
    // NEW: Add new effect
    effects.activeEffects.set(newEffect.id, newEffect);
    entityEffects.set(targetId, effects);
    
    emitEvent({
      type: 'effect.applied',
      payload: {
        effectInstanceId: newEffect.id,
        effectType: newEffect.effectType,
        targetEntityId: targetId,
        sourceEntityId: newEffect.sourceEntityId,
        expirationTime: newEffect.expirationTime
      }
    });
  }
}
```

### Why Refresh Instead of Stack?

| Approach | Pros | Cons |
|----------|------|------|
| **Refresh (chosen)** | Simple, predictable, no effect spam | Less tactical depth |
| Stack (count) | Tactical depth, combo potential | Complex balancing, UI clutter |
| Stack (independent) | Accurate tracking | Can trivially perma-slow targets |

**Decision**: Refresh is simpler for MVP and prevents griefing via effect spam.

---

## 8. Event Types

### New Skill Events

```typescript
type SkillEventType =
  | 'skill.cast_started'
  | 'skill.cast_complete'
  | 'skill.cast_cancelled'
  | 'skill.cast_failed'
  | 'effect.applied'
  | 'effect.refreshed'
  | 'effect.expired';

type SkillCastStartedPayload = {
  txId: string;
  skillId: string;
  actionId: string;
  casterId: string;
  targetId: string;
  completionTime: number;
};

type SkillCastCompletePayload = {
  txId: string;
  skillId: string;
  actionId: string;
  casterId: string;
  targetId: string;
  effectInstanceId?: string;
};

type SkillCastCancelledPayload = {
  txId: string;
  skillId: string;
  actionId: string;
  casterId: string;
  reason: 'caster_moved' | 'caster_interrupted';
};

type SkillCastFailedPayload = {
  txId: string;
  skillId: string;
  actionId: string;
  casterId: string;
  targetId: string;
  reason: 'target_moved_out_of_range' | 'target_died' | 'target_immune';
};

type EffectAppliedPayload = {
  effectInstanceId: string;
  effectType: string;
  sourceEntityId: string;
  targetEntityId: string;
  expirationTime: number;
  statModifiers: StatModifiers;
};

type EffectRefreshedPayload = {
  effectInstanceId: string;
  effectType: string;
  sourceEntityId: string;
  targetEntityId: string;
  newExpirationTime: number;
};

type EffectExpiredPayload = {
  effectInstanceId: string;
  effectType: string;
  sourceEntityId: string;
  targetEntityId: string;
};
```

---

## 9. API Endpoints

### Skill Invoke

```
POST /api/v1/skill/invoke
```

**Request:**
```typescript
type SkillInvokeRequest = {
  agentId: string;
  roomId: string;
  txId: string;
  skillId: string;
  actionId: string;
  params: Record<string, unknown>;
};
```

**Response (Success - Pending):**
```typescript
type SkillInvokePendingResponse = {
  status: 'ok';
  data: {
    txId: string;
    outcome: {
      type: 'pending';
      completionTime: number;
    };
    serverTsMs: number;
  };
};
```

**Response (Success - Instant):**
```typescript
type SkillInvokeOkResponse = {
  status: 'ok';
  data: {
    txId: string;
    outcome: {
      type: 'ok';
      effectInstanceId?: string;
    };
    serverTsMs: number;
  };
};
```

**Response (Error):**
```typescript
type SkillInvokeErrorResponse = {
  status: 'error';
  error: {
    code: 'bad_request' | 'forbidden' | 'rate_limited';
    message: string;
    retryable: boolean;
    details: {
      reason: CastRejectionReason;
      cooldownRemainingMs?: number;
      retryAfterMs?: number;
    };
  };
};
```

### Skill State Query

```
GET /api/v1/skill/state?agentId={agentId}&skillId={skillId}
```

**Response:**
```typescript
type SkillStateResponse = {
  status: 'ok';
  data: {
    skillId: string;
    lastUsedTime: number;
    cooldownRemainingMs: number;
    isReady: boolean;
    serverTsMs: number;
  };
};
```

---

## 10. Summary

### MVP Scope

| Component | Implemented |
|-----------|-------------|
| Single skill (Slow Aura) | Yes |
| Cooldown system | Yes |
| Cast time system | Yes |
| Effect application | Yes |
| Effect expiration | Yes |
| Anti-spam protection | Yes |
| Deterministic resolution | Yes |
| Effect stacking | No (refresh only) |
| Multiple actions per skill | No (single action) |
| Skill learning/unlocking | No (all skills available) |

### Key Values

| Constant | Value |
|----------|-------|
| Slow Aura cooldown | 5000ms |
| Slow Aura cast time | 1000ms |
| Slow Aura range | 200px |
| Slow Aura duration | 3000ms |
| Slow Aura speed multiplier | 0.5 |
| Rate limit (invokes/sec) | 5 |
| Max pending casts | 1 |
| Min same action interval | 100ms |
| Cast move threshold | 5px |
