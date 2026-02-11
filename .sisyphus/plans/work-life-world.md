# Work & Life World Expansion Plan

## TL;DR

> **Quick Summary**: Transform openClawWorld into a realistic social life simulation with organizations, meetings, work tools, and NPC-populated zones. Hybrid architecture with main world room + instanced meeting rooms, FSM-driven NPCs, and real-time synchronized work tools.
>
> **Deliverables**:
>
> - 5-zone world pack (Lobby, Office, MeetingCenter, Lounge&Cafe, Arcade)
> - Organization/Team/Role system with permissions
> - Meeting room instances with agenda, whiteboard, voting
> - 3 work tools (Kanban, Notices, Agenda)
> - 10 FSM-driven NPCs
> - Extended chat (proximity/global/team/meeting/DM)
> - Safety system (report/block/mute)
> - Persistence layer (in-memory + file snapshots)
> - Extended AIC API (~15 new endpoints)
> - Full E2E Playwright test (2-client scenario)
>
> **Estimated Effort**: XL (50+ tasks across 8 waves)
> **Parallel Execution**: YES - 8 waves with significant parallelization
> **Critical Path**: Foundation → Zone System → Org System → Meeting System → E2E Tests

---

## Context

### Original Request

Transform openClawWorld from a basic multiplayer virtual world into a "Work & Life World" - a realistic social life simulation where users can join organizations, attend meetings, use work tools, and socialize.

### Interview Summary

**Key Discussions**:

- Persistence: In-memory + file snapshots (can upgrade to SQLite later)
- Architecture: Hybrid - main world room with zones + instanced meeting rooms
- NPCs: FSM-based with schedules and state-tracked dialogue
- Work Tools: Kanban (todo/doing/done), Notices, Agenda - real-time sync via Colyseus
- Meeting: Text chat only, sticky-note whiteboard, simple yes/no/abstain voting
- E2E: Full scenario (org creation → meeting → whiteboard → voting)

**Research Findings**:

- Current `EntitySchema` uses `meta` MapSchema for extensible properties
- `RoomState` has 3 entity maps (humans/agents/objects) - can extend with org/meeting schemas
- AIC API pattern: rate limiter → validation → handler, well-established
- Test infrastructure: Vitest + `startTestServer()` + `OpenClawWorldClient`

### Metis Review (Self-Analysis)

**Identified Gaps** (addressed in plan):

- Need new Colyseus schemas for Organization, Team, Meeting, Board, etc.
- Need zone detection system (which zone is entity in?)
- Need meeting room lifecycle (create → join → session → leave → destroy)
- Need permission checks integrated into all handlers
- Need snapshot/restore for persistence
- Need Playwright config for E2E tests

---

## Work Objectives

### Core Objective

Build a production-ready Work & Life World simulation with organizations, meetings, work tools, and NPC-populated zones, maintaining server authority and deterministic replay.

### Concrete Deliverables

- `world/packs/base/` - Complete world pack with 5 zone maps
- `packages/server/src/schemas/` - New schemas (Org, Team, Meeting, Board, etc.)
- `packages/server/src/systems/` - New systems (ZoneSystem, MeetingSystem, NPCSystem)
- `packages/server/src/aic/handlers/` - ~15 new AIC API endpoints
- `packages/shared/src/` - Extended types and Zod schemas
- `tests/e2e/` - Playwright 2-client full scenario test
- `docs/` - World pack creation guide, operations guide

### Definition of Done

- [ ] All 16 checklist items verified complete
- [ ] `pnpm lint && pnpm typecheck && pnpm test` passes
- [ ] Playwright E2E test passes with 2 clients
- [ ] 3x 30-minute playtests completed with documented improvements
- [ ] Documentation reviewed and complete

### Must Have

- All 16 checklist items implemented
- Server authority for all state changes
- Deterministic replay compatibility
- Backward-compatible AIC API (existing endpoints unchanged)
- All 207+ existing tests still pass

### Must NOT Have (Guardrails)

- NO WebRTC/video/audio integration
- NO LLM-powered NPC behavior
- NO horizontal scaling/multi-server architecture
- NO mobile-specific code
- NO breaking changes to existing EntitySchema structure
- NO hardcoded entity positions (all from world pack data)
- NO client-authoritative state changes
- NO over-engineering (defer assignees, due dates, attachments)

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision

- **Infrastructure exists**: YES (Vitest)
- **Automated tests**: Tests-after (add tests after implementation)
- **Framework**: vitest (existing) + Playwright (new for E2E)

### Agent-Executed QA Scenarios (MANDATORY)

Every task includes Agent-Executed QA Scenarios using:

- **Playwright**: For E2E browser tests (2-client scenarios)
- **Bash (curl)**: For API endpoint verification
- **interactive_bash (tmux)**: For server process verification

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - Start Immediately):
├── Task 1: World Pack Directory Structure
├── Task 2: Extended Shared Types & Zod Schemas
└── Task 3: Profile/Status System (IDENTITY)

Wave 2 (Core Systems - After Wave 1):
├── Task 4: Zone System Schema + Detection
├── Task 5: Organization/Team/Role Schema
├── Task 6: Permission System
└── Task 7: Extended Chat Channels

Wave 3 (Zone Implementation - After Wave 2):
├── Task 8: 5 Zone Map Definitions
├── Task 9: Zone Transition Logic
└── Task 10: Interactive Facilities Base

Wave 4 (Meeting System - After Wave 3):
├── Task 11: MeetingRoom Schema + Room Class
├── Task 12: Meeting Lifecycle (create/reserve/join/leave)
├── Task 13: Meeting Chat Channel
└── Task 14: Meeting Agenda System

Wave 5 (Work Tools - After Wave 4):
├── Task 15: Kanban Board System
├── Task 16: Team Notices System
├── Task 17: Whiteboard (Sticky Notes)
└── Task 18: Voting System

Wave 6 (NPCs & Facilities - After Wave 5):
├── Task 19: NPC FSM Base System
├── Task 20: 10 NPC Definitions
├── Task 21: 6 Interactive Facilities
└── Task 22: Safety System (report/block/mute)

Wave 7 (AIC API & Persistence - After Wave 6):
├── Task 23: AIC API Extensions (~15 endpoints)
├── Task 24: Persistence Layer (snapshots)
├── Task 25: Audit Log System
└── Task 26: Determinism Verification

