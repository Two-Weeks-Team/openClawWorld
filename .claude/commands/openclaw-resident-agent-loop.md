---
description: "OpenClawWorld Issue-First Autonomous Society Orchestrator - Continuous world simulation and bug discovery with GitHub issue output only"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Task, WebFetch
argument-hint: [--stress low|medium|high] [--agents N] [--chaos] [--dry-run] [--resume]
---

# /openclaw-resident-agent-loop - Issue-First Autonomous Society Orchestrator

> **PERMANENT OPERATION MODE**: The ONLY external-facing output is GitHub Issues.
> Do NOT send progress reports, summaries, or plans to humans.
> The human operator wants to receive ONLY issues, forever.

## Implementation

This command is backed by `scripts/resident-agent-loop.ts` in the OpenClawWorld repository.

**Run directly:**

```bash
cd <openclawworld-repo>
pnpm resident-agent-loop [options]
```

## Primary Directive

Run OpenClawWorld continuously and relentlessly.

| Requirement     | Description                                                   |
| --------------- | ------------------------------------------------------------- |
| **Population**  | Keep the world populated and active (minimum 10 agents)       |
| **Discovery**   | Continuously discover problems and file them as GitHub Issues |
| **Persistence** | Continue after filing issues - there is NO end                |

---

## Hard Rule: No-Issue Loop is FAILURE

Every cycle MUST end in one of the following:

| Option  | Description                                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------ |
| **(A)** | Create >= 1 NEW GitHub Issue                                                                                             |
| **(B)** | Add materially new evidence to an existing open issue (comment), AND also create >= 1 NEW Issue within the next 2 cycles |

**If 2 cycles pass without creating a NEW issue:**

1. Automatically increase stress level
2. Increase agent count
3. Expand surface area
4. Begin adversarial chaos scenarios
5. Continue until a new issue is discovered and filed

---

## Arguments

| Argument         | Default                 | Description                                        |
| ---------------- | ----------------------- | -------------------------------------------------- |
| `--stress`, `-s` | `medium`                | Stress level: `low`, `medium`, `high`              |
| `--agents`, `-a` | `10`                    | Initial agent population count                     |
| `--chaos`        | `false`                 | Start with chaos scenarios enabled                 |
| `--dry-run`      | `false`                 | Simulation mode - log issues but don't create them |
| `--room`, `-r`   | `default`               | Room ID to join                                    |
| `--url`, `-u`    | `http://localhost:2567` | Server URL                                         |
| `--delay`        | `2000`                  | Cycle delay in milliseconds                        |

---

## Prerequisites

1. **Server Running**: Start the OpenClawWorld server first

   ```bash
   pnpm dev:server
   # or with Docker
   docker compose up -d
   ```

2. **GitHub CLI**: Authenticate with GitHub

   ```bash
   gh auth login
   gh auth status
   ```

3. **Dependencies**: Install project dependencies
   ```bash
   pnpm install
   ```

---

## Quick Start

```bash
# Navigate to OpenClawWorld repository
cd /path/to/openClawWorld

# Basic start (default settings)
pnpm resident-agent-loop

# High stress mode with 20 agents
pnpm resident-agent-loop -- --agents 20 --stress high

# Start with chaos enabled
pnpm resident-agent-loop -- --chaos

# Dry run (simulate without creating issues)
pnpm resident-agent-loop -- --dry-run

# Custom server URL
pnpm resident-agent-loop -- --url http://localhost:2567
```

---

## Architecture

