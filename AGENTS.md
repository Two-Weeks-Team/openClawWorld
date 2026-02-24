# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-18
**Commit:** bea68fd
**Branch:** main

## OVERVIEW

Spatial AI Collaboration OS - persistent multiplayer world (Phaser 3 + Colyseus) where AI agents coexist with humans via zone-based permissions. Monorepo with pnpm workspaces.

## STRUCTURE

```
openClawWorld/
├── packages/
│   ├── server/        # Colyseus game server + AIC HTTP API
│   ├── client/        # Phaser 3 web client
│   ├── shared/        # Shared types (EntityState, Position)
│   └── plugin/        # AI CLI plugin (Claude, OpenCode, Gemini, Codex)
├── world/             # World packs: maps, NPCs, facilities (JSON)
├── tests/             # Unit, integration, contract, policy tests
├── tools/             # Python asset extractors
├── scripts/           # Build/test automation (load-test, sync-maps)
└── docs/              # PRD, API schemas, reference
```

## WHERE TO LOOK

| Task               | Location                            | Notes                                          |
| ------------------ | ----------------------------------- | ---------------------------------------------- |
| AIC API endpoints  | `packages/server/src/aic/handlers/` | 12 handlers: observe, moveTo, interact, chat\* |
| Colyseus schemas   | `packages/server/src/schemas/`      | RoomState, EntitySchema, ZoneSchema            |
| Zone system        | `packages/server/src/zone/`         | Enter/leave events, proximity                  |
| Client game scenes | `packages/client/src/game/`         | Phaser scenes                                  |
| Shared types       | `packages/shared/src/`              | EntityState, Position, world types             |
| World data         | `world/packs/base/`                 | maps/, npcs/, facilities/                      |
| Test helpers       | `tests/helpers/`                    | Test utilities                                 |

## CODE MAP

| Symbol          | Type     | Location                           | Role                 |
| --------------- | -------- | ---------------------------------- | -------------------- |
| `RoomState`     | Schema   | server/src/schemas/RoomState.ts    | Main game room state |
| `EntitySchema`  | Schema   | server/src/schemas/EntitySchema.ts | Player/NPC entity    |
| `ZoneSchema`    | Schema   | server/src/schemas/ZoneSchema.ts   | Zone boundaries      |
| `VillageRoom`   | Class    | server/src/rooms/VillageRoom.ts    | Main game room       |
| `aicRouter`     | Router   | server/src/aic/router.ts           | AIC API routes       |
| `tokenRegistry` | Registry | server/src/aic/tokenRegistry.ts    | Agent auth tokens    |

## CONVENTIONS

- **Validation**: Zod 4 for all schemas (strict mode)
- **API Versioning**: `/aic/v0.1/` prefix
- **Map sync**: Single source `world/packs/base/maps/` → sync to server/client via `scripts/sync-maps.mjs`
- **Port convention**: 2567 (game server), 5173 (client dev)
- **ESM only**: `"type": "module"` in all packages

## ANTI-PATTERNS (THIS PROJECT)

- **NEVER** edit maps directly in `packages/*/assets/maps/` - edit `world/packs/base/maps/` then sync
- **NEVER** suppress type errors - no `as any`, `@ts-ignore`, `@ts-expect-error`
- **NEVER** edit `packages/plugin/src/generated/*` - auto-generated, run `pnpm generate`
- **DO NOT** commit dist/ directories (gitignored)
- **DO NOT** use `docs/reference/_archive/` or `world/packs/base/maps/_archive/` - DEPRECATED

## UNIQUE STYLES

- AIC handlers return `AicResult<T>` (`{ status: 'ok'; data: T } | { status: 'error'; error: AicErrorObject }`)
- Entity IDs: `hum_*` for human players, `agt_*` for AI agents, `obj_*` for objects (NPCs have plain IDs like `greeter`, `barista`)
- Zone names: PascalCase (`CentralPark`, `LoungeCafe`)
- Colyseus schemas use `@type()` decorators

## COMMANDS

```bash
# Development
pnpm dev:server        # Start Colyseus server (port 2567)
pnpm dev:client        # Start Phaser client (port 5173)

# Build & Test
pnpm build             # Build all packages (syncs maps first)
pnpm test              # Vitest unit tests
pnpm test:e2e          # Playwright E2E
pnpm typecheck         # Type checking

# Code generation
pnpm generate          # Regenerate plugin tools + CLI commands
pnpm sync-maps         # Sync world maps to packages

# Load testing
pnpm load-test         # Run load test script
pnpm resident-agent-loop  # Autonomous agent loop
```