Wave 8 (E2E & Docs - After Wave 7):
├── Task 27: Playwright E2E Setup
├── Task 28: Full E2E Scenario Test
├── Task 29: Documentation
├── Task 30: 3x Playtest Sessions
└── Task 31: CI Verification
```

### Dependency Matrix

| Task | Depends On  | Blocks     | Can Parallelize With |
| ---- | ----------- | ---------- | -------------------- |
| 1    | None        | 8, 20      | 2, 3                 |
| 2    | None        | 4, 5, 7    | 1, 3                 |
| 3    | None        | 7          | 1, 2                 |
| 4    | 2           | 8, 9       | 5, 6, 7              |
| 5    | 2           | 6, 11      | 4, 6, 7              |
| 6    | 5           | 15, 16, 23 | 4, 7                 |
| 7    | 2, 3        | 13         | 4, 5, 6              |
| 8    | 1, 4        | 9          | None                 |
| 9    | 4, 8        | 10, 11     | None                 |
| 10   | 9           | 21         | None                 |
| 11   | 5, 9        | 12, 13, 14 | None                 |
| 12   | 11          | 28         | 13, 14               |
| 13   | 7, 11       | 28         | 12, 14               |
| 14   | 11          | 28         | 12, 13               |
| 15   | 6, 11       | 28         | 16, 17, 18           |
| 16   | 6           | 28         | 15, 17, 18           |
| 17   | 11          | 28         | 15, 16, 18           |
| 18   | 11          | 28         | 15, 16, 17           |
| 19   | 4           | 20         | None                 |
| 20   | 1, 19       | 21         | None                 |
| 21   | 10, 20      | 28         | 22                   |
| 22   | 2           | 28         | 21                   |
| 23   | 6, 12       | 28         | 24, 25, 26           |
| 24   | 11          | 28         | 23, 25, 26           |
| 25   | 22          | 28         | 23, 24, 26           |
| 26   | All systems | 28         | 23, 24, 25           |
| 27   | None        | 28         | Can start early      |
| 28   | All above   | 29, 30     | None                 |
| 29   | 28          | 31         | 30                   |
| 30   | 28          | 31         | 29                   |
| 31   | 29, 30      | None       | None                 |

### Critical Path

```
Task 2 (Types) → Task 5 (Org) → Task 11 (Meeting) → Task 12 (Lifecycle) → Task 28 (E2E) → Task 31 (CI)
```

---

## TODOs

### Wave 1: Foundation

- [ ] 1. World Pack Directory Structure

  **What to do**:
  - Create `world/packs/base/` directory structure
  - Create subdirectories: `maps/`, `entities/`, `npcs/`, `work/`, `events/`
  - Create `manifest.json` with pack metadata
  - Create placeholder files for each zone

  **Must NOT do**:
  - Do not implement map loading logic yet (Task 8)
  - Do not add actual NPC definitions yet (Task 20)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Simple file structure creation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 8, 20
  - **Blocked By**: None

  **References**:
  - `packages/server/src/map/MapLoader.ts:1-50` - Existing map loading pattern
  - Tiled JSON format in `packages/shared/src/types.ts:376-448`

  **Acceptance Criteria**:
  - [ ] Directory structure exists: `world/packs/base/{maps,entities,npcs,work,events}/`
  - [ ] `manifest.json` contains: name, version, description, zones array
  - [ ] Each zone has placeholder: `maps/{lobby,office,meeting-center,lounge-cafe,arcade}.json`

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Verify world pack structure
    Tool: Bash (ls/find)
    Steps:
      1. ls -la world/packs/base/
      2. Assert: maps/, entities/, npcs/, work/, events/ directories exist
      3. cat world/packs/base/manifest.json
      4. Assert: JSON contains "name", "version", "zones" fields
    Expected Result: All directories and manifest exist
    Evidence: Terminal output captured
  ```

  **Commit**: YES
  - Message: `feat(world): create base world pack directory structure`
  - Files: `world/packs/base/**`

---

- [ ] 2. Extended Shared Types & Zod Schemas

  **What to do**:
  - Add new types to `packages/shared/src/types.ts`:
    - `UserStatus` (ONLINE | FOCUS | DND | AFK)
    - `OrgRole` (owner | admin | member | guest)
    - `ZoneId` (lobby | office | meeting-center | lounge-cafe | arcade)
    - `Organization`, `Team`, `TeamMember`
    - `MeetingRoom`, `MeetingSession`, `MeetingReservation`
    - `KanbanBoard`, `KanbanColumn`, `KanbanCard`
    - `Notice`, `Agenda`, `AgendaItem`
    - `Whiteboard`, `StickyNote`
    - `Vote`, `VoteOption`, `VoteCast`
    - `NPCDefinition`, `NPCState`, `DialogueNode`
    - `SafetyReport`, `BlockEntry`, `MuteEntry`
  - Add corresponding Zod schemas to `packages/shared/src/schemas.ts`
  - Export all from `packages/shared/src/index.ts`

  **Must NOT do**:
  - Do not implement server-side logic (later tasks)
  - Do not break existing types

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: []
  - Reason: Complex type system design, must maintain consistency with existing patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Tasks 4, 5, 7, 22
  - **Blocked By**: None

  **References**:
  - `packages/shared/src/types.ts:1-449` - Existing type patterns
  - `packages/shared/src/schemas.ts:1-373` - Existing Zod schema patterns
  - `packages/server/src/schemas/EntitySchema.ts:48-96` - How types map to Colyseus schemas

  **Acceptance Criteria**:
  - [ ] All 20+ new types defined in `types.ts`
  - [ ] All corresponding Zod schemas in `schemas.ts`
  - [ ] `pnpm typecheck` passes
  - [ ] Existing types unchanged (diff shows only additions)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Verify types compile and export
    Tool: Bash
    Steps:
      1. cd packages/shared && pnpm typecheck
      2. Assert: exit code 0
      3. grep -c "export type" src/types.ts
      4. Assert: count increased by 20+
    Expected Result: Typecheck passes, new types exported
    Evidence: Terminal output captured

  Scenario: Verify Zod schemas validate
    Tool: Bash
    Steps:
      1. Create test file that imports and validates sample data
      2. Run: npx tsx test-schemas.ts
      3. Assert: All validations pass
    Expected Result: Schemas correctly validate sample data
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(shared): add types and schemas for work-life world features`
  - Files: `packages/shared/src/types.ts`, `packages/shared/src/schemas.ts`, `packages/shared/src/index.ts`

---

- [ ] 3. Profile/Status System (IDENTITY)

  **What to do**:
  - Extend `EntitySchema` with profile fields (bio, status, avatar)
  - Add `ProfileSchema` Colyseus schema with:
    - `displayName: string`
    - `status: UserStatus`
    - `bio: string`
    - `avatarUrl: string`
    - `lastSeen: number`
  - Add profile to `EntitySchema.meta` or as separate schema
  - Update client to display status indicators
  - Add AIC endpoint `/aic/v0.1/profile/update` for status changes

  **Must NOT do**:
  - Do not implement avatar upload (just URL reference)
  - Do not break existing EntitySchema serialization

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
  - Reason: Involves both server schema and client UI display

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 7 (chat needs status)
  - **Blocked By**: None

  **References**:
  - `packages/server/src/schemas/EntitySchema.ts:48-96` - Current entity structure
  - `packages/client/src/game/scenes/GameScene.ts` - Where to add status display
  - `packages/server/src/aic/router.ts` - AIC endpoint pattern

  **Acceptance Criteria**:
  - [ ] Profile schema created and integrated
  - [ ] Status changes sync to all clients
  - [ ] Status indicator visible in client (colored dot or icon)
  - [ ] AIC endpoint works: `POST /aic/v0.1/profile/update`

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Update profile via AIC API
    Tool: Bash (curl)
    Steps:
      1. Register agent: POST /aic/v0.1/register
      2. POST /aic/v0.1/profile/update {"status": "FOCUS", "bio": "Testing"}
      3. Assert: HTTP 200, status updated
      4. POST /aic/v0.1/observe
      5. Assert: self.meta contains updated status
    Expected Result: Profile updates persist and sync
    Evidence: Response bodies captured

  Scenario: Status displays in client
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:5173
      2. Wait for game load
      3. Assert: Status indicator element exists for player entity
    Expected Result: Status UI visible
    Evidence: Screenshot .sisyphus/evidence/task-3-status-display.png
  ```

  **Commit**: YES
  - Message: `feat(identity): add profile and status system with presence display`
  - Files: `packages/server/src/schemas/ProfileSchema.ts`, `packages/server/src/aic/handlers/profileUpdate.ts`, client UI files

---

### Wave 2: Core Systems