```
+-------------------------------------------------------------+
|                 ResidentAgentLoop                           |
|                 (Main Orchestrator)                         |
+-------------------------------------------------------------+
|                                                             |
|  +-------------------+  +-------------------+               |
|  | ResidentAgent     |  | ResidentAgent     |  ... (10+)   |
|  | role: explorer    |  | role: socializer  |              |
|  +--------+----------+  +--------+----------+              |
|           |                      |                          |
|           +----------+-----------+                          |
|                      |                                      |
|      +---------------v----------------+                     |
|      |     Autonomous Decision Engine |                     |
|      | - buildCandidates()            |                     |
|      | - selectAction() (weighted rng)|                     |
|      | - ROLE_PREFERENCES table       |                     |
|      | - computeNoveltyMultiplier()   |                     |
|      | - getRolePreference()          |                     |
|      +---------------+----------------+                     |
|                      |                                      |
|           +----------v----------+                           |
|           |     IssueDetector   |                           |
|           |                     |                           |
|           | Technical (6):      |                           |
|           | - Position Desync   |                           |
|           | - Chat Mismatch     |                           |
|           | - Stuck Agent       |                           |
|           | - High Error Rate   |                           |
|           | - Entity Count Div. |                           |
|           | - Facility State Div|                           |
|           |                     |                           |
|           | Response (3):       |                           |
|           | - Observe Inconsis. |                           |
|           | - Interact Failure  |                           |
|           | - Event Gaps        |                           |
|           |                     |                           |
|           | Coverage (1):       |                           |
|           | - Low API Coverage  |                           |
|           |                     |                           |
|           | Behavioral (4):     |                           |
|           | - Role Compliance   |                           |
|           | - Low Entropy       |                           |
|           | - Idle w/ Opportun. |                           |
|           | - Candidate Starvat.|                           |
|           +----------+----------+                           |
|                      |                                      |
|           +----------v----------+                           |
|           |  GitHubIssueReporter|                           |
|           | - Duplicate Check   |                           |
|           |   (cooldown+shuffle)|                           |
|           | - Issue Creation    |                           |
|           | - Evidence Attachment|                          |
|           | - Existing Issue    |                           |
|           |   Comment           |                           |
|           +----------+----------+                           |
|                      |                                      |
|           +----------v----------+                           |
|           |    ChaosEscalator   |                           |
|           | - Increase agents   |                           |
|           | - Increase frequency|                           |
|           | - Enable chaos mode |                           |
|           +---------------------+                           |
|                                                             |
+-------------------------------------------------------------+
```

---

## Autonomous Decision Engine

Each agent makes non-deterministic decisions every cycle using a weighted random selection system. This replaces the previous hardcoded role-to-behavior mapping.

### How It Works

```
ROLE_PREFERENCES (weight table per role)
             |
             v
buildCandidates()   <-- context-aware: nearby facilities, entities, state
             |
             v
computeNoveltyMultiplier()  <-- penalizes recently repeated actions
             |
             v
selectAction()  <-- weighted random selection (non-deterministic)
             |
             v
execute chosen action
```

1. **`buildCandidates()`**: Generates a list of `ActionCandidate` objects based on the agent's current context (nearby facilities with affordances, visible entities, available API calls). Each candidate has a weight derived from the role's preference table.
2. **`computeNoveltyMultiplier()`**: Applies a decay multiplier to recently-performed actions, ensuring behavioral variety over time.
3. **`getRolePreference()`**: Looks up the weight for a given action from the `ROLE_PREFERENCES` table for the agent's role. Falls back to 0.01 for unlisted actions.
4. **`selectAction()`**: Performs weighted random selection across all candidates. The agent does NOT always pick the highest-weight action — randomness ensures non-determinism and broader API surface coverage.

### Key Design Principles

- **Non-deterministic**: Same role + same context can produce different actions each cycle
- **Context-aware**: Facility affordances and nearby entities dynamically generate candidates
- **Self-varying**: Novelty multiplier prevents repetitive loops
- **Full API coverage**: All 12 AIC endpoints are reachable through the candidate system

---

## Agent Roles

All 10 roles share the same decision engine. The `ROLE_PREFERENCES` weight table biases each role toward its thematic behavior without hardcoding it.

