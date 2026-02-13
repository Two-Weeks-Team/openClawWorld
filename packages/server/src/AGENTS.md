# SERVER SOURCE

## OVERVIEW

Colyseus game server with AIC (AI Interface Contract) HTTP API for AI agent integration.

## STRUCTURE

```
src/
├── aic/           # AI agent HTTP API (see aic/AGENTS.md)
├── rooms/         # Colyseus rooms (VillageRoom)
├── schemas/       # State schemas (18 files)
├── services/      # Business logic (10 services)
├── zone/          # Zone system (enter/leave, proximity)
├── collision/     # Tile-based collision
├── map/           # Map loading, pathfinding
├── movement/      # Player movement validation
├── chat/          # Chat system
├── events/        # Event emitter patterns
├── bots/          # Bot behavior
├── facilities/    # Interactive facilities (Kanban, Whiteboard)
├── systems/       # ECS-style systems
├── proximity/     # Proximity detection
├── metrics/       # Performance metrics
├── audit/         # Audit logging
├── profile/       # Player profiles
├── replay/        # Replay recording
└── world/         # World pack loading
```

## WHERE TO LOOK

| Task                 | Location                           |
| -------------------- | ---------------------------------- |
| Add new AIC endpoint | `aic/handlers/` + `aic/router.ts`  |
| Add new schema       | `schemas/` + register in RoomState |
| Add new service      | `services/`                        |
| Modify zone logic    | `zone/ZoneManager.ts`              |
| Map parsing          | `map/MapLoader.ts`                 |
| Collision            | `collision/CollisionManager.ts`    |

## CONVENTIONS

- Services: Class-based, injected into rooms
- Schemas: Use `@type()` decorator, extend `Schema`
- Handlers: Async, return `{ success, data?, error? }`
- Entry point: `index.ts` bootstraps Express + Colyseus

## ANTI-PATTERNS

- **NEVER** access room state directly from handlers - use services
- **NEVER** modify schema structure without migration plan
- Keep handler logic minimal - delegate to services