- [ ] 4. Zone System Schema + Detection

  **What to do**:
  - Create `ZoneSchema` Colyseus schema with:
    - `id: ZoneId`
    - `name: string`
    - `bounds: { x, y, width, height }`
    - `maxOccupancy: number`
    - `currentOccupancy: number`
  - Add `zones: MapSchema<ZoneSchema>` to `RoomState`
  - Create `ZoneSystem` class that:
    - Detects which zone entity is in based on position
    - Emits `zone.enter` and `zone.exit` events
    - Updates entity's current zone in state
  - Integrate into GameRoom tick loop

  **Must NOT do**:
  - Do not implement zone-specific features yet (later tasks)
  - Do not create actual map files yet (Task 8)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: []
  - Reason: Core system design, performance-critical tick loop integration

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7)
  - **Blocks**: Tasks 8, 9, 19
  - **Blocked By**: Task 2

  **References**:
  - `packages/server/src/proximity/ProximitySystem.ts` - Similar system pattern
  - `packages/server/src/rooms/GameRoom.ts:230-268` - Tick loop integration
  - `packages/server/src/events/EventLog.ts` - Event emission pattern

  **Acceptance Criteria**:
  - [ ] `ZoneSchema` created and added to `RoomState`
  - [ ] `ZoneSystem` detects zone changes
  - [ ] `zone.enter` and `zone.exit` events emitted
  - [ ] Entity state includes current zone

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Zone detection triggers events
    Tool: Bash (curl)
    Steps:
      1. Register agent
      2. Move agent to known zone coordinates
      3. Poll events with sinceCursor
      4. Assert: zone.enter event received
    Expected Result: Zone events fire on movement
    Evidence: Event payload captured

  Scenario: Entity state includes zone
    Tool: Bash (curl)
    Steps:
      1. Register agent in lobby zone
      2. POST /aic/v0.1/observe
      3. Assert: self.meta.currentZone === "lobby"
    Expected Result: Zone in entity state
    Evidence: Observe response captured
  ```

  **Commit**: YES
  - Message: `feat(zones): add zone detection system with enter/exit events`
  - Files: `packages/server/src/schemas/ZoneSchema.ts`, `packages/server/src/systems/ZoneSystem.ts`

---

- [ ] 5. Organization/Team/Role Schema

  **What to do**:
  - Create Colyseus schemas:
    - `OrganizationSchema`: id, name, ownerId, createdAt, settings
    - `TeamSchema`: id, orgId, name, description, members (MapSchema)
    - `TeamMemberSchema`: entityId, role (OrgRole), joinedAt
  - Add `organizations: MapSchema<OrganizationSchema>` to RoomState
  - Add `teams: MapSchema<TeamSchema>` to RoomState
  - Create `OrganizationSystem` for managing org/team state
  - Add helper methods: `getEntityOrg()`, `getEntityTeam()`, `getEntityRole()`

  **Must NOT do**:
  - Do not implement org CRUD endpoints yet (Task 23)
  - Do not implement invitations yet (Task 23)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: []
  - Reason: Complex relational data model, must be well-designed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6, 7)
  - **Blocks**: Tasks 6, 11, 15, 16
  - **Blocked By**: Task 2

  **References**:
  - `packages/server/src/schemas/RoomState.ts` - How to add new MapSchemas
  - `packages/server/src/schemas/EntitySchema.ts` - Schema patterns
  - `packages/shared/src/types.ts` - Organization/Team types from Task 2

  **Acceptance Criteria**:
  - [ ] All org/team schemas created
  - [ ] Schemas added to RoomState
  - [ ] Helper methods work correctly
  - [ ] Org membership syncs to clients

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Org state syncs to client
    Tool: Bash (curl)
    Steps:
      1. Manually add org to room state (test helper)
      2. Observe room state
      3. Assert: organizations map contains org
    Expected Result: Org data visible in state
    Evidence: State snapshot captured
  ```

  **Commit**: YES
  - Message: `feat(org): add organization and team schemas with role system`
  - Files: `packages/server/src/schemas/Org*.ts`, `packages/server/src/systems/OrganizationSystem.ts`

---

- [ ] 6. Permission System

  **What to do**:
  - Create `PermissionService` class with methods:
    - `canEditBoard(entityId, boardId): boolean`
    - `canCreateMeeting(entityId, orgId): boolean`
    - `canInviteToTeam(entityId, teamId): boolean`
    - `canModerateChat(entityId, channelId): boolean`
  - Permission rules based on OrgRole:
    - Owner: All permissions
    - Admin: All except delete org, transfer ownership
    - Member: View + limited edit (own items)
    - Guest: View only
  - Integrate permission checks into handlers

  **Must NOT do**:
  - Do not implement custom permission overrides
  - Do not add permission UI (client handles gracefully)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: []
  - Reason: Security-critical, must be correct

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 7)
  - **Blocks**: Tasks 15, 16, 23
  - **Blocked By**: Task 5

  **References**:
  - `packages/server/src/aic/middleware/auth.ts` - Existing auth pattern
  - Task 5 output - Org/Team/Role schemas

  **Acceptance Criteria**:
  - [ ] PermissionService created with all methods
  - [ ] Role-based logic correctly implemented
  - [ ] Unit tests for permission rules

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Guest cannot edit board
    Tool: Bash (test runner)
    Steps:
      1. Run: pnpm test tests/unit/permission.test.ts
      2. Assert: "guest cannot edit" test passes
    Expected Result: Permission denials work
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(auth): add role-based permission system`
  - Files: `packages/server/src/services/PermissionService.ts`, `tests/unit/permission.test.ts`

---

- [ ] 7. Extended Chat Channels

  **What to do**:
  - Extend `ChatChannel` type: `proximity | global | team | meeting | dm`
  - Update `ChatSystem` to support:
    - Team channels (org-specific)
    - Meeting channels (room-specific)
    - Direct messages (entity-to-entity)
  - Add emotes/reactions: `:thumbsup:`, `:heart:`, etc.
  - Update `chatSend` handler to validate channel access
  - Add `chatObserve` support for new channels

  **Must NOT do**:
  - Do not implement rich text/markdown
  - Do not implement message editing/deletion

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
  - Reason: Server + client work, chat UI updates

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6)
  - **Blocks**: Task 13
  - **Blocked By**: Tasks 2, 3

  **References**:
  - `packages/server/src/chat/ChatSystem.ts` - Current implementation
  - `packages/server/src/aic/handlers/chatSend.ts` - Handler pattern
  - `packages/shared/src/schemas.ts:151-164` - Chat schemas

  **Acceptance Criteria**:
  - [ ] All 5 channel types work
  - [ ] Team chat requires team membership
  - [ ] DM requires both parties online
  - [ ] Emotes render correctly

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Team chat only visible to team members
    Tool: Bash (curl)
    Steps:
      1. Register agent A (team member)
      2. Register agent B (not in team)
      3. Agent A sends team chat
      4. Agent B chatObserve team channel
      5. Assert: Agent B receives empty or forbidden
    Expected Result: Team isolation works
    Evidence: Chat responses captured
  ```

  **Commit**: YES
  - Message: `feat(chat): extend chat system with team, meeting, dm channels and emotes`
  - Files: `packages/server/src/chat/ChatSystem.ts`, `packages/shared/src/types.ts`, handlers

---

### Wave 3: Zone Implementation

