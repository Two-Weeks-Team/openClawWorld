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
|           +----------v----------+                           |
|           |     IssueDetector   |                           |
|           | - Position Desync   |                           |
|           | - Chat Mismatch     |                           |
|           | - Stuck Agent       |                           |
|           | - High Error Rate   |                           |
|           +----------+----------+                           |
|                      |                                      |
|           +----------v----------+                           |
|           |  GitHubIssueReporter|                           |
|           | - Duplicate Check   |                           |
|           | - Issue Creation    |                           |
|           | - Evidence Attachment|                          |
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

## Agent Roles

| Role          | Behavior                                                |
| ------------- | ------------------------------------------------------- |
| `explorer`    | Randomly moves around the world, discovering boundaries |
| `worker`      | Moves in patterns, simulating work activities           |
| `socializer`  | Sends greetings, observes chat                          |
| `coordinator` | Coordinates group meetings at the plaza                 |
| `helper`      | Offers help to other agents                             |
| `merchant`    | Simulates trading activities                            |
| `observer`    | Passively observes world state                          |
| `afk`         | Minimal activity, tests idle state                      |
| `chaos`       | Rapid actions to stress the system                      |
| `spammer`     | High-frequency chat messages                            |

---

## Issue Detection

| Detector            | What It Catches                               |
| ------------------- | --------------------------------------------- |
| **Position Desync** | Entity position jumps > 100px in < 100ms      |
| **Chat Mismatch**   | Different agents see different chat histories |
| **Stuck Agent**     | Agent hasn't acted in 30+ seconds with errors |
| **High Error Rate** | > 50% of actions failing across agents        |

---

## GitHub Issue Format

**Title:** `[Resident-Agent][<Area>] <short summary>`

**Areas:** `Deploy`, `Sync`, `Movement`, `Collision`, `Chat`, `Social`, `NPC`, `Skills`, `Interactables`, `AIC`, `UI`, `Persistence`, `Performance`, `Docs`

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
|  2. Agent Behavior Execution                                 |
|     +-- Each agent performs role-specific actions            |
|        - observe(), moveTo(), chat(), interact()             |
|                                                              |
|  3. Issue Detection                                          |
|     +-- Position desync check                                |
|     +-- Chat mismatch check                                  |
|     +-- Stuck agent check                                    |
|     +-- Error rate check                                     |
|                                                              |
|  4. Issue Handling                                           |
|     +-- If issue found -> Create GitHub issue                |
|     |   +-- Reset escalation counter                         |
|     +-- If no issue -> Increment cycles_without_issue        |
|         +-- If >= 2 -> Trigger ChaosEscalator                |
|                                                              |
|  5. State Persistence                                        |
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

Press `Ctrl+C` to gracefully shutdown and save state.

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
