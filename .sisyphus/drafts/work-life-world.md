# Draft: Work & Life World Expansion

## Codebase Understanding (Confirmed)

### Server Architecture

- `GameRoom` extends Colyseus `Room<RoomState>`
- `RoomState`: 3 MapSchemas - `humans`, `agents`, `objects` (all `EntitySchema`)
- `EntitySchema`: id, kind (human|agent|object), name, roomId, pos, tile, facing, speed, meta
- Systems: `MovementSystem`, `ProximitySystem`, `ChatSystem`, `CollisionSystem`
- `EventLog` for cursor-based event tracking

### AIC API Pattern

- Express router at `/aic/v0.1`
- Pattern: `router.post('/endpoint', rateLimiter, validateRequest(Schema), handler)`
- Zod schemas in `packages/shared/src/schemas.ts`
- Types in `packages/shared/src/types.ts`

### Test Pattern

- Vitest + `startTestServer()` helper
- `OpenClawWorldClient` from plugin package
- Integration tests: `tests/integration/`
- Contract tests: `tests/contracts/`

### Determinism

- `SeededRandom` (Mulberry32) for reproducible randomness
- `InputRecorder` for replay

---

## Requirements from User Request

### Checklist Items (16 major features)

1. IDENTITY - Profile/status + presence display
2. ORG - Organization/Team/Role + permissions
3. SPACE - 5 Zones: Lobby, Office, MeetingCenter, Lounge&Cafe, Arcade
4. MEETING - Meeting rooms with session management
5. WORK - 3 tools: Kanban, notices, agenda/memo
6. INTERACT - 6+ facilities: reception, gate, door, whiteboard, voting, cafe
7. NPC - 10 NPCs with roles and dialogue
8. SOCIAL - Extended chat (proximity/global/team/meeting/DM/emotes)
9. SAFETY - Report/block/mute + audit log
10. PERSIST - Persistence for all state
11. AIC - Extended API for new features
12. E2E - Playwright 2-client scenario
13. DETERMINISM - Maintain seeded RNG/replay
14. DOCS - Documentation
15. PLAYTEST - 30min routine x3
16. CI - All tests pass

### Architecture Approach

- World Pack system: `world/packs/base/`
- Data-driven: maps/, entities/, npcs/, work/, events/
- Zod validation, shared types, server authority

---

## Technical Decisions (CONFIRMED BY USER)

### D1: Persistence Layer - IN-MEMORY + FILE SNAPSHOTS

- World pack JSON for static data
- Room state snapshots on shutdown/intervals
- Can upgrade to SQLite later

### D2: Multi-Zone Architecture - HYBRID

- Main world room with zone-based logic (Lobby, Office, Lounge, Arcade)
- Instanced meeting rooms as separate Colyseus rooms
- Players join meeting room when entering, return to main world on leave

### D3: NPC Behavior - STATE MACHINE (FSM)

- NPCs have schedules (barista breaks, PM patrols)
- Predetermined dialogue with state tracking
- NOT LLM-powered

### D4: Work Tools

- **Essential**: Kanban (todo/doing/done), Team Notices, Meeting Agenda
- **Deferred**: Memo attachments, due dates, assignees
- **Real-time sync**: YES via Colyseus state
- **Permissions**: Role-based (Admin/Owner edit, Members view, Guests nothing)

### D5: Meeting Room Features

- **Text chat only** (no WebRTC)
- **Whiteboard**: Sticky notes on grid (add/move/remove/color)
- **Voting**: Yes/no/abstain, optional anonymous, show results

### D6: E2E Test - FULL SCENARIO

- Client A creates org, invites Client B
- Client B joins team
- Client A reserves meeting
- Both enter meeting, agenda, vote, whiteboard sticky
- Exit, verify team chat

---

## Scope Boundaries (CONFIRMED)

### INCLUDE

- All 16 checklist items
- Zone system + basic meeting flow FIRST
- Whiteboard/voting in later iterations within this plan

### EXCLUDE

- Video/audio WebRTC
- LLM-powered NPCs
- Mobile client
- Localization/i18n

---

## Priority Order (User Guidance)

1. Zone system + basic meeting flow
2. Organization/Team/Role system
3. Work tools (Kanban, Notices, Agenda)
4. NPC FSM system
5. Whiteboard, Voting
6. E2E tests
7. Documentation/Playtest