- [ ] 8. 5 Zone Map Definitions

  **What to do**:
  - Create Tiled JSON maps for each zone in `world/packs/base/maps/`:
    - `lobby.json` - Entrance area with reception desk, gates
    - `office.json` - Work area with desks, kanban boards, notices
    - `meeting-center.json` - Meeting room entrances, booking kiosk
    - `lounge-cafe.json` - Relaxation area with cafe counter, seating
    - `arcade.json` - Game machines, event stage
  - Each map includes:
    - Tile layers (floor, walls, furniture)
    - Object layer with collision
    - Object layer with spawn points
    - Object layer with interactive objects (marked with `type` property)

  **Must NOT do**:
  - Do not create actual tileset images (use existing or placeholders)
  - Do not implement facility interactions yet (Task 21)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
  - Reason: Map design requires spatial thinking

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential within wave)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 1, 4

  **References**:
  - Existing lobby map in `packages/server/assets/maps/`
  - `packages/shared/src/types.ts:376-448` - MapData types
  - `packages/server/src/map/MapLoader.ts` - How maps are loaded

  **Acceptance Criteria**:
  - [ ] All 5 zone maps created with valid Tiled JSON format
  - [ ] Each map has collision layer
  - [ ] Each map has spawn points
  - [ ] Interactive objects have `type` property

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Maps load without error
    Tool: Bash
    Steps:
      1. Create test that loads each map via MapLoader
      2. pnpm test tests/unit/map-loading.test.ts
      3. Assert: All 5 maps load successfully
    Expected Result: Maps valid and loadable
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(maps): add 5 zone map definitions for work-life world`
  - Files: `world/packs/base/maps/*.json`

---

- [ ] 9. Zone Transition Logic

  **What to do**:
  - Implement zone transition in `ZoneSystem`:
    - Detect when entity moves between zones
    - Handle zone entry/exit logic
    - Update entity's `currentZone` in state
  - Add zone gates/doors as transition points
  - Handle edge cases (teleportation, spawn)
  - Broadcast zone population changes

  **Must NOT do**:
  - Do not implement meeting room transitions (Task 12)
  - Do not add zone-specific abilities/restrictions

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: []
  - Reason: State machine logic, edge cases

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after Task 8)
  - **Blocks**: Tasks 10, 11
  - **Blocked By**: Tasks 4, 8

  **References**:
  - Task 4 output - ZoneSystem base
  - Task 8 output - Zone maps
  - `packages/server/src/movement/MovementSystem.ts` - Movement patterns

  **Acceptance Criteria**:
  - [ ] Zone transitions trigger correctly
  - [ ] Zone population counts accurate
  - [ ] Edge cases handled (spawn in zone, teleport)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Walking between zones triggers events
    Tool: Bash (curl)
    Steps:
      1. Register agent in lobby
      2. Move to office zone coordinates
      3. Poll events
      4. Assert: zone.exit (lobby) and zone.enter (office) events
    Expected Result: Transitions logged
    Evidence: Event payloads captured
  ```

  **Commit**: YES
  - Message: `feat(zones): implement zone transition logic with gates`
  - Files: `packages/server/src/systems/ZoneSystem.ts`

---

- [ ] 10. Interactive Facilities Base

  **What to do**:
  - Create `FacilitySchema` Colyseus schema:
    - `id`, `type`, `zoneId`, `position`, `state`, `affordances`
  - Create `FacilitySystem` base class:
    - `onInteract(entityId, action, params)`
    - `getAffordances(entityId)` - returns available actions
    - `setState(key, value)` - server-authoritative state
  - Register facilities from world pack on room creation
  - Integrate with existing `interact` handler

  **Must NOT do**:
  - Do not implement specific facilities yet (Task 21)
  - Do not add facility-specific UI

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: []
  - Reason: Extensible system design

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after Task 9)
  - **Blocks**: Task 21
  - **Blocked By**: Task 9

  **References**:
  - `packages/server/src/aic/handlers/interact.ts` - Current interact handler
  - `packages/shared/src/types.ts:65-81` - Affordance types

  **Acceptance Criteria**:
  - [ ] FacilitySchema created
  - [ ] FacilitySystem base class works
  - [ ] Facilities load from world pack
  - [ ] Interact handler routes to facility system

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Interact returns facility affordances
    Tool: Bash (curl)
    Steps:
      1. Observe nearby - find facility object
      2. Assert: affords array contains facility actions
    Expected Result: Affordances visible
    Evidence: Observe response captured
  ```

  **Commit**: YES
  - Message: `feat(facilities): add base facility system with affordances`
  - Files: `packages/server/src/schemas/FacilitySchema.ts`, `packages/server/src/systems/FacilitySystem.ts`

---

### Wave 4: Meeting System

- [ ] 11. MeetingRoom Schema + Room Class

  **What to do**:
  - Create `MeetingRoomState` Colyseus schema:
    - `roomId`, `orgId`, `name`, `capacity`
    - `participants: MapSchema<MeetingParticipant>`
    - `agenda: MeetingAgenda`
    - `whiteboard: Whiteboard`
    - `activeVote: Vote | null`
  - Create `MeetingRoom` class extending Colyseus Room:
    - `onCreate(options)` - initialize from reservation
    - `onJoin(client)` - add participant
    - `onLeave(client)` - remove participant
    - `onDispose()` - cleanup and log
  - Register room type in `app.config.ts`

  **Must NOT do**:
  - Do not implement agenda/whiteboard/voting logic yet (Tasks 14, 17, 18)
  - Do not implement reservation system yet (Task 12)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: []
  - Reason: New Colyseus room type, must match patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 12, 13, 14, 15, 17, 18
  - **Blocked By**: Tasks 5, 9

  **References**:
  - `packages/server/src/rooms/GameRoom.ts` - Existing room pattern
  - `packages/server/src/app.config.ts` - Room registration
  - Task 5 output - Org schemas

  **Acceptance Criteria**:
  - [ ] MeetingRoom class created
  - [ ] Room registered in app.config
  - [ ] Participants sync correctly
  - [ ] Room disposes when empty

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Meeting room creates and disposes
    Tool: Bash (test)
    Steps:
      1. pnpm test tests/integration/meeting-room.test.ts
      2. Assert: Room creates with options
      3. Assert: Room disposes when last client leaves
    Expected Result: Lifecycle works
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(meeting): add MeetingRoom colyseus room class`
  - Files: `packages/server/src/rooms/MeetingRoom.ts`, `packages/server/src/schemas/MeetingRoomState.ts`

---

- [ ] 12. Meeting Lifecycle (create/reserve/join/leave)

  **What to do**:
  - Create `MeetingService` with:
    - `createReservation(orgId, meetingRoomId, startTime, endTime, creatorId)`
    - `cancelReservation(reservationId, userId)`
    - `getReservations(meetingRoomId, date)`
  - Implement room transitions:
    - Player approaches meeting door → show join option
    - Player joins → spawn in meeting room instance
    - Player leaves → return to main world at door position
  - Add reservations to persistence snapshots

  **Must NOT do**:
  - Do not implement recurring meetings
  - Do not implement meeting reminders

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: []
  - Reason: Complex state coordination between rooms

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 13, 14)
  - **Blocks**: Tasks 23, 28
  - **Blocked By**: Task 11

  **References**:
  - Task 11 output - MeetingRoom
  - Colyseus docs on room switching
  - `packages/server/src/rooms/GameRoom.ts:191-217` - Join/leave handling

  **Acceptance Criteria**:
  - [ ] Reservations persist and validate
  - [ ] Join transitions player to meeting room
  - [ ] Leave returns player to main world
  - [ ] Reservation prevents double-booking

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Full meeting lifecycle
    Tool: Bash (curl)
    Steps:
      1. Create reservation via API
      2. Join meeting room
      3. Observe meeting room state
      4. Leave meeting
      5. Observe back in main world
    Expected Result: Seamless transitions
    Evidence: State transitions captured
  ```

  **Commit**: YES
  - Message: `feat(meeting): implement full meeting lifecycle with reservations`
  - Files: `packages/server/src/services/MeetingService.ts`, handlers

---

- [ ] 13. Meeting Chat Channel

  **What to do**:
  - Add `meeting` channel to ChatSystem
  - Meeting chat only visible to meeting participants
  - Chat history persists for meeting duration
  - On meeting end, optionally save transcript

  **Must NOT do**:
  - Do not implement audio/video
  - Do not implement screen sharing

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Extension of existing chat system

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 12, 14)
  - **Blocks**: Task 28
  - **Blocked By**: Tasks 7, 11

  **References**:
  - Task 7 output - Extended chat
  - Task 11 output - MeetingRoom

  **Acceptance Criteria**:
  - [ ] Meeting chat works for participants
  - [ ] Non-participants cannot see meeting chat
  - [ ] Chat syncs in real-time

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Meeting chat isolated
    Tool: Bash (curl)
    Steps:
      1. Two agents join meeting
      2. Agent A sends meeting chat
      3. Agent B receives message
      4. Agent C (outside meeting) cannot observe
    Expected Result: Chat isolation works
    Evidence: Chat responses captured
  ```

  **Commit**: YES
  - Message: `feat(meeting): add meeting-scoped chat channel`
  - Files: `packages/server/src/chat/ChatSystem.ts`, `packages/server/src/rooms/MeetingRoom.ts`

---

- [ ] 14. Meeting Agenda System

  **What to do**:
  - Create `AgendaSchema`:
    - `items: MapSchema<AgendaItemSchema>`
    - `currentItemIndex: number`
  - Create `AgendaItemSchema`:
    - `id`, `title`, `description`, `duration`, `completed`
  - Add agenda management to MeetingRoom:
    - `addAgendaItem(item)`
    - `completeItem(itemId)`
    - `nextItem()`
  - Sync agenda state to all participants

  **Must NOT do**:
  - Do not implement time tracking
  - Do not implement item voting (separate system)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Simple state management

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 12, 13)
  - **Blocks**: Task 28
  - **Blocked By**: Task 11

  **References**:
  - Task 11 output - MeetingRoomState

  **Acceptance Criteria**:
  - [ ] Agenda items CRUD works
  - [ ] Current item highlighting
  - [ ] Completion state syncs

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Agenda item completion syncs
    Tool: Bash (curl)
    Steps:
      1. Join meeting with agenda
      2. Mark item complete
      3. Other participant observes
      4. Assert: Item shows completed
    Expected Result: Real-time sync
    Evidence: State captured
  ```

  **Commit**: YES
  - Message: `feat(meeting): add meeting agenda system`
  - Files: `packages/server/src/schemas/AgendaSchema.ts`

---

### Wave 5: Work Tools

- [ ] 15. Kanban Board System

  **What to do**:
  - Create Colyseus schemas:
    - `KanbanBoardSchema`: id, orgId, name, columns
    - `KanbanColumnSchema`: id, name, order, cards
    - `KanbanCardSchema`: id, title, description, columnId, order, createdBy
  - Add boards to RoomState
  - Implement operations:
    - `createBoard`, `createColumn`, `createCard`
    - `moveCard(cardId, toColumnId, order)`
    - `updateCard`, `deleteCard`
  - Permission: Admin/Owner create boards, Members create cards

  **Must NOT do**:
  - Do not implement assignees, due dates (deferred)
  - Do not implement card attachments

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
  - Reason: Server + client drag-drop UI

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 16, 17, 18)
  - **Blocks**: Task 28
  - **Blocked By**: Tasks 6, 11

  **References**:
  - Task 2 output - Kanban types
  - Task 6 output - Permission system

  **Acceptance Criteria**:
  - [ ] Boards sync in real-time
  - [ ] Card drag-drop works
  - [ ] Permission enforcement works
  - [ ] Board visible in office zone

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Card movement syncs
    Tool: Playwright
    Steps:
      1. Open two browser windows
      2. Both view same board
      3. Client A drags card to Done
      4. Assert: Client B sees card in Done
    Expected Result: Real-time sync
    Evidence: Screenshots captured
  ```

  **Commit**: YES
  - Message: `feat(work): add kanban board system with real-time sync`
  - Files: `packages/server/src/schemas/Kanban*.ts`, `packages/client/src/ui/KanbanBoard.ts`

---

- [ ] 16. Team Notices System

  **What to do**:
  - Create `NoticeSchema`:
    - `id`, `teamId`, `title`, `content`, `authorId`, `createdAt`, `pinned`
  - Add notices to RoomState per team
  - Implement operations:
    - `createNotice`, `updateNotice`, `deleteNotice`, `pinNotice`
  - Display notices on notice board facility
  - Permission: Admin/Owner post, Members view

  **Must NOT do**:
  - Do not implement notice comments
  - Do not implement notice expiration

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
  - Reason: Server + client notice board UI

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 15, 17, 18)
  - **Blocks**: Task 28
  - **Blocked By**: Task 6

  **References**:
  - Task 2 output - Notice types
  - Task 6 output - Permissions

  **Acceptance Criteria**:
  - [ ] Notices sync to team members
  - [ ] Pinned notices show first
  - [ ] Notice board interaction works

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Notice visible on board
    Tool: Bash (curl)
    Steps:
      1. Create notice via API
      2. Interact with notice board facility
      3. Assert: Notice in response
    Expected Result: Notice visible
    Evidence: Response captured
  ```

  **Commit**: YES
  - Message: `feat(work): add team notices system`
  - Files: `packages/server/src/schemas/NoticeSchema.ts`

---

- [ ] 17. Whiteboard (Sticky Notes)

  **What to do**:
  - Create `WhiteboardSchema`:
    - `id`, `meetingRoomId`, `notes: MapSchema<StickyNoteSchema>`
  - Create `StickyNoteSchema`:
    - `id`, `x`, `y`, `text`, `color`, `authorId`
  - Implement operations:
    - `addNote(x, y, text, color)`
    - `moveNote(noteId, x, y)`
    - `updateNote(noteId, text)`
    - `deleteNote(noteId)`
  - Grid-based positioning

  **Must NOT do**:
  - Do not implement freeform drawing
  - Do not implement rich text in notes

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
  - Reason: Interactive drag-drop canvas UI

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 15, 16, 18)
  - **Blocks**: Task 28
  - **Blocked By**: Task 11

  **References**:
  - Task 11 output - MeetingRoomState

  **Acceptance Criteria**:
  - [ ] Sticky notes add/move/delete
  - [ ] Real-time sync between participants
  - [ ] Grid snapping works
  - [ ] Color selection works

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Whiteboard collaboration
    Tool: Playwright
    Steps:
      1. Two clients in same meeting
      2. Client A adds sticky note at (1,1)
      3. Assert: Client B sees note at (1,1)
    Expected Result: Real-time sync
    Evidence: Screenshots captured
  ```

  **Commit**: YES
  - Message: `feat(meeting): add sticky note whiteboard`
  - Files: `packages/server/src/schemas/WhiteboardSchema.ts`, client UI

---

- [ ] 18. Voting System

  **What to do**:
  - Create `VoteSchema`:
    - `id`, `meetingRoomId`, `question`, `options`, `anonymous`
    - `casts: MapSchema<VoteCastSchema>`
    - `status: pending | active | closed`
  - Create `VoteCastSchema`:
    - `voterId` (null if anonymous), `optionId`, `castedAt`
  - Implement operations:
    - `createVote(question, options, anonymous)`
    - `castVote(voteId, optionId)`
    - `closeVote(voteId)`
  - Show results after vote closes

  **Must NOT do**:
  - Do not implement weighted voting
  - Do not implement vote delegation

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
  - Reason: Server + voting UI

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 15, 16, 17)
  - **Blocks**: Task 28
  - **Blocked By**: Task 11

  **References**:
  - Task 2 output - Vote types

  **Acceptance Criteria**:
  - [ ] Vote creation works
  - [ ] Vote casting works (one per user)
  - [ ] Anonymous mode hides voter IDs
  - [ ] Results show after close

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Vote and results
    Tool: Bash (curl)
    Steps:
      1. Create vote with 2 options
      2. Two participants cast votes
      3. Close vote
      4. Assert: Results show vote counts
    Expected Result: Voting works
    Evidence: Response captured
  ```

  **Commit**: YES
  - Message: `feat(meeting): add voting system with anonymous option`
  - Files: `packages/server/src/schemas/VoteSchema.ts`

---

### Wave 6: NPCs & Facilities

- [ ] 19. NPC FSM Base System

  **What to do**:
  - Create `NPCSystem` with FSM support:
    - States: idle, walking, talking, working, break
    - Transitions based on time, proximity, triggers
  - Create `NPCSchema`:
    - `id`, `definitionId`, `currentState`, `position`, `facing`
    - `dialogueState`, `schedule`
  - NPCs use SeededRandom for deterministic behavior
  - NPCs emit events when state changes

  **Must NOT do**:
  - Do not implement LLM dialogue
  - Do not implement complex pathfinding (simple A\* sufficient)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: []
  - Reason: FSM design, determinism requirements

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 6
  - **Blocks**: Task 20
  - **Blocked By**: Task 4

  **References**:
  - `packages/server/src/replay/seeded-random.ts` - Determinism pattern
  - `packages/server/src/movement/MovementSystem.ts` - Movement patterns

  **Acceptance Criteria**:
  - [ ] FSM states transition correctly
  - [ ] NPC behavior is deterministic with same seed
  - [ ] NPCs emit state change events

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: NPC FSM deterministic
    Tool: Bash (test)
    Steps:
      1. Run NPC simulation with seed 12345 twice
      2. Compare state sequences
      3. Assert: Identical behavior
    Expected Result: Deterministic
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(npc): add FSM-based NPC behavior system`
  - Files: `packages/server/src/systems/NPCSystem.ts`

---

- [ ] 20. 10 NPC Definitions

  **What to do**:
  - Create NPC definitions in `world/packs/base/npcs/`:
    1. Receptionist (lobby) - welcomes, directs
    2. Security Guard (lobby) - gate access
    3. Barista (lounge-cafe) - serves drinks
    4. IT Help (office) - tech support dialogue
    5. PM (office) - project management tips
    6. HR (office) - onboarding info
    7. Sales Rep (office) - company info
    8. Event Host (arcade) - announces events
    9. Tutorial Guide (lobby) - new player help
    10. Quest Giver (arcade) - daily tasks
  - Each NPC has: schedule, dialogue tree, position, sprite

  **Must NOT do**:
  - Do not implement quest system (just dialogue hints)
  - Do not implement NPC trading

  **Recommended Agent Profile**:
  - **Category**: `artistry`
  - **Skills**: []
  - Reason: Creative content, dialogue writing

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 6 (after Task 19)
  - **Blocks**: Task 21
  - **Blocked By**: Tasks 1, 19

  **References**:
  - Task 1 output - World pack structure
  - Task 19 output - NPCSystem

  **Acceptance Criteria**:
  - [ ] All 10 NPCs defined
  - [ ] Each has valid dialogue tree
  - [ ] Schedules defined for time-based behavior
  - [ ] NPCs spawn in correct zones

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: NPCs visible in zones
    Tool: Bash (curl)
    Steps:
      1. Observe lobby zone
      2. Assert: Receptionist, Guard, Tutorial Guide visible
      3. Observe office zone
      4. Assert: PM, HR, IT Help visible
    Expected Result: NPCs in zones
    Evidence: Observe responses captured
  ```

  **Commit**: YES
  - Message: `feat(npc): add 10 NPC definitions with schedules and dialogue`
  - Files: `world/packs/base/npcs/*.json`

---

- [ ] 21. 6 Interactive Facilities

  **What to do**:
  - Implement facility handlers extending `FacilitySystem`:
    1. Reception Desk - check-in, org info
    2. Gate - access control based on permissions
    3. Meeting Door - enter/exit meeting rooms
    4. Whiteboard - links to meeting whiteboard
    5. Voting Kiosk - view active votes
    6. Cafe Counter - "order" interaction (cosmetic)
  - Each facility has affordances based on permissions

  **Must NOT do**:
  - Do not implement facility customization
  - Do not implement facility upgrades

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
  - Reason: Interaction handlers + visual feedback

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6 (with Task 22)
  - **Blocks**: Task 28
  - **Blocked By**: Tasks 10, 20

  **References**:
  - Task 10 output - FacilitySystem

  **Acceptance Criteria**:
  - [ ] All 6 facilities interactable
  - [ ] Affordances match permissions
  - [ ] Visual feedback on interaction

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Gate denies non-members
    Tool: Bash (curl)
    Steps:
      1. Register non-member agent
      2. Interact with gate (action: "enter")
      3. Assert: Response is "denied" or "forbidden"
    Expected Result: Access control works
    Evidence: Response captured
  ```

  **Commit**: YES
  - Message: `feat(facilities): add 6 interactive facility implementations`
  - Files: `packages/server/src/facilities/*.ts`

---

- [ ] 22. Safety System (report/block/mute)

  **What to do**:
  - Create `SafetyService` with:
    - `reportUser(reporterId, targetId, reason, details)`
    - `blockUser(blockerId, targetId)`
    - `unblockUser(blockerId, targetId)`
    - `muteUser(muterId, targetId, durationMs)`
  - Store safety data in memory + snapshots
  - Blocked users don't see each other's messages
  - Muted users can't send chat

  **Must NOT do**:
  - Do not implement admin moderation panel
  - Do not implement auto-moderation

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: []
  - Reason: Security-critical, privacy considerations

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6 (with Task 21)
  - **Blocks**: Tasks 25, 28
  - **Blocked By**: Task 2

  **References**:
  - Task 2 output - Safety types

  **Acceptance Criteria**:
  - [ ] Reports stored with timestamp
  - [ ] Block prevents message visibility
  - [ ] Mute prevents sending
  - [ ] Data persists in snapshots

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Block hides messages
    Tool: Bash (curl)
    Steps:
      1. Agent A blocks Agent B
      2. Agent B sends global chat
      3. Agent A observes chat
      4. Assert: Message from B not visible to A
    Expected Result: Block works
    Evidence: Chat observe responses captured
  ```

  **Commit**: YES
  - Message: `feat(safety): add report, block, mute system`
  - Files: `packages/server/src/services/SafetyService.ts`

---

### Wave 7: AIC API & Persistence

- [ ] 23. AIC API Extensions (~15 endpoints)

  **What to do**:
  - Add new endpoints to `/aic/v0.1/`:
    - Organization: `org/create`, `org/invite`, `org/join`, `org/leave`
    - Team: `team/create`, `team/join`
    - Meeting: `meeting/reserve`, `meeting/join`, `meeting/leave`
    - Board: `board/create`, `board/update`, `card/create`, `card/move`
    - Notice: `notice/create`, `notice/list`
    - Safety: `report`, `block`, `mute`
  - All endpoints follow existing patterns:
    - Rate limiter, validation, auth, handler
  - Update plugin package with new client methods

  **Must NOT do**:
  - Do not break existing 7 endpoints
  - Do not add endpoints without Zod validation

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: []
  - Reason: API design, consistent patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 7 (with Tasks 24, 25, 26)
  - **Blocks**: Task 28
  - **Blocked By**: Tasks 6, 12

  **References**:
  - `packages/server/src/aic/router.ts` - Existing endpoints
  - `packages/plugin/src/client.ts` - Plugin client

  **Acceptance Criteria**:
  - [ ] All ~15 new endpoints implemented
  - [ ] Existing 7 endpoints unchanged
  - [ ] All endpoints have contract tests
  - [ ] Plugin client updated

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: New endpoints work
    Tool: Bash (curl)
    Steps:
      1. Call each new endpoint
      2. Assert: Valid response
    Expected Result: All endpoints functional
    Evidence: Responses captured
  ```

  **Commit**: YES
  - Message: `feat(aic): add 15+ new API endpoints for work-life features`
  - Files: `packages/server/src/aic/handlers/*.ts`, `packages/plugin/src/client.ts`

---

- [ ] 24. Persistence Layer (snapshots)

  **What to do**:
  - Create `PersistenceService` with:
    - `saveSnapshot(roomId)` - serialize room state to JSON
    - `loadSnapshot(roomId)` - restore from JSON
    - `autoSave(intervalMs)` - periodic snapshots
  - Snapshot includes:
    - Organizations, teams, members
    - Boards, notices, agenda
    - Meeting reservations
    - Entity profiles
  - Save on graceful shutdown
  - Load on room creation if snapshot exists

  **Must NOT do**:
  - Do not implement SQLite (deferred)
  - Do not implement incremental updates

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: []
  - Reason: Data integrity, serialization

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 7 (with Tasks 23, 25, 26)
  - **Blocks**: Task 28
  - **Blocked By**: Task 11

  **References**:
  - Colyseus schema serialization
  - `packages/server/src/rooms/GameRoom.ts:219-228` - Dispose handling

  **Acceptance Criteria**:
  - [ ] Snapshots save to file
  - [ ] Snapshots restore on restart
  - [ ] Auto-save works at interval
  - [ ] Graceful shutdown triggers save

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Persistence across restart
    Tool: Bash
    Steps:
      1. Create org, add data
      2. Trigger snapshot save
      3. Restart server
      4. Observe room state
      5. Assert: Org data restored
    Expected Result: Data persists
    Evidence: Before/after state captured
  ```

  **Commit**: YES
  - Message: `feat(persist): add in-memory snapshot persistence`
  - Files: `packages/server/src/services/PersistenceService.ts`

---

- [ ] 25. Audit Log System

  **What to do**:
  - Create `AuditLog` class extending `EventLog`:
    - Log safety events (reports, blocks, mutes)
    - Log permission-sensitive actions (org changes, kicks)
    - Log meeting activity (join, leave, votes)
  - Audit logs persist in snapshots
  - Add audit log to admin observation

  **Must NOT do**:
  - Do not implement log export
  - Do not implement log retention policy

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Extension of existing EventLog

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 7 (with Tasks 23, 24, 26)
  - **Blocks**: Task 28
  - **Blocked By**: Task 22

  **References**:
  - `packages/server/src/events/EventLog.ts` - Base class

  **Acceptance Criteria**:
  - [ ] Audit events logged
  - [ ] Audit log persists
  - [ ] Admin can observe audit log

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Safety actions logged
    Tool: Bash (curl)
    Steps:
      1. Report a user
      2. Query audit log
      3. Assert: Report event present
    Expected Result: Audit trail works
    Evidence: Audit log captured
  ```

  **Commit**: YES
  - Message: `feat(audit): add audit logging for safety and permissions`
  - Files: `packages/server/src/audit/AuditLog.ts`

---

- [ ] 26. Determinism Verification

  **What to do**:
  - Ensure all new systems use SeededRandom where applicable:
    - NPC behavior uses SeededRandom
    - Any random element uses SeededRandom
  - Create determinism test:
    - Record inputs for a session
    - Replay with same seed
    - Verify identical state sequence
  - Document which features are deterministic

  **Must NOT do**:
  - Do not make non-deterministic features deterministic if impossible
  - Mark clearly which are non-deterministic (e.g., real-time clock based)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: []
  - Reason: Testing methodology, edge cases

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 7 (with Tasks 23, 24, 25)
  - **Blocks**: Task 28
  - **Blocked By**: All systems

  **References**:
  - `packages/server/src/replay/seeded-random.ts`
  - `packages/server/src/replay/input-recorder.ts`

  **Acceptance Criteria**:
  - [ ] Determinism test passes
  - [ ] Non-deterministic features documented
  - [ ] SeededRandom used consistently

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Replay produces same state
    Tool: Bash (test)
    Steps:
      1. Record session with seed 42
      2. Replay with seed 42
      3. Compare final states
      4. Assert: States match
    Expected Result: Deterministic replay
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `test(determinism): verify replay consistency for new features`
  - Files: `tests/determinism/*.test.ts`

---

### Wave 8: E2E & Docs

- [ ] 27. Playwright E2E Setup

  **What to do**:
  - Install Playwright: `pnpm add -D @playwright/test`
  - Create `playwright.config.ts`
  - Create test helpers:
    - `startServers()` - start server + client
    - `createBrowser(name)` - create browser context
    - `registerAndJoin(browser, name)` - helper for agent registration
  - Create base page objects for game interaction

  **Must NOT do**:
  - Do not write actual test scenarios yet (Task 28)
  - Do not add CI integration yet (Task 31)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`playwright`]
  - Reason: Browser automation setup

  **Parallelization**:
  - **Can Run In Parallel**: YES (can start early)
  - **Parallel Group**: Wave 8 (can start in Wave 1)
  - **Blocks**: Task 28
  - **Blocked By**: None

  **References**:
  - `packages/client/vite.config.ts` - Client build
  - `tests/integration/test-server.ts` - Server helper pattern

  **Acceptance Criteria**:
  - [ ] Playwright installed and configured
  - [ ] Test helpers work
  - [ ] Can launch browser and load game

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Playwright can load game
    Tool: Bash
    Steps:
      1. npx playwright test tests/e2e/setup.test.ts
      2. Assert: Browser opens, game loads
    Expected Result: Setup works
    Evidence: Screenshot captured
  ```

  **Commit**: YES
  - Message: `test(e2e): add Playwright configuration and helpers`
  - Files: `playwright.config.ts`, `tests/e2e/helpers/*.ts`

---

- [ ] 28. Full E2E Scenario Test

  **What to do**:
  - Create Playwright test: `tests/e2e/full-scenario.test.ts`
  - Scenario:
    1. Client A creates organization
    2. Client A invites Client B
    3. Client B joins team
    4. Client A creates and reserves meeting
    5. Both clients enter meeting room
    6. Agenda is visible to both
    7. Vote is created, both vote
    8. Whiteboard sticky added
    9. Both exit meeting
    10. Team chat verified in main world

  **Must NOT do**:
  - Do not test edge cases (separate tests)
  - Do not flake on timing (use proper waits)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`playwright`]
  - Reason: Complex browser automation

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 8 (final)
  - **Blocks**: Tasks 29, 30
  - **Blocked By**: All previous tasks

  **References**:
  - Task 27 output - Playwright setup
  - All feature implementations

  **Acceptance Criteria**:
  - [ ] Full scenario test passes
  - [ ] All 10 steps verified
  - [ ] Screenshots at each step
  - [ ] Test runs in <2 minutes

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Full E2E test passes
    Tool: Bash
    Steps:
      1. npx playwright test tests/e2e/full-scenario.test.ts
      2. Assert: All steps pass
    Expected Result: E2E passes
    Evidence: Playwright report, screenshots
  ```

  **Commit**: YES
  - Message: `test(e2e): add full 2-client scenario test`
  - Files: `tests/e2e/full-scenario.test.ts`

---

- [ ] 29. Documentation

  **What to do**:
  - Create docs:
    - `docs/world-pack-creation.md` - How to create world packs
    - `docs/operations.md` - How to run, monitor, snapshot
    - `docs/demo-scenario.md` - Step-by-step demo script
    - `docs/api-extensions.md` - New AIC API endpoints
  - Update `README.md` with new features

  **Must NOT do**:
  - Do not document unimplemented features
  - Do not create API reference (use Zod schemas as reference)

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []
  - Reason: Technical writing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 8 (with Task 30)
  - **Blocks**: Task 31
  - **Blocked By**: Task 28

  **References**:
  - All implemented features

  **Acceptance Criteria**:
  - [ ] All 4 docs created
  - [ ] README updated
  - [ ] Docs accurate and complete

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Docs exist
    Tool: Bash
    Steps:
      1. ls docs/
      2. Assert: world-pack-creation.md, operations.md, demo-scenario.md, api-extensions.md exist
    Expected Result: Docs present
    Evidence: File list captured
  ```

  **Commit**: YES
  - Message: `docs: add work-life world documentation`
  - Files: `docs/*.md`, `README.md`

---

- [ ] 30. 3x Playtest Sessions

  **What to do**:
  - Conduct 3x 30-minute playtest sessions:
    1. Session 1: Basic flow (join, navigate zones, chat)
    2. Session 2: Org/meeting flow (create org, meeting, use tools)
    3. Session 3: Full scenario (complete demo script)
  - Document issues found in each session
  - Fix critical issues between sessions
  - Document improvements made

  **Must NOT do**:
  - Do not skip sessions
  - Do not ignore minor issues (document for future)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`playwright`]
  - Reason: Automated playtest with observation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 8 (with Task 29)
  - **Blocks**: Task 31
  - **Blocked By**: Task 28

  **References**:
  - Task 28 output - E2E test as base
  - Task 29 output - Demo scenario

  **Acceptance Criteria**:
  - [ ] 3 sessions completed
  - [ ] Issues documented per session
  - [ ] Critical issues fixed
  - [ ] Improvements logged

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Playtest sessions
    Tool: Playwright + manual observation
    Steps:
      1. Run automated playtest script
      2. Observe behavior
      3. Document issues in .sisyphus/playtest/session-{N}.md
    Expected Result: Sessions documented
    Evidence: Playtest logs
  ```

  **Commit**: YES
  - Message: `test(playtest): complete 3 playtest sessions with improvements`
  - Files: `.sisyphus/playtest/*.md`

---

- [ ] 31. CI Verification

  **What to do**:
  - Ensure all CI checks pass:
    - `pnpm lint` - no errors
    - `pnpm typecheck` - no errors
    - `pnpm test` - all tests pass (207+ existing + new)
    - Playwright E2E in CI (headless)
  - Update `.github/workflows/ci.yml` if needed
  - Verify on clean clone

  **Must NOT do**:
  - Do not skip flaky tests (fix them)
  - Do not disable checks

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Verification run

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 8 (final)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 29, 30

  **References**:
  - `.github/workflows/ci.yml`
  - `package.json` scripts

  **Acceptance Criteria**:
  - [ ] `pnpm lint` passes
  - [ ] `pnpm typecheck` passes
  - [ ] `pnpm test` passes (all tests)
  - [ ] CI workflow passes

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Full CI suite
    Tool: Bash
    Steps:
      1. pnpm lint && pnpm typecheck && pnpm test
      2. Assert: Exit code 0
      3. npx playwright test --reporter=github
      4. Assert: Exit code 0
    Expected Result: All pass
    Evidence: CI output captured
  ```

  **Commit**: YES
  - Message: `ci: verify all checks pass for work-life world`
  - Files: `.github/workflows/ci.yml` (if modified)

---

## Commit Strategy

| After Task | Message                                                                     | Files                    | Verification                             |
| ---------- | --------------------------------------------------------------------------- | ------------------------ | ---------------------------------------- |
| 1          | `feat(world): create base world pack directory structure`                   | world/packs/base/\*\*    | ls                                       |
| 2          | `feat(shared): add types and schemas for work-life world features`          | packages/shared/src/\*\* | pnpm typecheck                           |
| 3          | `feat(identity): add profile and status system with presence display`       | server + client          | pnpm test                                |
| 4          | `feat(zones): add zone detection system with enter/exit events`             | server/systems           | pnpm test                                |
| 5          | `feat(org): add organization and team schemas with role system`             | server/schemas           | pnpm test                                |
| 6          | `feat(auth): add role-based permission system`                              | server/services          | pnpm test                                |
| 7          | `feat(chat): extend chat system with team, meeting, dm channels and emotes` | server/chat              | pnpm test                                |
| 8          | `feat(maps): add 5 zone map definitions for work-life world`                | world/packs/base/maps    | pnpm test                                |
| 9          | `feat(zones): implement zone transition logic with gates`                   | server/systems           | pnpm test                                |
| 10         | `feat(facilities): add base facility system with affordances`               | server/systems           | pnpm test                                |
| 11         | `feat(meeting): add MeetingRoom colyseus room class`                        | server/rooms             | pnpm test                                |
| 12         | `feat(meeting): implement full meeting lifecycle with reservations`         | server/services          | pnpm test                                |
| 13         | `feat(meeting): add meeting-scoped chat channel`                            | server/chat              | pnpm test                                |
| 14         | `feat(meeting): add meeting agenda system`                                  | server/schemas           | pnpm test                                |
| 15         | `feat(work): add kanban board system with real-time sync`                   | server + client          | pnpm test                                |
| 16         | `feat(work): add team notices system`                                       | server/schemas           | pnpm test                                |
| 17         | `feat(meeting): add sticky note whiteboard`                                 | server + client          | pnpm test                                |
| 18         | `feat(meeting): add voting system with anonymous option`                    | server/schemas           | pnpm test                                |
| 19         | `feat(npc): add FSM-based NPC behavior system`                              | server/systems           | pnpm test                                |
| 20         | `feat(npc): add 10 NPC definitions with schedules and dialogue`             | world/packs/base/npcs    | pnpm test                                |
| 21         | `feat(facilities): add 6 interactive facility implementations`              | server/facilities        | pnpm test                                |
| 22         | `feat(safety): add report, block, mute system`                              | server/services          | pnpm test                                |
| 23         | `feat(aic): add 15+ new API endpoints for work-life features`               | server/aic + plugin      | pnpm test                                |
| 24         | `feat(persist): add in-memory snapshot persistence`                         | server/services          | pnpm test                                |
| 25         | `feat(audit): add audit logging for safety and permissions`                 | server/audit             | pnpm test                                |
| 26         | `test(determinism): verify replay consistency for new features`             | tests                    | pnpm test                                |
| 27         | `test(e2e): add Playwright configuration and helpers`                       | tests/e2e                | npx playwright                           |
| 28         | `test(e2e): add full 2-client scenario test`                                | tests/e2e                | npx playwright                           |
| 29         | `docs: add work-life world documentation`                                   | docs + README            | -                                        |
| 30         | `test(playtest): complete 3 playtest sessions with improvements`            | .sisyphus/playtest       | -                                        |
| 31         | `ci: verify all checks pass for work-life world`                            | .github/workflows        | pnpm lint && pnpm typecheck && pnpm test |

---

## Success Criteria

### Verification Commands

```bash
# All lint checks pass
pnpm lint

# All type checks pass
pnpm typecheck

# All unit/integration tests pass
pnpm test

# E2E test passes
npx playwright test tests/e2e/full-scenario.test.ts

# Verify existing tests still pass
pnpm test --reporter=verbose | grep -E "^[✓×]" | head -250
```

### Final Checklist

- [ ] IDENTITY: Profile/status system works
- [ ] ORG: Organization/Team/Role with permissions works
- [ ] SPACE: 5 zones navigable
- [ ] MEETING: Meeting rooms create/reserve/join/leave works
- [ ] WORK: Kanban, notices, agenda functional
- [ ] INTERACT: 6+ facilities interactable
- [ ] NPC: 10 NPCs with FSM behavior visible
- [ ] SOCIAL: Extended chat channels work
- [ ] SAFETY: Report/block/mute functional
- [ ] PERSIST: Snapshots save/restore
- [ ] AIC: All new endpoints work
- [ ] E2E: Full Playwright scenario passes
- [ ] DETERMINISM: Replay works with new features
- [ ] DOCS: All documentation complete
- [ ] PLAYTEST: 3x sessions completed
- [ ] CI: All checks pass