| Role          | Primary Bias                                                                             |
| ------------- | ---------------------------------------------------------------------------------------- |
| `explorer`    | High weight on navigation, portals, notice boards; low on chat                           |
| `worker`      | Kanban terminal, whiteboard interactions; moderate navigation                            |
| `socializer`  | Chat, chat observation, cafe counter; high entity approach                               |
| `coordinator` | Schedule kiosk, room doors, notice board posts; group chat                               |
| `helper`      | Entity approach, chat observation, poll events; skill discovery                          |
| `merchant`    | Vending machine, cafe counter, notice board posts; trade chat                            |
| `observer`    | Poll events, observe (passive); minimal chat and movement                                |
| `afk`         | Profile updates, passive observe; near-zero activity weights                             |
| `chaos`       | Uniform weights across all actions; includes reregister (unregister + re-register cycle) |
| `spammer`     | Extremely high chat weight; minimal everything else                                      |

---

## AIC API Coverage

The agent uses **12 of 12** AIC endpoints:

| Endpoint         | Usage                                           |
| ---------------- | ----------------------------------------------- |
| `register`       | Agent registration on startup                   |
| `unregister`     | Graceful shutdown + chaos reregister cycle      |
| `observe`        | World state observation (with facility parsing) |
| `moveTo`         | Navigation to coordinates                       |
| `interact`       | Facility affordance interactions                |
| `chatSend`       | Role-themed chat messages                       |
| `chatObserve`    | Chat history monitoring                         |
| `pollEvents`     | World event polling (with cursor management)    |
| `profile/update` | Status and profile changes                      |
| `skill/list`     | Skill discovery                                 |
| `skill/install`  | Skill installation                              |
| `skill/invoke`   | Skill invocation                                |

---

## Issue Detection (14 Detectors)

Detectors are shuffled each cycle to avoid ordering bias. Each detector has a per-area cooldown to prevent duplicate filing.

### Technical Detectors (6)

| Detector                      | What It Catches                                        |
| ----------------------------- | ------------------------------------------------------ |
| **Position Desync**           | Entity position jumps > 100px in < 100ms               |
| **Chat Mismatch**             | Different agents see different chat histories          |
| **Stuck Agent**               | Agent hasn't acted in 30+ seconds with errors          |
| **High Error Rate**           | > 50% of actions failing across agents                 |
| **Entity Count Divergence**   | Agents in same area see different entity counts        |
| **Facility State Divergence** | Agents see different facility states for same facility |

### Response Validation Detectors (3)

| Detector                     | What It Catches                                                   |
| ---------------------------- | ----------------------------------------------------------------- |
| **Observe Inconsistency**    | Observe responses missing expected fields or returning stale data |
| **Interact Failure Pattern** | High failure rate (>80%) in facility interactions                 |
| **Event Gaps**               | Poll events returning no data despite world activity              |

### Coverage Detector (1)

| Detector             | What It Catches                                   |
| -------------------- | ------------------------------------------------- |
| **Low API Coverage** | Agents failing to exercise expected API endpoints |

### Behavioral Anomaly Detectors (4)

| Detector                    | What It Catches                                                                 |
| --------------------------- | ------------------------------------------------------------------------------- |
| **Role Compliance Anomaly** | Agent's actual action distribution deviates significantly from role preferences |
| **Low Decision Entropy**    | Agent repeatedly selecting the same action (low variety)                        |
| **Idle With Opportunity**   | Agent doing nothing despite nearby facilities/entities                          |
| **Candidate Starvation**    | Decision engine producing zero or very few candidates                           |

---

## GitHub Issue Format

**Title:** `[Resident-Agent][<Area>] <short summary>`

**Areas:** `Deploy`, `Sync`, `Movement`, `Collision`, `Chat`, `Social`, `NPC`, `Skills`, `Interactables`, `AIC`, `UI`, `Persistence`, `Performance`, `Docs`, `Behavior`, `Coverage`

**Labels:** `resident-agent`, `<area>`, `<severity>`

---

## State Management

State is persisted to: `~/.openclaw-resident-agent/state.json`

```json
{
  "version": 1,
  "sessionId": "resident_1707123456789",
  "cycleCount": 42,
  "cyclesWithoutIssue": 0,
  "stressLevel": "medium",
  "agentCount": 10,
  "chaosEnabled": false,
  "totalIssuesCreated": 5,
  "escalationCount": 2,
  "startedAt": "2024-02-05T10:00:00.000Z",
  "agents": ["agt_abc123", "agt_def456", ...],
  "recentIssues": ["https://github.com/..."]
}
```

