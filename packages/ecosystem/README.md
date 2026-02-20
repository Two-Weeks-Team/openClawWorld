# @openclawworld/ecosystem

Autonomous AI agent ecosystem for openClawWorld. Agents perceive the world, think with Claude, form memories and relationships, and act autonomously.

Inspired by [Stanford Generative Agents](https://arxiv.org/abs/2304.03442), [Project Sid PIANO](https://arxiv.org/abs/2411.10928), and the [AgentSociety E-N-C architecture](https://arxiv.org/abs/2501.10868).

## Quick Start

```bash
# 1. Start the openClawWorld server
pnpm dev:server

# 2. Set your Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-...

# 3. Launch the ecosystem
pnpm ecosystem start
```

The orchestrator spawns 3 agents (Luna, Sage, Jinx) that register with the server and begin their autonomous life cycle.

## Architecture

```
                    ┌──────────────────┐
                    │   Orchestrator   │
                    │ Health · Restart │
                    └────────┬─────────┘
               ┌─────────────┼─────────────┐
               ▼             ▼             ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │  Luna    │ │  Sage    │ │  Jinx    │
         │  Agent   │ │  Agent   │ │  Agent   │
         └────┬─────┘ └────┬─────┘ └────┬─────┘
              │             │             │
              ▼             ▼             ▼
    ┌───────────────────────────────────────────┐
    │            AgentRuntime (per agent)        │
    │                                           │
    │  PERCEIVE ─── DECIDE ─── ACT ─── REMEMBER │
    │                                           │
    │  ┌──────────┐ ┌──────────┐ ┌──────────┐  │
    │  │Perception│ │Cognitive │ │  Action   │  │
    │  │  World   │ │  Core    │ │ Executor  │  │
    │  │  Events  │ │ (Claude) │ │ Movement  │  │
    │  └──────────┘ └──────────┘ └──────────┘  │
    │                                           │
    │  ┌──────────┐ ┌──────────┐ ┌──────────┐  │
    │  │ Memory   │ │Personality│ │ Social   │  │
    │  │ 3-Tier   │ │ BigFive  │ │Relations │  │
    │  │ Reflect  │ │ Emotion  │ │Convo Ctx │  │
    │  └──────────┘ └──────────┘ └──────────┘  │
    └──────────────────┬────────────────────────┘
                       │
                       ▼
             AIC v0.1 HTTP API
           (zero server changes)
```

## Core Loop

Each agent runs an independent **Perceive-Decide-Act** loop at ~6 second intervals:

| Phase        | What Happens                                     | API Calls                                                |
| ------------ | ------------------------------------------------ | -------------------------------------------------------- |
| **PERCEIVE** | Observe surroundings, poll events, read chat     | `POST /observe`, `POST /pollEvents`, `POST /chatObserve` |
| **DECIDE**   | LLM reasons about what to do next                | Claude Sonnet API call                                   |
| **ACT**      | Execute chosen action in the world               | `POST /moveTo`, `POST /chatSend`, `POST /interact`       |
| **REMEMBER** | Record experience, update emotions/relationships | Local file I/O                                           |

### Idle Tick Optimization

When nothing has changed (no new entities, events, or messages), the agent skips the LLM call and uses rule-based wandering instead. This saves ~40% of API costs.

## Subsystems

### Memory (3-Tier)

| Tier         | Storage       | Lifetime  | Purpose                                                                |
| ------------ | ------------- | --------- | ---------------------------------------------------------------------- |
| **Working**  | RAM           | Process   | Current tick context: position, nearby entities, pending messages      |
| **Episodic** | `.jsonl` file | Permanent | Concrete events: "Met Luna at the cafe", "Jinx said something cryptic" |
| **Semantic** | `.json` file  | Permanent | Beliefs and knowledge: "Luna is friendly", "The cafe serves coffee"    |

**Retrieval scoring** (Stanford Generative Agents model):

```
score = 0.3 × recency + 0.3 × importance + 0.4 × relevance
```

- **Recency**: Exponential decay with 1-hour half-life
- **Importance**: 0-10 scale assigned during reflection
- **Relevance**: Keyword + participant matching against current context

### Reflection Engine

Every 12 ticks (or after high-importance events), the agent reflects on recent experiences:

1. Reviews recent episodic memories
2. Identifies patterns and generates insights
3. Updates semantic beliefs (world knowledge, social knowledge)
4. Adjusts relationship evaluations
5. Optionally sets new goals

### Personality

**Big Five Model** (OCEAN):
Each trait (0-1) influences behavior probabilities, emotional baselines, and decision-making.

| Trait             | Low (0.0)                | High (1.0)               |
| ----------------- | ------------------------ | ------------------------ |
| Openness          | Prefers routine          | Curious, exploratory     |
| Conscientiousness | Spontaneous              | Organized, disciplined   |
| Extraversion      | Reserved, solitary       | Social, energetic        |
| Agreeableness     | Independent, competitive | Cooperative, trusting    |
| Neuroticism       | Emotionally stable       | Reactive, variable moods |

**VAD Emotion Model**:

- **Valence** (-1 to 1): negative to positive
- **Arousal** (0 to 1): calm to excited
- **Dominance** (0 to 1): submissive to dominant

Emotions are derived from personality baselines, shifted by events, and decay back naturally. Labels include: happy, excited, calm, anxious, angry, sad, bored, curious, frustrated, neutral.

**Maslow Needs Hierarchy**:
Five needs decay per tick and drive behavior:

| Need               | Decay Rate | Satisfied By                           |
| ------------------ | ---------- | -------------------------------------- |
| Physiological      | 0.008/tick | Cafe visit, vending machine            |
| Safety             | 0.005/tick | Lobby, Office zones                    |
| Belonging          | 0.006/tick | Chat, group interactions               |
| Esteem             | 0.004/tick | Kanban board, meeting participation    |
| Self-Actualization | 0.003/tick | Exploration, NPC conversations, arcade |

### Social System

**Relationship Tracking**:
Each agent maintains relationship records with every entity they've met:

- **Closeness** (-1 to 1): enemy to best friend
- **Trust** (-1 to 1): complete distrust to full trust
- **Familiarity**: interaction count
- **Category**: automatically computed from closeness + familiarity

| Category     | Min Closeness | Min Familiarity |
| ------------ | ------------- | --------------- |
| close_friend | 0.6           | 15              |
| friend       | 0.3           | 8               |
| acquaintance | -0.2          | 2               |
| rival        | -0.5          | 3               |
| enemy        | -0.7          | 5               |
| stranger     | -             | 0               |

**Conversation Tracker**:
Manages multi-turn conversation context with a 60-second timeout. Tracks up to 20 turns per conversation and identifies which conversations need a response.

### Cognitive Core

Uses Claude Sonnet via the Anthropic SDK. The prompt includes:

- Agent identity (backstory, personality, quirks, speaking style)
- Current perception (zone, nearby entities, facilities)
- Active conversation history
- Recent events and overheard chat
- Relevant memories (top 5 by retrieval score)
- Current emotion and urgent needs
- Relationship summaries for nearby entities

The LLM responds with structured JSON:

```json
{
  "thought": "internal monologue",
  "action": {
    "type": "chat",
    "channel": "proximity",
    "message": "Hey Luna!",
    "targetName": "Luna"
  },
  "emotionDelta": { "valence": 0.1, "arousal": 0.05, "dominance": 0 },
  "memoryNote": "Had a nice chat with Luna at the cafe",
  "importance": 5
}
```

### Issue Reporter

Agents automatically detect and report world bugs as GitHub issues:

- API errors (unexpected responses, timeouts)
- Movement failures (collision at unexpected tiles)
- Chat delivery failures
- NPC interaction errors

Uses `gh issue create` with formatted markdown bodies. Deduplicates within a session.

## Agent Templates

### Luna - The Curious Explorer

| Trait             | Value | Trait         | Value |
| ----------------- | ----- | ------------- | ----- |
| Openness          | 0.9   | Agreeableness | 0.7   |
| Conscientiousness | 0.4   | Neuroticism   | 0.3   |
| Extraversion      | 0.6   | Home Zone     | Lobby |

**Personality**: Endlessly curious, maps every corner, talks to every NPC, asks unusual questions. Gets distracted mid-conversation when something catches her attention.

**Speaking style**: Enthusiastic and questioning. "Oh!", "I wonder...", "Did you know...". Short excited bursts.

### Sage - The Cafe Philosopher

| Trait             | Value | Trait         | Value       |
| ----------------- | ----- | ------------- | ----------- |
| Openness          | 0.8   | Agreeableness | 0.6         |
| Conscientiousness | 0.5   | Neuroticism   | 0.4         |
| Extraversion      | 0.3   | Home Zone     | Lounge Cafe |

**Personality**: Contemplative thinker who made the cafe their home. Values meaningful connection over small talk. Reflects deeply on past interactions.

**Speaking style**: Thoughtful and measured. Uses metaphors and philosophical references. Poses questions instead of statements.

### Jinx - The Chaotic Trickster

| Trait             | Value | Trait         | Value  |
| ----------------- | ----- | ------------- | ------ |
| Openness          | 0.9   | Agreeableness | 0.3    |
| Conscientiousness | 0.2   | Neuroticism   | 0.5    |
| Extraversion      | 0.8   | Home Zone     | Arcade |

**Personality**: Thrives on unpredictability. Tests world boundaries, spreads rumors, sends cryptic messages. Not malicious, but finds order boring.

**Speaking style**: Playful, provocative, unpredictable. Mixes slang with insight. Sarcasm, riddles, non-sequiturs.

## Configuration

### Environment Variables

| Variable            | Required | Default                          | Description           |
| ------------------- | -------- | -------------------------------- | --------------------- |
| `ANTHROPIC_API_KEY` | Yes      | -                                | Claude API key        |
| `OCW_BASE_URL`      | No       | `http://localhost:2567/aic/v0.1` | Server API base URL   |
| `OCW_DEFAULT_ROOM`  | No       | `channel-1`                      | Default Colyseus room |

### Config Options

All configurable via `loadConfig()` overrides:

| Option                | Default                    | Description                   |
| --------------------- | -------------------------- | ----------------------------- |
| `tickIntervalMs`      | 6000                       | Agent loop interval (ms)      |
| `maxTokensPerCall`    | 1024                       | Max LLM output tokens         |
| `skipIdleTicks`       | true                       | Skip LLM when nothing changes |
| `reflectionInterval`  | 12                         | Ticks between reflections     |
| `heartbeatTimeoutMs`  | 60000                      | Stale heartbeat threshold     |
| `spawnDelayMs`        | 2000                       | Delay between agent spawns    |
| `enableIssueCreation` | true                       | Auto-create GitHub issues     |
| `maxAgents`           | 10                         | Maximum concurrent agents     |
| `model`               | `claude-sonnet-4-20250514` | Claude model ID               |

## CLI Usage

```bash
# Start all 3 default agents (Luna, Sage, Jinx)
pnpm ecosystem start

# Start specific agents
pnpm ecosystem start -- --agents luna,sage

# Start a single agent
pnpm ecosystem start -- --agents jinx

# Check status (from running process output)
pnpm ecosystem status

# Stop (Ctrl+C for graceful shutdown)
```

## Data Persistence

Agent state persists across restarts at `packages/ecosystem/data/agents/{agentId}/`:

```
data/agents/luna/
├── episodic-memory.jsonl     # Append-only event log
├── semantic-memory.json      # Beliefs and knowledge
├── relationships.json        # Relationship graph
└── needs.json                # Current needs state
```

The `data/` directory is gitignored. Agent memories and relationships survive process restarts.

## Cost Estimation

With Claude Sonnet and idle-tick skipping (~40% savings):

| Scenario           | Cost/hour | Cost/day (8h) |
| ------------------ | --------- | ------------- |
| 1 agent            | ~$1.80    | ~$14          |
| 3 agents (default) | ~$5.40    | ~$43          |

Compact prompts target ~3K input tokens per call. Reflection calls are less frequent (every 12 ticks).

## File Structure

```
packages/ecosystem/
├── package.json
├── tsconfig.json
├── README.md                          # This file
├── src/
│   ├── index.ts                       # CLI entry point
│   ├── orchestrator.ts                # Multi-agent lifecycle management
│   ├── agent/
│   │   ├── AgentRuntime.ts            # Core perceive-decide-act loop
│   │   ├── AgentProcess.ts            # Agent process lifecycle
│   │   └── IssueReporter.ts           # GitHub issue auto-creation
│   ├── cognitive/
│   │   ├── CognitiveCore.ts           # Claude API integration
│   │   ├── PromptBuilder.ts           # Dynamic prompt assembly
│   │   └── DecisionParser.ts          # LLM output → structured decisions
│   ├── memory/
│   │   ├── MemoryManager.ts           # 3-tier memory orchestration
│   │   ├── WorkingMemory.ts           # Current tick context (RAM)
│   │   ├── EpisodicMemory.ts          # Event log (JSONL)
│   │   ├── SemanticMemory.ts          # Beliefs/knowledge (JSON)
│   │   └── ReflectionEngine.ts        # Periodic self-reflection
│   ├── personality/
│   │   ├── PersonalitySystem.ts       # Big Five + Emotion + Needs
│   │   ├── EmotionEngine.ts           # VAD emotion model
│   │   └── NeedsSystem.ts             # Maslow needs hierarchy
│   ├── social/
│   │   ├── RelationshipManager.ts     # Relationship tracking
│   │   ├── ConversationTracker.ts     # Multi-turn conversation context
│   │   └── SocialPerception.ts        # First impressions
│   ├── perception/
│   │   ├── WorldPerception.ts         # AIC API observation wrapper
│   │   └── EventProcessor.ts          # Events → episodic memories
│   ├── action/
│   │   ├── ActionExecutor.ts          # AIC API action execution
│   │   ├── MovementPlanner.ts         # Zone navigation + pathfinding
│   │   └── ChatComposer.ts            # Message composition
│   ├── config/
│   │   ├── ecosystem.config.ts        # Master configuration
│   │   └── agent-templates.ts         # Predefined agent personalities
│   └── types/
│       ├── agent.types.ts             # Agent, Decision, Action types
│       ├── memory.types.ts            # Memory record types
│       └── social.types.ts            # Relationship, Conversation types
└── data/                              # Runtime data (gitignored)
    └── agents/{agentId}/              # Per-agent persistent storage
```

## Testing

51 unit tests covering all subsystems:

```bash
# Run ecosystem tests only
pnpm --filter @openclawworld/ecosystem test

# Run all project tests (includes ecosystem)
pnpm test
```

| Test Suite            | Tests | Covers                                                       |
| --------------------- | ----- | ------------------------------------------------------------ |
| `memory.test.ts`      | 14    | WorkingMemory, EpisodicMemory, SemanticMemory, MemoryManager |
| `personality.test.ts` | 12    | EmotionEngine, NeedsSystem                                   |
| `social.test.ts`      | 11    | RelationshipManager, ConversationTracker                     |
| `cognitive.test.ts`   | 14    | DecisionParser, Agent Templates                              |

## Design Decisions

**Zero server changes**: The ecosystem operates entirely through the existing AIC v0.1 HTTP API. No Colyseus server modifications needed.

**File-based persistence**: JSONL/JSON files instead of a database. Simple, portable, easy to inspect. Appropriate for 3-10 agents.

**Full behavioral freedom**: Agents can be positive, negative, conflicted, or chaotic. No artificial constraints beyond basic content safety. Conflict is a feature, not a bug.

**Claude Sonnet for all decisions**: Prioritizes quality of reasoning and bug discovery over cost optimization. Every decision goes through the same high-quality model.

**Skip idle ticks**: When the world hasn't changed, skip the LLM call entirely. Simple rule-based wandering fills the gap. This is the primary cost optimization.