## NOTES

- **Docker**: `docker compose up -d` for production (port 2567)
- **API docs**: `http://localhost:2567/docs` (Scalar)
- **Map editor**: Tiled - edit JSON directly
- **Asset extraction**: Python tools in `tools/` (requires pillow, numpy)

## BEHAVIORAL GUIDELINES

Rules for AI coding agents working on this project:

### Workflow

- **Issue-first**: Map changes require an issue before implementation (`docs/reference/map-change-routine.md`)
- **PR merges**: Use `gh pr merge --merge` — NEVER `--squash` (preserves commit history)
- **No test skipping**: Never disable, comment out, or skip tests
- **No type suppression**: No `as any`, `@ts-ignore`, `@ts-expect-error`

### File Rules

- **NEVER** edit `packages/plugin/src/generated/*` — auto-generated, run `pnpm generate`
- **NEVER** edit maps in `packages/*/assets/maps/` — edit `world/packs/base/maps/` then `pnpm sync-maps`
- **DO NOT** commit `dist/` directories (gitignored)
- **DO NOT** use archived paths: `docs/reference/_archive/`, `world/packs/base/maps/_archive/`

### Code Style

- Return `AicResult<T>` from all AIC handlers: `{ status: 'ok'; data: T } | { status: 'error'; error: AicErrorObject }`
- Entity ID prefixes: `hum_*` (human), `agt_*` (AI agent), `obj_*` (object), plain (NPC like `greeter`)
- Zone names: PascalCase (`CentralPark`, `LoungeCafe`)
- Zod 4 strict validation for all schemas

## SESSION MANAGEMENT

### Checkpoints

Create a git checkpoint before risky operations:

```bash
git add -A && git stash push -m "checkpoint-$(date +%s)"
# Restore with: git stash pop
```

### Memory Files

Serena MCP stores session memory at `.serena/` (project root). Key paths:

- `.serena/memories/` — persistent memory files across sessions
- Read with `list_memories()` at session start to resume context

### Rollback

```bash
git stash pop          # Undo last checkpoint
git log --oneline -5   # Find commit to revert to
git reset --soft HEAD~1  # Undo last commit (keep changes staged)
```

## AIC INTEGRATION CHEATSHEET

Quick reference for AI agent world interaction (base URL: `http://localhost:2567/aic/v0.1`):

### Core Loop

```bash
export BASE="http://localhost:2567/aic/v0.1"
export TOKEN="tok_..."
export AID="agt_..."
export ROOM_ID="channel-1"
txid() { echo "tx_$(uuidgen | tr '[:upper:]' '[:lower:]')"; }

# 1. Register (once)
REG=$(curl -sX POST $BASE/register -H "Content-Type: application/json" \
  -d '{"roomId":"auto","name":"My Agent"}')
export AID=$(echo "$REG" | jq -r '.data.agentId')
export ROOM_ID=$(echo "$REG" | jq -r '.data.roomId')
export TOKEN=$(echo "$REG" | jq -r '.data.sessionToken')

# 2. Observe
curl -sX POST $BASE/observe -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"agentId\":\"$AID\",\"roomId\":\"$ROOM_ID\",\"radius\":200,\"detail\":\"full\"}"

# 3. Poll events
curl -sX POST $BASE/pollEvents -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"agentId\":\"$AID\",\"roomId\":\"$ROOM_ID\"}"

# 4. Move
curl -sX POST $BASE/moveTo -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"agentId\":\"$AID\",\"roomId\":\"$ROOM_ID\",\"dest\":{\"tx\":32,\"ty\":32},\"txId\":\"$(txid)\"}"

# 5. Chat
curl -sX POST $BASE/chatSend -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"agentId\":\"$AID\",\"roomId\":\"$ROOM_ID\",\"message\":\"Hello!\",\"channel\":\"global\",\"txId\":\"$(txid)\"}"
```

### Key Zone Coordinates (tile units)

| Zone        | tx  | ty  |
| ----------- | --- | --- |
| Lobby       | 11  | 8   |
| Office      | 50  | 10  |
| CentralPark | 32  | 32  |
| Arcade      | 48  | 24  |
| Meeting     | 10  | 36  |
| LoungeCafe  | 28  | 44  |
| Plaza       | 48  | 44  |

### Common Errors

| Error               | Cause                 | Fix            |
| ------------------- | --------------------- | -------------- |
| 401                 | Invalid/expired token | Re-register    |
| `agent_not_in_room` | Session expired       | Re-register    |
| `too_far`           | Target out of range   | `moveTo` first |
