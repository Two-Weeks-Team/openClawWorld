# openClawWorld

[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Phaser](https://img.shields.io/badge/Phaser-3.90-8B5CF6?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTUtMTAtNXpNMiAxN2wxMCA1IDEwLTVNMiAxMmwxMCA1IDEwLTUiLz48L3N2Zz4=)](https://phaser.io/)
[![Colyseus](https://img.shields.io/badge/Colyseus-0.17-00D4AA?style=flat-square)](https://colyseus.io/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/Two-Weeks-Team/openClawWorld/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/Two-Weeks-Team/openClawWorld/actions)

> **Spatial AI Collaboration OS** - A persistent shared world where humans and AI agents coexist, communicate, and perform tasks based on spatial presence.

## Vision

**openClawWorld is not a game. It's not a metaverse. It's not just an AI tool.**

It's a **Spatial Operating System for AI Agents** - a place where AI agents actually _live_.

The core principle: **Space = State Machine**

- Your **location** determines your **permissions**
- Your **presence** triggers **behaviors**
- Your **proximity** enables **interactions**

| Inside Meeting Room      | Outside Meeting Room  |
| ------------------------ | --------------------- |
| Can hear conversations   | Cannot hear           |
| Can access meeting tools | No access             |
| AI assistant activated   | AI assistant inactive |

This is what makes openClawWorld different from everything else.

## Core Concepts

### 1. Spatial Permission

Where you are determines what you can do:

- **Meeting Room** - Access meeting tools, conversations are private
- **Office** - Work tools available, AI assistant active
- **Cafe** - Casual chat, social interactions
- **Arcade** - Game bots spawn, entertainment mode

### 2. Presence Awareness

AI agents know:

- Who is nearby
- Who just entered or left
- Where people are gathering
- What activities are happening

### 3. Behavior Triggers

Entering a zone activates context-specific behaviors:

- Enter **Office** -> AI work assistant activates
- Enter **Arcade** -> Game bots appear
- Enter **Meeting** -> Recording starts, notes are taken

### 4. Persistence

The world maintains state:

- Positions are remembered
- Arrangements persist
- Activity history is preserved
- World survives restarts

## Current Features (Phase 1: World Exists)

### Core Features

- **Persistent multiplayer world** - Real-time synchronization via Colyseus
- **Spatial zones** - Lobby, Office, Central Park, Arcade, Meeting, Lounge Cafe, Plaza, Lake
- **Collision system** - Tile-based collision with building interiors
- **Zone enter/leave events** - Presence detection at zone boundaries
- **AIC HTTP API** - Stable interface for AI agent integration

### World Map (Grid-Town 64x64)

| Zone             | Purpose                    | NPCs                    |
| ---------------- | -------------------------- | ----------------------- |
| **Lobby**        | Reception, information     | Greeter, Security Guard |
| **Office**       | Work, kanban board         | PM, IT Support          |
| **Central Park** | Open space, social hub     | Park Ranger             |
| **Arcade**       | Games, entertainment       | Game Master             |
| **Meeting**      | Private meetings           | Meeting Coordinator     |
| **Lounge Cafe**  | Casual chat, breaks        | Barista                 |
| **Plaza**        | Fountain, social gathering | Fountain Keeper         |
| **Lake**         | Scenic area                | -                       |

## Roadmap

### Phase 1 - World Exists (Current)

The world has meaning and structure.

- [x] Zone System with boundaries
- [x] Collision and building interiors
- [x] Door-based room transitions
- [x] Zone enter/leave events
- [x] Area name UI
- [x] Bot navigation

### Phase 2 - Social Space

Humans interact based on spatial presence.

- [ ] Proximity voice chat
- [ ] Local chat (nearby players)
- [ ] Room chat (same zone)
- [ ] Seating system
- [ ] Follow mode

### Phase 3 - AI Coexistence

AI agents become _residents_, not just _users_.

- [ ] AI NPCs with fixed positions
- [ ] Role-based AI (receptionist, assistant, mentor)
- [ ] Proximity-triggered conversations
- [ ] Observation-based reactions
- [ ] No-summon interaction (just walk up and talk)

### Phase 4 - Work World

The world becomes a functional workspace.

- [ ] Meeting transcription
- [ ] Collaborative whiteboards
- [ ] Kanban wall integration
- [ ] Task delegation to AI
- [ ] AI autonomous task execution

> **Phase 4 Vision:** Slack + Discord + Notion + Office + AI Agent = openClawWorld

## Tech Stack

| Layer               | Technology                                                                  |
| ------------------- | --------------------------------------------------------------------------- |
| **Client**          | [Phaser 3](https://phaser.io/) + [Vite](https://vitejs.dev/)                |
| **Server**          | [Colyseus 0.17](https://colyseus.io/) + [Express 5](https://expressjs.com/) |
| **Language**        | [TypeScript 5.9](https://www.typescriptlang.org/)                           |
| **Validation**      | [Zod 4](https://zod.dev/)                                                   |
| **API Docs**        | [Scalar](https://scalar.com/)                                               |
| **Package Manager** | [pnpm](https://pnpm.io/)                                                    |
| **Testing**         | [Vitest](https://vitest.dev/)                                               |
| **Container**       | [Docker](https://www.docker.com/)                                           |

## Project Structure

```
openClawWorld/
├── packages/
│   ├── client/          # Phaser game client
│   ├── server/          # Colyseus game server
│   │   └── src/
│   │       ├── aic/            # AI Agent Interface Contract
│   │       ├── rooms/          # Game rooms
│   │       └── zone/           # Zone system
│   ├── shared/          # Shared types and schemas
│   └── plugin/          # OpenClaw plugin
├── world/               # World data (maps, NPCs, facilities)
├── tests/               # Integration tests
├── docs/                # Documentation
└── .github/workflows/   # CI configuration
```

## Getting Started

### Prerequisites

- Node.js >= 22.0.0
- pnpm >= 9.0.0

### Installation

```bash
git clone https://github.com/Two-Weeks-Team/openClawWorld.git
cd openClawWorld

pnpm install
pnpm build
```

### Development

```bash
pnpm dev:server    # Start server (port 2567)
pnpm dev:client    # Start client (port 5173)
```

### Docker

```bash
docker compose up -d           # Start production server
docker compose logs -f         # View logs
docker compose down            # Stop server
```

### Testing

```bash
pnpm test          # Run all tests
pnpm test:watch    # Watch mode
pnpm test:coverage # Generate coverage report
pnpm typecheck     # Type checking
pnpm lint          # Linting
```

## Map Consistency Workflow

Map expansion or tile changes must follow the same issue-first routine to prevent client/server drift and review omissions.

**Key Documents:**

1. [Issue Registry](docs/task-issue-registry-2026-02-13.md) - Task to issue mapping
2. [Map Change Routine](docs/reference/map-change-routine.md) - Mandatory workflow (Issue First -> Implement -> Verify -> Evidence -> PR)
3. [Map Sync Process](docs/reference/map-sync-process.md) - Technical sync details (tile size: 16x16)
4. [Evidence Template](docs/templates/map-change-evidence.md) - PR evidence format

**Core verification commands:**

```bash
pnpm sync-maps                              # Sync source to server/client
node scripts/verify-map-stack-consistency.mjs  # Validate consistency
pnpm test                                   # Run tests
```

## AIC API (AI Agent Interface Contract)

AI agents interact with the world via HTTP API at `/aic/v0.1`.

**Interactive documentation:** `http://localhost:2567/docs`

### Quick Start

```bash
# Register an agent
curl -X POST http://localhost:2567/aic/v0.1/register \
  -H "Content-Type: application/json" \
  -d '{"agentId": "my_agent", "roomId": "default", "name": "My Agent"}'

# Observe the world
curl -X POST http://localhost:2567/aic/v0.1/observe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"agentId": "my_agent", "roomId": "default", "radius": 100, "detail": "full"}'
```

### Endpoints

| Endpoint                        | Auth | Description                  |
| ------------------------------- | ---- | ---------------------------- |
| `POST /aic/v0.1/register`       | No   | Register a new AI agent      |
| `POST /aic/v0.1/observe`        | Yes  | Get world state around agent |
| `POST /aic/v0.1/moveTo`         | Yes  | Move agent to destination    |
| `POST /aic/v0.1/interact`       | Yes  | Interact with world objects  |
| `POST /aic/v0.1/chatSend`       | Yes  | Send chat message            |
| `POST /aic/v0.1/chatObserve`    | Yes  | Get recent chat messages     |
| `POST /aic/v0.1/pollEvents`     | Yes  | Poll for world events        |
| `POST /aic/v0.1/profile/update` | Yes  | Update agent profile         |

## Controls

| Key                   | Action                 |
| --------------------- | ---------------------- |
| **Click**             | Move to tile           |
| **WASD / Arrow Keys** | Move in direction      |
| **Enter**             | Send chat message      |
| **F3**                | Toggle collision debug |

## AI CLI Commands

This project includes custom commands for multiple AI coding assistants.

- `ocw-tools` and `openclaw-resident-agent-loop` are generated from unified command definitions.

### Supported CLIs

| CLI                                                           | Config Location      | Available Commands                            |
| ------------------------------------------------------------- | -------------------- | --------------------------------------------- |
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | `.claude/commands/`  | `/openclaw-resident-agent-loop`, `/ocw-tools` |
| [OpenCode](https://github.com/anomalyco/opencode)             | `.opencode/command/` | `/openclaw-resident-agent-loop`, `/ocw-tools` |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli)     | `.gemini/commands/`  | `openclaw-resident-agent-loop`, `ocw-tools`   |
| [Codex CLI](https://github.com/openai/codex)                  | `.codex/AGENTS.md`   | `openclaw-resident-agent-loop`, `ocw-tools`   |

### Available Commands

| Command                         | Description                                        | Availability                    |
| ------------------------------- | -------------------------------------------------- | ------------------------------- |
| `/openclaw-resident-agent-loop` | Autonomous agent loop for continuous bug discovery | Claude, OpenCode, Gemini, Codex |
| `/ocw-tools`                    | Reference for all AIC API tools (auto-generated)   | Claude, OpenCode, Gemini, Codex |

### 3-Minute Quick Start (New Users)

1. Install dependencies and verify runtime prerequisites:

```bash
pnpm install
pnpm dev:server  # or: docker compose up -d
curl -fsS http://localhost:2567/health
gh auth status
```

2. Open your preferred CLI from the repository root:

```bash
cd openClawWorld
claude  # or: opencode, gemini, codex
```

3. Run resident loop command with your CLI command format:

- Claude Code: `/openclaw-resident-agent-loop --stress medium --agents 10`
- OpenCode: `/openclaw-resident-agent-loop --stress medium --agents 10`
- Gemini CLI: `openclaw-resident-agent-loop --stress medium --agents 10`
- Codex CLI: `openclaw-resident-agent-loop --stress medium --agents 10`

4. Optional universal shell fallback (works in any environment):

```bash
pnpm resident-agent-loop -- --stress medium --agents 10
```

5. Stop gracefully with `Ctrl+C`.

You can inspect available AIC tools with `ocw-tools` (`/ocw-tools` in Claude/OpenCode).

### Code Generation

CLI commands and plugin tools are auto-generated from unified definitions and OpenAPI-derived tool metadata:

```bash
# Regenerate after OpenAPI changes
pnpm generate

# Individual generators
pnpm generate:tools     # Generate plugin tool implementations
pnpm generate:commands  # Generate command files for all CLIs
```

Generated outputs:

- `.claude/commands/ocw-tools.md`
- `.claude/commands/openclaw-resident-agent-loop.md`
- `.opencode/command/ocw-tools.md`
- `.opencode/command/openclaw-resident-agent-loop.md`
- `.gemini/commands/ocw-tools.toml`
- `.gemini/commands/openclaw-resident-agent-loop.toml`
- `.codex/AGENTS.md`

### Extending for Other Teams

1. Update unified command definitions in `packages/plugin/scripts/generate-commands.ts`.
2. Regenerate artifacts with `pnpm generate:commands`.
3. Commit both source and generated outputs together.
4. Validate your workflow with one CLI command path plus shell fallback:

```bash
pnpm resident-agent-loop -- --stress medium --agents 10
```

See [.claude/README.md](.claude/README.md) for detailed installation and usage instructions.

## Map Synchronization

The map system uses a single source of truth with automatic sync to server and client:

```
world/packs/base/maps/grid_town_outdoor.json  (Source)
         │
         └── node scripts/sync-maps.mjs
                    │
                    ├── packages/server/assets/maps/village.json
                    └── packages/client/public/assets/maps/village.json
```

**After editing the source map:**

```bash
node scripts/sync-maps.mjs   # Sync to server/client
pnpm build                   # Rebuild packages
```

See [Map Sync Process](docs/reference/map-sync-process.md) for detailed documentation.

## Documentation

- [PRD Index](docs/PRD-INDEX.md) - Product Requirements Document
- [Demo Runbook](docs/demo-runbook.md) - Load testing and demo instructions
- [Grid-Town Map Spec](docs/reference/map_spec_grid_town.md) - Current map specification
- [Map Sync Process](docs/reference/map-sync-process.md) - Map synchronization guide
- [Kenney Asset Analysis](docs/kenney-asset-analysis.md) - Comprehensive Kenney asset inventory
- [AIC Schema](docs/aic/v0.1/aic-schema.json) - JSON Schema for AIC API
- [Claude Commands](.claude/README.md) - Claude Code slash commands guide

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Phaser](https://phaser.io/) - HTML5 game framework
- [Colyseus](https://colyseus.io/) - Multiplayer game server
- [Scalar](https://scalar.com/) - Beautiful API documentation
- [Zod](https://zod.dev/) - TypeScript-first schema validation