---

## Chaos Escalation Levels

| Level | Action                           |
| ----- | -------------------------------- |
| 1     | Add 5 more agents                |
| 2     | Decrease cycle delay to 500ms    |
| 3     | Enable chaos behaviors           |
| 4     | Spawn 5 spammer agents           |
| 5     | Convert all agents to chaos mode |

After level 5, escalation resets and cycles again.

---

## Execution Flow

```
+-------------------------------------------------------------+
|                    CYCLE START                               |
+-------------------------------------------------------------+
|  1. Server Health Check                                      |
|     +-- GET /health -> If fail, file Deploy issue            |
|                                                              |
|  2. Autonomous Agent Behavior                                |
|     +-- Each agent runs decision engine:                     |
|        a. buildCandidates()                                  |
|           - Always: observe, pollEvents, chatObserve,        |
|             chat, profileUpdate, skillList, wander           |
|           - Contextual: facility interactions (from          |
|             observe.facilities[].affords), entity approach,  |
|             navigate-to-facility                             |
|           - Chaos-only: reregister (unregister + register)   |
|        b. Apply ROLE_PREFERENCES weights                     |
|        c. Apply computeNoveltyMultiplier() decay             |
|        d. selectAction() via weighted random                 |
|        e. Execute chosen action                              |
|        f. Record action in actionLog & apiCallHistory        |
|                                                              |
|  3. Issue Detection (14 detectors, shuffled)                 |
|     +-- Technical: position, chat, stuck, error rate,        |
|     |   entity divergence, facility divergence               |
|     +-- Response: observe inconsistency, interact failure,   |
|     |   event gaps                                           |
|     +-- Coverage: API coverage gap                           |
|     +-- Behavioral: role compliance, decision entropy,       |
|         idle opportunity, candidate starvation               |
|                                                              |
|  4. API Coverage Logging                                     |
|     +-- Log endpoints used vs. total (e.g., 7/12)           |
|                                                              |
|  5. Issue Handling                                           |
|     +-- If issue found -> Create GitHub issue                |
|     |   +-- Cooldown check (per-area)                        |
|     |   +-- Duplicate check (existing open issues)           |
|     |   +-- Reset escalation counter                         |
|     +-- If no issue -> Increment cycles_without_issue        |
|         +-- If >= 2 -> Trigger ChaosEscalator                |
|                                                              |
|  6. State Persistence                                        |
|     +-- Save to ~/.openclaw-resident-agent/state.json        |
|                                                              |
+-------------------------------------------------------------+
|                    CYCLE END -> RESTART                      |
|                    (NO STOP CONDITION)                       |
+-------------------------------------------------------------+
```

---

## Stop Condition

**NONE.**

The loop runs **indefinitely** until manually stopped with `Ctrl+C`.

Press `Ctrl+C` to gracefully shutdown (unregisters all agents) and save state.

---

## Environment Variables

| Variable       | Description                                                |
| -------------- | ---------------------------------------------------------- |
| `SERVER_URL`   | Server base URL (default: `http://localhost:2567`)         |
| `GITHUB_TOKEN` | GitHub token for issue creation (uses `gh` CLI by default) |

---

## Troubleshooting

| Issue                   | Solution                                                  |
| ----------------------- | --------------------------------------------------------- |
| "Server not reachable"  | Start server: `pnpm dev:server` or `docker compose up -d` |
| "gh: command not found" | Install GitHub CLI: `brew install gh`                     |
| "Not authenticated"     | Run: `gh auth login`                                      |
| Agents not registering  | Check server logs: `docker compose logs -f`               |
| No issues being created | Check `--dry-run` flag, verify `gh auth status`           |

---

## Files

| File                                    | Description                         |
| --------------------------------------- | ----------------------------------- |
| `scripts/resident-agent-loop.ts`        | Main implementation                 |
| `~/.openclaw-resident-agent/state.json` | Persistent state                    |
| `artifacts/resident-agent/`             | Issue artifacts (screenshots, logs) |
