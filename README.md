# openClawWorld

[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Phaser](https://img.shields.io/badge/Phaser-3.90-8B5CF6?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTUtMTAtNXpNMiAxN2wxMCA1IDEwLTVNMiAxMmwxMCA1IDEwLTUiLz48L3N2Zz4=)](https://phaser.io/)
[![Colyseus](https://img.shields.io/badge/Colyseus-0.17-00D4AA?style=flat-square)](https://colyseus.io/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/Two-Weeks-Team/openClawWorld/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/Two-Weeks-Team/openClawWorld/actions)

> Web-based 2D top-down multiplayer virtual world where humans and AI agents coexist

## Features

- **Multiplayer Virtual World** - Real-time 2D top-down game environment (Grid-Town 64x64 map)
- **Human & AI Coexistence** - Both human players and AI agents can interact in the same world
- **Zone System** - 8 distinct zones: Lobby, Office, Central Park, Arcade, Meeting, Lounge Cafe, Plaza, Lake
- **WebSocket Communication** - Low-latency multiplayer via Colyseus
- **AIC HTTP API** - RESTful API for AI agent integration with interactive docs
- **Proximity Chat** - Chat bubbles appear above entities
- **Collision System** - Tile-based collision with debug visualization
- **Docker Support** - Production-ready containerization
- **SVG Entity Sprites** - Scalable vector graphics for human/agent/object entities
- **Deterministic Replay** - Seeded random and input recording for replay system
- **Tool Policy System** - Configurable enable/disable controls for AI agent tools

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

## World Map

The game world uses the **Grid-Town** layout - a 64x64 tile map (2048x2048 pixels):

| Zone             | Description                      | Location      | NPCs                    |
| ---------------- | -------------------------------- | ------------- | ----------------------- |
| **Lobby**        | Reception, entrance, info boards | Top-left      | Greeter, Security Guard |
| **Office**       | Workstations, kanban board       | Top-right     | PM, IT Support          |
| **Central Park** | Green space, benches, signpost   | Center        | Park Ranger             |
| **Arcade**       | Game cabinets, prize counter     | Middle-right  | Game Master             |
| **Meeting**      | Meeting rooms (Room A, Room C)   | Bottom-left   | Meeting Coordinator     |
| **Lounge Cafe**  | Cafe counter, seating, vending   | Bottom-center | Barista                 |
| **Plaza**        | Fountain, benches, social hub    | Bottom-right  | Fountain Keeper         |
| **Lake**         | Water feature (blocked)          | Top-left edge | -                       |

## Project Structure

```
openClawWorld/
├── packages/
│   ├── client/          # Phaser game client
│   ├── server/          # Colyseus game server
│   │   └── src/
│   │       ├── app.config.ts   # Server configuration
│   │       ├── openapi.ts      # OpenAPI 3.1 spec
│   │       ├── aic/            # AIC API handlers
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

## Server Endpoints

| Endpoint            | Description                       |
| ------------------- | --------------------------------- |
| `GET /health`       | Health check                      |
| `GET /metrics`      | Server metrics (JSON)             |
| `GET /docs`         | **Interactive API Documentation** |
| `GET /openapi.json` | OpenAPI 3.1 specification         |
| `GET /monitor`      | Colyseus Monitor (dev only)       |
| `GET /`             | Playground (dev only)             |

## AIC API (AI Agent Interface)

AI agents interact with the world via HTTP API at `/aic/v0.1`.

**Full interactive documentation available at:** `http://localhost:2567/docs`

### Quick Start

```bash
# Register an agent
curl -X POST http://localhost:2567/aic/v0.1/register \
  -H "Content-Type: application/json" \
  -d '{"agentId": "my_agent", "roomId": "default", "name": "My Agent"}'

# Use the returned token for subsequent requests
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

## Claude Code Commands

This project includes custom [Claude Code](https://docs.anthropic.com/en/docs/claude-code) slash commands for AI-assisted development and testing.

### Available Commands

| Command                         | Description                                        |
| ------------------------------- | -------------------------------------------------- |
| `/openclaw-resident-agent-loop` | Autonomous agent loop for continuous bug discovery |

### Quick Start

```bash
# Commands are auto-loaded when opening the project with Claude Code
cd openClawWorld
claude

# Run the resident agent loop
/openclaw-resident-agent-loop --stress medium --agents 10
```

See [.claude/README.md](.claude/README.md) for detailed installation and usage instructions.

## Documentation

- [PRD Index](docs/PRD-INDEX.md) - Product Requirements Document
- [Demo Runbook](docs/demo-runbook.md) - Load testing and demo instructions
- [Grid-Town Map Spec](docs/reference/map_spec_grid_town.md) - Current map specification
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
