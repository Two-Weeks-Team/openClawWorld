# Skill System Verification Document

This document verifies the implementation design of the OpenClawWorld Skill System against the clean-room design requirements.

## 1. Terminology Definitions

The following terms are defined precisely for the OpenClawWorld context:

- **Skill**: A capability bundle containing one or more related actions and associated metadata.
- **Action**: An atomic operation defined within a skill that an agent can perform.
- **Effect**: A temporary state modification (e.g., stat buff/debuff) applied to an entity with a defined duration.
- **Cooldown**: A server-enforced minimum time interval that must elapse between successive invocations of the same action.
- **Target**: The specific entity or spatial position (x, y) that an action is intended to affect.
- **Range**: The maximum Euclidean distance allowed between the source entity and the target for a valid action invocation.
- **Cast Time**: An optional delay period before an action executes, during which the action can be cancelled by movement or other interruptions.

## 2. Server Authority Rules

To ensure world integrity and prevent cheating, the following authority rules are enforced:

- **Single Source of Truth**: The server is the ONLY authoritative source for all skill-related states, including installations, cooldowns, and active effects.
- **Server-Side Validation**: All client requests (AIC or Room messages) are ALWAYS validated server-side before any state modification occurs.
- **Confirmation-Based UI**: Clients MUST NOT display a successful outcome until the server confirms the action execution via state sync or response.
- **Server-Side Cooldown Tracking**: Cooldowns are tracked exclusively on the server using `lastUsedTime` and `cooldownRemaining` fields.
- **Server-Side Effect Management**: Effects are applied, tracked, and expired on the server. Expiration logic runs within the server's simulation tick.
- **Schema Synchronization**: State synchronization is handled via Colyseus schema patches, ensuring all clients receive the authoritative state automatically.

## 3. Synchronization Boundaries

The system synchronizes data across the following boundaries:

- **Colyseus Schema (auto-sync)**:
    - `EntitySchema.skills`: Map of installed skills and their current cooldown state.
    - `EntitySchema.activeEffects`: Map of currently active effects on the entity.
- **AIC Endpoints (request/response)**:
    - `skills/list`: Query available or installed skills for an agent.
    - `skills/install`: Request installation of a skill bundle.
    - `skills/invoke`: Request execution of a specific skill action.
- **Room Messages (real-time)**:
    - Skill cast commands sent from clients.
    - Cast approval or rejection events broadcast by the server.
- **EventLog (polled)**:
    - `skill.invoked`: Recorded when an action is successfully triggered.
    - `effect.applied`: Recorded when a new effect is added to an entity.
    - `effect.expired`: Recorded when an effect's duration ends and it is removed.

## 4. Holdout Scenarios

The following edge cases must be handled correctly by the implementation:

### Scenario 1: Simultaneous Cast on Same Target
- **Description**: Two agents attempt to cast actions targeting the same entity within the same server tick.
- **Resolution**: The server processes requests in a deterministic order: `serverTick` > `skillId` > `sourceEntityId` > `txId`.
- **Expected Outcome**: Both actions are processed sequentially in the determined order. Cooldowns and effects are applied independently for each source.

### Scenario 2: Movement During Cast
- **Description**: An agent starts an action with a `cast_time` greater than zero, but moves its position before the timer expires.
- **Resolution**: The server detects the position change during the cast period.
- **Expected Outcome**: The cast is cancelled immediately. The cooldown is NOT applied, and the invocation outcome is returned as `type: 'cancelled'`.

### Scenario 3: Target Moves Out of Range
- **Description**: An agent starts a cast targeting an entity that is currently within range. Before the cast completes, the target moves beyond the action's `range`.
- **Resolution**: The server re-validates the range requirement at the moment of execution (after cast time).
- **Expected Outcome**: The cast fails. The invocation outcome is returned as `type: 'error'` with the message `'target_out_of_range'`.

### Scenario 4: Effect Expiration During Tick
- **Description**: An entity has an active effect with a remaining duration that reaches zero during a game tick.
- **Resolution**: The server's effect processing logic identifies the expired effect.
- **Expected Outcome**: The effect is removed from the `activeEffects` map. Any stat modifiers associated with the effect are reverted, and an `effect.expired` event is logged.

## 5. Design Compliance Matrix

| Design Requirement | Planned Implementation | Status |
|--------------------|------------------------|--------|
| Capability Bundle | `SkillDefinition` type | Compliant |
| Action Definition | `SkillAction` type | Compliant |
| Agent Installation | `SkillService.installSkillForAgent()` | Compliant |
| Handler Pattern | `SkillService.registerActionHandler()` | Compliant |
| Cooldown System | `EntitySchema.skills` MapSchema with `lastUsedTime`/`cooldownRemaining` | **NEW** |
| Effect System | `EntitySchema.activeEffects` MapSchema | **NEW** |
| Range Validation | `SkillService.validateRange()` | **NEW** |
| Cast Cancellation | `SkillService.cancelCast()` on movement | **NEW** |
| Deterministic Concurrency | Ordered by `tick`/`skillId`/`sourceId`/`txId` | **NEW** |

## 6. Mismatch/Gap List

The implementation will extend the initial clean-room design in the following areas:

- **Per-Action Cooldowns**: While the design mentioned cooldowns as a future item, the implementation will include `lastUsedTime` and `cooldownRemaining` on a per-action basis within the `EntitySchema.skills` map.
- **Stat Modifier Support**: The `ActiveEffect` schema will be implemented with full support for modifying entity stats (e.g., speed, interaction range) rather than just being a metadata flag.
- **Cast Interruption Logic**: Implementation of `SkillService.cancelCast()` to handle movement-based cancellation, which was not detailed in the high-level design.
- **Anti-Spam Rate Limiting**: Addition of a server-side rate limiter per agent per action to prevent API abuse beyond the standard cooldown mechanics.
