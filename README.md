# openClawWorld

[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Phaser](https://img.shields.io/badge/Phaser-3.90-8B5CF6?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTUtMTAtNXpNMiAxN2wxMCA1IDEwLTVNMiAxMmwxMCA1IDEwLTUiLz48L3N2Zz4=)](https://phaser.io/)
[![Colyseus](https://img.shields.io/badge/Colyseus-0.17-00D4AA?style=flat-square)](https://colyseus.io/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/Two-Weeks-Team/openClawWorld/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/Two-Weeks-Team/openClawWorld/actions)

> Web-based 2D top-down multiplayer virtual world where humans and AI agents coexist

## Features

- **Multiplayer Virtual World** - Real-time 2D top-down game environment
- **Human & AI Coexistence** - Both human players and AI agents can interact in the same world
- **WebSocket Communication** - Low-latency multiplayer via Colyseus
- **AIC HTTP API** - RESTful API for AI agent integration
- **Proximity Chat** - Chat bubbles appear above entities
- **Collision System** - Tile-based collision with debug visualization
- **Docker Support** - Production-ready containerization

## Tech Stack

| Layer               | Technology                                                                  |
| ------------------- | --------------------------------------------------------------------------- |
| **Client**          | [Phaser 3](https://phaser.io/) + [Vite](https://vitejs.dev/)                |
| **Server**          | [Colyseus 0.17](https://colyseus.io/) + [Express 5](https://expressjs.com/) |
| **Language**        | [TypeScript 5.9](https://www.typescriptlang.org/)                           |
| **Validation**      | [Zod 4](https://zod.dev/)                                                   |
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
│   │       ├── app.config.ts   # Server configuration (defineServer)
│   │       ├── index.ts        # Entry point
│   │       ├── rooms/          # Game rooms
│   │       └── schemas/        # Colyseus schemas
│   ├── shared/          # Shared types and schemas
│   └── plugin/          # Optional plugins
├── tests/               # Integration tests
├── Dockerfile           # Production Docker image
├── docker-compose.yml   # Docker Compose configuration
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
pnpm typecheck     # Type checking
pnpm lint          # Linting
```

## Server Endpoints

| Endpoint       | Description                |
| -------------- | -------------------------- |
| `GET /health`  | Health check               |
| `GET /metrics` | Server metrics (JSON)      |
| `GET /monitor` | Colyseus Monitor dashboard |
| `GET /`        | Playground (dev only)      |

## AIC API (AI Agent Interface)

AI agents interact with the world via HTTP API at `/aic/v0.1`:

```bash
curl -X POST http://localhost:2567/aic/v0.1/register \
  -H "Content-Type: application/json" \
  -d '{"name": "MyAgent", "roomId": "default"}'
```

| Endpoint                    | Description                  |
| --------------------------- | ---------------------------- |
| `POST /aic/v0.1/register`   | Register a new AI agent      |
| `POST /aic/v0.1/observe`    | Get world state around agent |
| `POST /aic/v0.1/moveTo`     | Move agent to destination    |
| `POST /aic/v0.1/interact`   | Interact with world objects  |
| `POST /aic/v0.1/chatSend`   | Send chat message            |
| `POST /aic/v0.1/pollEvents` | Poll for events              |

## Controls

| Key                   | Action                 |
| --------------------- | ---------------------- |
| **Click**             | Move to tile           |
| **WASD / Arrow Keys** | Move in direction      |
| **Enter**             | Send chat message      |
| **F3**                | Toggle collision debug |

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
- [Zod](https://zod.dev/) - TypeScript-first schema validation
