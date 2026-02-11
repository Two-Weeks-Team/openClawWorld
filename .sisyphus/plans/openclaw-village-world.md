# OpenClaw Village World Implementation

## TL;DR

> **Quick Summary**: Implement production-ready village world with 6 zones (add Plaza), 12 NPCs (add meeting_host + arcade_host), 16 interaction points, and fix AIC API to expose affordances. TDD approach with foundation-first bundling.
>
> **Deliverables**:
>
> - Plaza zone (30x40 tiles) added to expanded 130x80 map
> - 2 new NPCs: meeting_host, arcade_host with schedules/dialogue
> - 16 facility interaction points across all zones
> - AIC observe endpoint returns facility affordances
> - E2E tests (Playwright + HTTP) for scenarios S1-S7
> - CI passing, Docker deployment ready
>
> **Estimated Effort**: Large (5 bundles, ~40 tasks)
> **Parallel Execution**: YES - 3 waves per bundle
> **Critical Path**: Types → Zone System → Maps → NPCs → Facilities → AIC → QA

---

## Context

### Original Request

Build a production-ready village-style world with 6 zones, 12 NPCs, 16 interactions, AIC affordance exposure, and comprehensive QA.

### Interview Summary

**Key Decisions**:

- Plaza location: Expand map to 130x80 tiles, Plaza (30x40) on right side
- Test strategy: TDD (tests before implementation)
- Bundle priority: Foundation-first (Types → Zones → NPCs → Interactions → QA)
- NPCs: 10 existing + 2 new (meeting_host, arcade_host) = 12 total

**Research Findings**:

- ZoneSystem has hardcoded DEFAULT_ZONE_BOUNDS - needs Plaza addition
- ZoneId type in shared/types.ts needs 'plaza' added
- FacilityType enum missing many required types (kanban_terminal, fountain, etc.)
- NpcRole enum missing meeting_host, arcade_host
- CRITICAL: observe.ts handler does NOT include facilities in nearby affordances!

### Gap Analysis (Self-Review)

**Identified Gaps** (addressed in plan):

- AIC observe returns empty affordances for facilities - Task 4.1 fixes this
- No facility handlers registered - Task 3.x adds handlers per facility type
- Map expansion affects collision grid calculations - Task 1.4 handles this
- Client needs to load new map data - Task 1.5 syncs client assets

---

## Work Objectives

### Core Objective

Deliver a fully-functional village world where AI agents can discover and interact with 16 facilities across 6 zones, with 12 NPCs providing ambient life.

### Concrete Deliverables

- `world/packs/base/maps/plaza.json` - New plaza zone map
- `world/packs/base/npcs/meeting-host.json` - New NPC definition
- `world/packs/base/npcs/arcade-host.json` - New NPC definition
- `packages/shared/src/types.ts` - Extended ZoneId, FacilityType, NpcRole
- `packages/server/src/zone/ZoneSystem.ts` - Plaza bounds added
- `packages/server/src/aic/handlers/observe.ts` - Facility affordances in response
- `tests/e2e/*.spec.ts` - Playwright E2E tests
- `tests/integration/*.test.ts` - API integration tests

### Definition of Done

- [ ] `pnpm test` passes with 100% of new tests green
- [ ] `pnpm typecheck` passes with no errors
- [ ] `pnpm lint` passes with no errors
- [ ] Docker build succeeds: `docker build -t openclaw .`
- [ ] AIC observe returns affordances for all 16 facility types
- [ ] All 12 NPCs spawn and transition states on schedule
- [ ] Playwright E2E tests pass for scenarios S1-S7

### Must Have

- Plaza zone with fountain interaction
- meeting_host NPC in meeting-center zone
- arcade_host NPC in arcade zone
- AIC observe returns `affords` array for nearby facilities
- TDD: All features have tests written first

### Must NOT Have (Guardrails)

- NO new sprite artwork - use existing SVG assets
- NO complex state machines beyond existing NpcState enum
- NO database persistence - keep in-memory state
- NO breaking changes to existing AIC API contract
- NO modification of existing NPC dialogue beyond pattern compliance
- NO premature optimization - focus on correctness first

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision

- **Infrastructure exists**: YES (Vitest configured)
- **Automated tests**: YES (TDD)
- **Framework**: Vitest for unit/integration, Playwright for E2E

### TDD Workflow Per Task

Each TODO follows RED-GREEN-REFACTOR:

1. **RED**: Write failing test first
   - Test file: `tests/{unit|integration|e2e}/*.test.ts`
   - Test command: `pnpm test [file]`
   - Expected: FAIL (test exists, implementation doesn't)
2. **GREEN**: Implement minimum code to pass
   - Command: `pnpm test [file]`
   - Expected: PASS
3. **REFACTOR**: Clean up while keeping green
   - Command: `pnpm test`
   - Expected: PASS (all tests)

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

| Type              | Tool                  | How Agent Verifies                |
| ----------------- | --------------------- | --------------------------------- |
| **API Endpoints** | Bash (curl)           | Send requests, assert status/body |
| **Game Client**   | Playwright            | Navigate, interact, screenshot    |
| **Server Logic**  | Vitest                | Run test suite, assert pass       |
| **Type Safety**   | Bash (pnpm typecheck) | Zero errors                       |

---

## Execution Strategy

### Bundle Overview

| Bundle | Name                       | Tasks   | Est. Effort | Dependencies |
| ------ | -------------------------- | ------- | ----------- | ------------ |
| B1     | Foundation (Types & Zones) | 1.1-1.6 | Medium      | None         |
| B2     | NPCs                       | 2.1-2.5 | Small       | B1           |
| B3     | Facilities & Interactions  | 3.1-3.8 | Large       | B1           |
| B4     | AIC Affordance Fix         | 4.1-4.3 | Medium      | B1, B3       |
| B5     | QA & Deployment            | 5.1-5.7 | Medium      | All          |

### Parallel Execution Waves

```
BUNDLE 1 - Foundation:
Wave 1.1 (Start Immediately):
├── Task 1.1: Extend shared types (ZoneId, FacilityType, NpcRole)
└── Task 1.2: Write zone system tests (TDD RED)

Wave 1.2 (After 1.1):
├── Task 1.3: Update ZoneSystem with Plaza bounds
├── Task 1.4: Create plaza.json map file
└── Task 1.5: Update manifest.json

Wave 1.3 (After 1.2):
└── Task 1.6: Sync client map assets & verify loading

BUNDLE 2 - NPCs (After B1):
Wave 2.1:
├── Task 2.1: Write NPC tests (TDD RED)
└── Task 2.2: Create meeting-host.json

Wave 2.2:
├── Task 2.3: Create arcade-host.json
└── Task 2.4: Update npcs/index.json

Wave 2.3:
└── Task 2.5: Verify NPC spawning in zones

BUNDLE 3 - Facilities (After B1, parallel with B2):
Wave 3.1:
├── Task 3.1: Write facility tests (TDD RED)
├── Task 3.2: Add lobby facilities (notice_board, onboarding_signpost, pond_edge)
└── Task 3.3: Add office facilities (kanban_terminal, printer, watercooler)

Wave 3.2:
├── Task 3.4: Add meeting facilities (schedule_kiosk, room doors, agenda_panel)
├── Task 3.5: Add lounge facilities (vending_machine - cafe_counter exists)
└── Task 3.6: Add arcade facilities (stage, game_table)

Wave 3.3:
├── Task 3.7: Add plaza facilities (fountain)
└── Task 3.8: Register all facility handlers

BUNDLE 4 - AIC Fix (After B3):
Wave 4.1:
├── Task 4.1: Write AIC observe affordance tests (TDD RED)
└── Task 4.2: Fix observe handler to include facilities

Wave 4.2:
└── Task 4.3: Verify AIC observe returns affordances

BUNDLE 5 - QA (After All):
Wave 5.1:
├── Task 5.1: E2E test S1 - Agent registration & observe
├── Task 5.2: E2E test S2 - Zone transitions
└── Task 5.3: E2E test S3 - Facility interactions

Wave 5.2:
├── Task 5.4: E2E test S4 - NPC proximity events
├── Task 5.5: E2E test S5 - Chat in zones
└── Task 5.6: E2E test S6 - Full scenario walkthrough

Wave 5.3:
└── Task 5.7: CI verification & Docker deployment
```

### Dependency Matrix

| Task    | Depends On    | Blocks                 | Can Parallelize With |
| ------- | ------------- | ---------------------- | -------------------- |
| 1.1     | None          | 1.2-1.6, 2.x, 3.x, 4.x | None                 |
| 1.2     | None          | 1.3                    | 1.1                  |
| 1.3     | 1.1, 1.2      | 1.6                    | 1.4, 1.5             |
| 1.4     | 1.1           | 1.6                    | 1.3, 1.5             |
| 1.5     | 1.1           | 1.6                    | 1.3, 1.4             |
| 1.6     | 1.3, 1.4, 1.5 | 2.x, 3.x               | None                 |
| 2.1-2.4 | 1.6           | 2.5                    | 3.1-3.7              |
| 3.1-3.7 | 1.6           | 3.8                    | 2.1-2.4              |
| 3.8     | 3.1-3.7       | 4.x                    | 2.5                  |
| 4.1-4.3 | 3.8           | 5.x                    | None                 |
| 5.1-5.7 | 4.3           | None                   | Within wave          |

---

## TODOs

---

### BUNDLE 1: Foundation (Types & Zones)

---

- [ ] 1.1. Extend shared types for plaza zone and new facilities/NPCs

  **What to do**:
  - Add 'plaza' to ZoneId union type
  - Add new FacilityType values: 'kanban_terminal', 'notice_board', 'onboarding_signpost', 'pond_edge', 'printer', 'watercooler', 'vending_machine', 'fountain', 'schedule_kiosk', 'agenda_panel', 'stage', 'game_table', 'room_door_a', 'room_door_b', 'room_door_c'
  - Add new NpcRole values: 'meeting_host', 'arcade_host'
  - Write type tests to verify exhaustive handling

  **Must NOT do**:
  - Do not modify existing type values
  - Do not add runtime validation (types only)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Type-only changes, low complexity, fast turnaround
  - **Skills**: []
    - No special skills needed for TypeScript type edits

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1.1 (with Task 1.2)
  - **Blocks**: Tasks 1.3, 1.4, 1.5, all B2/B3/B4
  - **Blocked By**: None (can start immediately)

  **References**:
  - `packages/shared/src/types.ts:571` - ZoneId type definition
  - `packages/shared/src/types.ts:716-722` - FacilityType definition
  - `packages/shared/src/types.ts:691-701` - NpcRole definition

  **Acceptance Criteria**:

  **TDD (RED phase):**
  - [ ] Test file created: `tests/unit/types.test.ts`
  - [ ] Test: ZoneId includes 'plaza'
  - [ ] Test: FacilityType includes all 15 new values
  - [ ] Test: NpcRole includes 'meeting_host', 'arcade_host'
  - [ ] `pnpm test tests/unit/types.test.ts` → FAIL

  **TDD (GREEN phase):**
  - [ ] Types updated in `packages/shared/src/types.ts`
  - [ ] `pnpm test tests/unit/types.test.ts` → PASS
  - [ ] `pnpm typecheck` → 0 errors

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Type compilation succeeds with new values
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run: pnpm typecheck
      2. Assert: Exit code 0
      3. Assert: stdout contains no errors
    Expected Result: TypeScript compiles without errors
    Evidence: Terminal output captured

  Scenario: Type test suite passes
    Tool: Bash
    Preconditions: Test file exists
    Steps:
      1. Run: pnpm test tests/unit/types.test.ts
      2. Assert: Exit code 0
      3. Assert: Output contains "PASS"
    Expected Result: All type assertions pass
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(shared): add plaza zone and new facility/NPC types`
  - Files: `packages/shared/src/types.ts`, `tests/unit/types.test.ts`
  - Pre-commit: `pnpm typecheck && pnpm test tests/unit/types.test.ts`

---

- [ ] 1.2. Write ZoneSystem tests for plaza zone (TDD RED)

  **What to do**:
  - Create test file for ZoneSystem plaza detection
  - Test plaza bounds: { x: 3200, y: 0, width: 960, height: 1280 } (30x40 tiles \* 32px)
  - Test entity zone detection returns 'plaza' for positions within bounds
  - Test zone enter/exit events fire correctly

  **Must NOT do**:
  - Do not implement ZoneSystem changes yet (RED phase only)
  - Do not modify existing zone bounds tests

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Test writing only, following existing patterns
  - **Skills**: []
    - Existing test patterns sufficient

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1.1 (with Task 1.1)
  - **Blocks**: Task 1.3
  - **Blocked By**: None

  **References**:
  - `packages/server/src/zone/ZoneSystem.ts:22-38` - DEFAULT_ZONE_BOUNDS pattern
  - `packages/server/src/zone/ZoneSystem.ts:60-67` - detectZone method
  - `tests/` - Existing test file patterns

  **Acceptance Criteria**:

  **TDD (RED phase):**
  - [ ] Test file created: `tests/unit/zone-system-plaza.test.ts`
  - [ ] Test: detectZone returns 'plaza' for position (3300, 500)
  - [ ] Test: detectZone returns null for position outside all zones
  - [ ] Test: updateEntityZone fires zone.enter for plaza
  - [ ] `pnpm test tests/unit/zone-system-plaza.test.ts` → FAIL (expected)

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Plaza zone tests exist and fail (RED phase)
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run: pnpm test tests/unit/zone-system-plaza.test.ts
      2. Assert: Exit code 1 (test failure expected)
      3. Assert: Output contains "plaza" test names
    Expected Result: Tests written but failing
    Evidence: Test output showing RED state
  ```

  **Commit**: YES
  - Message: `test(zone): add plaza zone detection tests (TDD RED)`
  - Files: `tests/unit/zone-system-plaza.test.ts`
  - Pre-commit: `pnpm typecheck`

---

- [ ] 1.3. Update ZoneSystem with plaza bounds (TDD GREEN)

  **What to do**:
  - Add 'plaza' entry to DEFAULT_ZONE_BOUNDS Map
  - Plaza bounds: { x: 3200, y: 0, width: 960, height: 1280 }
  - Ensure detectZone correctly identifies plaza positions
  - Run tests to verify GREEN state

  **Must NOT do**:
  - Do not change existing zone bounds
  - Do not modify zone detection algorithm

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small code change, well-defined scope
  - **Skills**: []
    - Standard TypeScript edit

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1.2 (with 1.4, 1.5)
  - **Blocks**: Task 1.6
  - **Blocked By**: Tasks 1.1, 1.2

  **References**:
  - `packages/server/src/zone/ZoneSystem.ts:32-38` - DEFAULT_ZONE_BOUNDS Map
  - `tests/unit/zone-system-plaza.test.ts` - Tests from 1.2

  **Acceptance Criteria**:

  **TDD (GREEN phase):**
  - [ ] `DEFAULT_ZONE_BOUNDS` includes plaza entry
  - [ ] `pnpm test tests/unit/zone-system-plaza.test.ts` → PASS
  - [ ] `pnpm typecheck` → 0 errors

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Plaza zone tests pass (GREEN phase)
    Tool: Bash
    Preconditions: ZoneSystem updated
    Steps:
      1. Run: pnpm test tests/unit/zone-system-plaza.test.ts
      2. Assert: Exit code 0
      3. Assert: Output contains "PASS"
    Expected Result: All plaza zone tests green
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(zone): implement plaza zone bounds`
  - Files: `packages/server/src/zone/ZoneSystem.ts`
  - Pre-commit: `pnpm test tests/unit/zone-system-plaza.test.ts`

---

- [ ] 1.4. Create plaza.json map file

  **What to do**:
  - Create `world/packs/base/maps/plaza.json` following Tiled format
  - Zone dimensions: 30x40 tiles (960x1280 pixels)
  - Include layers: floor, collision, objects
  - Add spawn point near center
  - Add fountain facility object at center
  - Position: x=3200, y=0 (right of arcade)

  **Must NOT do**:
  - Do not create custom tilesets - use existing tileset.json
  - Do not add complex collision patterns - keep simple walkable area

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: JSON file creation following exact pattern
  - **Skills**: []
    - Pattern from existing map files sufficient

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1.2 (with 1.3, 1.5)
  - **Blocks**: Task 1.6
  - **Blocked By**: Task 1.1

  **References**:
  - `world/packs/base/maps/lobby.json` - Complete map structure example
  - `world/packs/base/maps/arcade.json` - Smaller zone example
  - `packages/client/public/assets/maps/tileset.json` - Tileset reference

  **Acceptance Criteria**:
  - [ ] File exists: `world/packs/base/maps/plaza.json`
  - [ ] JSON is valid and parseable
  - [ ] Has zoneId: "plaza"
  - [ ] Has correct bounds: { x: 3200, y: 0, width: 960, height: 1280 }
  - [ ] Has floor layer (30x40 = 1200 tiles)
  - [ ] Has collision layer with walls on perimeter
  - [ ] Has objects layer with spawn point and fountain

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Plaza map JSON is valid
    Tool: Bash
    Preconditions: File created
    Steps:
      1. Run: node -e "JSON.parse(require('fs').readFileSync('world/packs/base/maps/plaza.json'))"
      2. Assert: Exit code 0
      3. Run: node -e "const m=JSON.parse(require('fs').readFileSync('world/packs/base/maps/plaza.json')); console.log(m.zoneId)"
      4. Assert: Output is "plaza"
    Expected Result: Valid JSON with correct zoneId
    Evidence: Node output captured

  Scenario: Plaza map has required structure
    Tool: Bash
    Preconditions: File created
    Steps:
      1. Run: node -e "const m=JSON.parse(require('fs').readFileSync('world/packs/base/maps/plaza.json')); console.log(m.layers.length)"
      2. Assert: Output >= 3
      3. Run: node -e "const m=JSON.parse(require('fs').readFileSync('world/packs/base/maps/plaza.json')); console.log(m.width, m.height)"
      4. Assert: Output is "30 40"
    Expected Result: 3+ layers, 30x40 dimensions
    Evidence: Node output captured
  ```

  **Commit**: YES
  - Message: `feat(world): add plaza zone map`
  - Files: `world/packs/base/maps/plaza.json`
  - Pre-commit: `node -e "JSON.parse(require('fs').readFileSync('world/packs/base/maps/plaza.json'))"`

---

- [ ] 1.5. Update manifest.json with plaza zone

  **What to do**:
  - Add "plaza" to zones array in manifest.json
  - Ensure order: ["lobby", "office", "meeting-center", "lounge-cafe", "arcade", "plaza"]

  **Must NOT do**:
  - Do not change entryZone
  - Do not modify version unless required

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: One-line JSON edit
  - **Skills**: []
    - Trivial edit

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1.2 (with 1.3, 1.4)
  - **Blocks**: Task 1.6
  - **Blocked By**: Task 1.1

  **References**:
  - `world/packs/base/manifest.json:5` - zones array

  **Acceptance Criteria**:
  - [ ] manifest.json zones array includes "plaza"
  - [ ] JSON is valid

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Manifest includes plaza zone
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run: node -e "const m=JSON.parse(require('fs').readFileSync('world/packs/base/manifest.json')); console.log(m.zones.includes('plaza'))"
      2. Assert: Output is "true"
    Expected Result: plaza in zones array
    Evidence: Node output captured
  ```

  **Commit**: YES (groups with 1.4)
  - Message: `feat(world): add plaza zone map`
  - Files: `world/packs/base/manifest.json`
  - Pre-commit: N/A (grouped)

---

- [ ] 1.6. Sync client map assets and verify loading

  **What to do**:
  - Copy plaza.json to `packages/client/public/assets/maps/`
  - Update BootScene.ts to load plaza map
  - Verify map loads without errors in client build

  **Must NOT do**:
  - Do not modify GameScene rendering logic
  - Do not add new visual assets

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: File copy and minor loader update
  - **Skills**: [`frontend-ui-ux`]
    - For Phaser scene modification understanding

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1.3 (sequential)
  - **Blocks**: All B2, B3 tasks
  - **Blocked By**: Tasks 1.3, 1.4, 1.5

  **References**:
  - `packages/client/src/game/scenes/BootScene.ts` - Map loading
  - `packages/client/public/assets/maps/` - Client map directory

  **Acceptance Criteria**:
  - [ ] `packages/client/public/assets/maps/plaza.json` exists
  - [ ] BootScene loads plaza map
  - [ ] `pnpm build` in client succeeds
  - [ ] No console errors on map load

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Client build succeeds with plaza map
    Tool: Bash
    Preconditions: plaza.json copied
    Steps:
      1. Run: cd packages/client && pnpm build
      2. Assert: Exit code 0
      3. Assert: dist/assets/maps/plaza.json exists
    Expected Result: Build includes plaza map
    Evidence: Build output captured

  Scenario: Plaza map in client dist
    Tool: Bash
    Preconditions: Build completed
    Steps:
      1. Run: ls packages/client/dist/assets/maps/ | grep plaza
      2. Assert: Output contains "plaza.json"
    Expected Result: plaza.json in dist
    Evidence: ls output captured
  ```

  **Commit**: YES
  - Message: `feat(client): load plaza zone map`
  - Files: `packages/client/public/assets/maps/plaza.json`, `packages/client/src/game/scenes/BootScene.ts`
  - Pre-commit: `cd packages/client && pnpm build`

---

### BUNDLE 2: NPCs

---

- [ ] 2.1. Write NPC tests for meeting_host and arcade_host (TDD RED)

  **What to do**:
  - Create test file for new NPC loading and behavior
  - Test meeting_host spawns in meeting-center zone
  - Test arcade_host spawns in arcade zone
  - Test schedule transitions (working/break states)
  - Test dialogue tree structure

  **Must NOT do**:
  - Do not implement NPC files yet (RED phase only)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Test writing following existing patterns
  - **Skills**: []
    - Existing NPC test patterns sufficient

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2.1 (with 2.2)
  - **Blocks**: Task 2.5
  - **Blocked By**: Task 1.6

  **References**:
  - `packages/server/src/systems/NPCSystem.ts:25-41` - registerNPC pattern
  - `world/packs/base/npcs/receptionist.json` - Full NPC example
  - `world/packs/base/npcs/event-host.json` - Similar role example

  **Acceptance Criteria**:

  **TDD (RED phase):**
  - [ ] Test file: `tests/unit/npc-new.test.ts`
  - [ ] Test: meeting_host loads from JSON
  - [ ] Test: arcade_host loads from JSON
  - [ ] Test: NPCs have valid schedules
  - [ ] `pnpm test tests/unit/npc-new.test.ts` → FAIL

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: NPC tests exist and fail (RED phase)
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run: pnpm test tests/unit/npc-new.test.ts
      2. Assert: Exit code 1
      3. Assert: Output contains test names for meeting_host, arcade_host
    Expected Result: Tests written but failing
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `test(npc): add meeting_host and arcade_host tests (TDD RED)`
  - Files: `tests/unit/npc-new.test.ts`
  - Pre-commit: `pnpm typecheck`

---

- [ ] 2.2. Create meeting-host.json NPC definition

  **What to do**:
  - Create `world/packs/base/npcs/meeting-host.json`
  - Name: "Morgan the Meeting Host"
  - Zone: meeting-center
  - Default position near schedule_kiosk
  - Schedule: 9-12 working, 12-13 break, 13-18 working
  - Dialogue: greeting, directions to rooms A/B/C, tips for effective meetings

  **Must NOT do**:
  - Do not create complex branching dialogue beyond 2 levels
  - Do not add custom sprites

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: JSON creation following exact pattern
  - **Skills**: []
    - Pattern from existing NPCs

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2.1 (with 2.1)
  - **Blocks**: Task 2.4
  - **Blocked By**: Task 1.6

  **References**:
  - `world/packs/base/npcs/receptionist.json` - Complete dialogue example
  - `world/packs/base/npcs/event-host.json` - Similar role

  **Acceptance Criteria**:
  - [ ] File exists: `world/packs/base/npcs/meeting-host.json`
  - [ ] Has id: "meeting-host"
  - [ ] Has zone: "meeting-center"
  - [ ] Has schedule with 3+ entries
  - [ ] Has dialogue.greeting with options

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: meeting-host.json is valid
    Tool: Bash
    Preconditions: File created
    Steps:
      1. Run: node -e "const n=JSON.parse(require('fs').readFileSync('world/packs/base/npcs/meeting-host.json')); console.log(n.id, n.zone)"
      2. Assert: Output is "meeting-host meeting-center"
    Expected Result: Valid NPC with correct zone
    Evidence: Node output captured
  ```

  **Commit**: YES
  - Message: `feat(npc): add meeting-host NPC`
  - Files: `world/packs/base/npcs/meeting-host.json`
  - Pre-commit: `node -e "JSON.parse(require('fs').readFileSync('world/packs/base/npcs/meeting-host.json'))"`

---

- [ ] 2.3. Create arcade-host.json NPC definition

  **What to do**:
  - Create `world/packs/base/npcs/arcade-host.json`
  - Name: "Casey the Arcade Host"
  - Zone: arcade
  - Default position near stage
  - Schedule: 10-18 working (arcade hours), 18-22 break pattern
  - Dialogue: greeting, game recommendations, tournament info

  **Must NOT do**:
  - Do not create complex dialogue
  - Do not add custom sprites

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: JSON creation following pattern
  - **Skills**: []
    - Pattern sufficient

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2.2 (with 2.4)
  - **Blocks**: Task 2.4
  - **Blocked By**: Task 1.6

  **References**:
  - `world/packs/base/npcs/receptionist.json` - Dialogue pattern
  - `world/packs/base/npcs/barista.json` - Service role example

  **Acceptance Criteria**:
  - [ ] File exists: `world/packs/base/npcs/arcade-host.json`
  - [ ] Has id: "arcade-host"
  - [ ] Has zone: "arcade"
  - [ ] Has schedule and dialogue

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: arcade-host.json is valid
    Tool: Bash
    Preconditions: File created
    Steps:
      1. Run: node -e "const n=JSON.parse(require('fs').readFileSync('world/packs/base/npcs/arcade-host.json')); console.log(n.id, n.zone)"
      2. Assert: Output is "arcade-host arcade"
    Expected Result: Valid NPC with correct zone
    Evidence: Node output captured
  ```

  **Commit**: YES
  - Message: `feat(npc): add arcade-host NPC`
  - Files: `world/packs/base/npcs/arcade-host.json`
  - Pre-commit: `node -e "JSON.parse(require('fs').readFileSync('world/packs/base/npcs/arcade-host.json'))"`

---

- [ ] 2.4. Update npcs/index.json with new NPCs

  **What to do**:
  - Add "meeting-host" to npcs array
  - Add "arcade-host" to npcs array
  - Verify array now has 12 entries

  **Must NOT do**:
  - Do not remove existing NPCs

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple JSON array edit
  - **Skills**: []
    - Trivial

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2.2 (with 2.3)
  - **Blocks**: Task 2.5
  - **Blocked By**: Tasks 2.2, 2.3

  **References**:
  - `world/packs/base/npcs/index.json:2-13` - Current NPC list

  **Acceptance Criteria**:
  - [ ] index.json has 12 NPCs
  - [ ] Includes "meeting-host" and "arcade-host"

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: NPC index has 12 entries
    Tool: Bash
    Preconditions: File updated
    Steps:
      1. Run: node -e "const n=JSON.parse(require('fs').readFileSync('world/packs/base/npcs/index.json')); console.log(n.npcs.length)"
      2. Assert: Output is "12"
    Expected Result: 12 NPCs registered
    Evidence: Node output captured
  ```

  **Commit**: YES (groups with 2.2, 2.3)
  - Message: `feat(npc): register new NPCs in index`
  - Files: `world/packs/base/npcs/index.json`
  - Pre-commit: N/A

---

- [ ] 2.5. Verify NPC spawning in zones (TDD GREEN)

  **What to do**:
  - Run NPC tests to verify GREEN state
  - Start server and verify NPCs spawn correctly
  - Verify schedule transitions work

  **Must NOT do**:
  - Do not modify NPC system code unless tests fail

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Verification only
  - **Skills**: []
    - Standard testing

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2.3 (sequential)
  - **Blocks**: B4, B5
  - **Blocked By**: Tasks 2.1-2.4

  **References**:
  - `tests/unit/npc-new.test.ts` - Tests from 2.1

  **Acceptance Criteria**:
  - [ ] `pnpm test tests/unit/npc-new.test.ts` → PASS
  - [ ] All 12 NPCs load without errors
  - [ ] NPCs appear in correct zones

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: NPC tests pass (GREEN phase)
    Tool: Bash
    Preconditions: NPC files created
    Steps:
      1. Run: pnpm test tests/unit/npc-new.test.ts
      2. Assert: Exit code 0
      3. Assert: Output contains "PASS"
    Expected Result: All NPC tests green
    Evidence: Test output captured

  Scenario: Server loads all 12 NPCs
    Tool: Bash
    Preconditions: Server can start
    Steps:
      1. Run: pnpm dev:server &
      2. Wait 3 seconds
      3. Run: curl http://localhost:2567/health
      4. Assert: Status 200
      5. Kill server
    Expected Result: Server starts with NPCs
    Evidence: Health check response
  ```

  **Commit**: YES
  - Message: `test(npc): verify new NPC spawning (TDD GREEN)`
  - Files: None (verification only)
  - Pre-commit: `pnpm test tests/unit/npc-new.test.ts`

---

### BUNDLE 3: Facilities & Interactions

---

- [ ] 3.1. Write facility tests for all 16 interaction types (TDD RED)

  **What to do**:
  - Create comprehensive test file for all facilities
  - Test facility creation with correct zones
  - Test affordance retrieval per facility type
  - Test interaction handlers return valid outcomes
  - Group tests by zone

  **Must NOT do**:
  - Do not implement handlers yet (RED phase)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Large test file, needs comprehensive coverage
  - **Skills**: []
    - Standard testing patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.1 (with 3.2, 3.3)
  - **Blocks**: Task 3.8
  - **Blocked By**: Task 1.6

  **References**:
  - `packages/server/src/services/FacilityService.ts:55-94` - interact method pattern
  - `packages/server/src/schemas/FacilitySchema.ts` - Schema structure

  **Acceptance Criteria**:

  **TDD (RED phase):**
  - [ ] Test file: `tests/unit/facilities.test.ts`
  - [ ] Tests for all 16 facility types
  - [ ] Tests for affordance resolution
  - [ ] `pnpm test tests/unit/facilities.test.ts` → FAIL

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Facility tests exist and fail (RED phase)
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run: pnpm test tests/unit/facilities.test.ts
      2. Assert: Exit code 1
      3. Assert: Output contains 16+ test descriptions
    Expected Result: Comprehensive tests, all failing
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `test(facility): add tests for 16 facility types (TDD RED)`
  - Files: `tests/unit/facilities.test.ts`
  - Pre-commit: `pnpm typecheck`

---

- [ ] 3.2. Add lobby facilities (notice_board, onboarding_signpost, pond_edge)

  **What to do**:
  - Add facility objects to lobby.json map
  - Position notice_board near reception
  - Position onboarding_signpost at spawn
  - Position pond_edge in decorative area
  - Define affordances: read, follow_guide, sit

  **Must NOT do**:
  - Do not modify existing reception-desk

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: JSON object additions
  - **Skills**: []
    - Pattern from existing objects

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.1 (with 3.1, 3.3)
  - **Blocks**: Task 3.8
  - **Blocked By**: Task 1.6

  **References**:
  - `world/packs/base/maps/lobby.json:68-88` - Objects layer
  - `world/packs/base/maps/lobby.json:79-86` - reception-desk object example

  **Acceptance Criteria**:
  - [ ] lobby.json has notice_board object
  - [ ] lobby.json has onboarding_signpost object
  - [ ] lobby.json has pond_edge object
  - [ ] Each has correct type: "facility"

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Lobby has 3 new facilities
    Tool: Bash
    Preconditions: File updated
    Steps:
      1. Run: node -e "const m=JSON.parse(require('fs').readFileSync('world/packs/base/maps/lobby.json')); const objs=m.layers.find(l=>l.name==='objects').objects; console.log(objs.map(o=>o.name).join(','))"
      2. Assert: Output contains "notice_board"
      3. Assert: Output contains "onboarding_signpost"
      4. Assert: Output contains "pond_edge"
    Expected Result: All 3 facilities in objects layer
    Evidence: Node output captured
  ```

  **Commit**: YES
  - Message: `feat(facility): add lobby facilities`
  - Files: `world/packs/base/maps/lobby.json`
  - Pre-commit: `node -e "JSON.parse(require('fs').readFileSync('world/packs/base/maps/lobby.json'))"`

---

- [ ] 3.3. Add office facilities (kanban_terminal, printer, watercooler)

  **What to do**:
  - Add facility objects to office.json map
  - Position kanban_terminal near PM area
  - Position printer in shared area
  - Position watercooler for break conversations
  - Affordances: view_board, print, drink

  **Must NOT do**:
  - Do not modify existing whiteboard

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: JSON object additions
  - **Skills**: []
    - Pattern sufficient

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.1 (with 3.1, 3.2)
  - **Blocks**: Task 3.8
  - **Blocked By**: Task 1.6

  **References**:
  - `world/packs/base/maps/office.json` - Office map
  - `world/packs/base/maps/lobby.json:79-86` - Facility object pattern

  **Acceptance Criteria**:
  - [ ] office.json has kanban_terminal object
  - [ ] office.json has printer object
  - [ ] office.json has watercooler object

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Office has 3 new facilities
    Tool: Bash
    Preconditions: File updated
    Steps:
      1. Run: node -e "const m=JSON.parse(require('fs').readFileSync('world/packs/base/maps/office.json')); const objs=m.layers.find(l=>l.name==='objects')?.objects||[]; console.log(objs.map(o=>o.name).join(','))"
      2. Assert: Output contains kanban_terminal, printer, watercooler
    Expected Result: All 3 facilities in objects layer
    Evidence: Node output captured
  ```

  **Commit**: YES
  - Message: `feat(facility): add office facilities`
  - Files: `world/packs/base/maps/office.json`
  - Pre-commit: `node -e "JSON.parse(require('fs').readFileSync('world/packs/base/maps/office.json'))"`

---

- [ ] 3.4. Add meeting facilities (schedule_kiosk, room doors A/B/C, agenda_panel)

  **What to do**:
  - Add facility objects to meeting-center.json
  - Position schedule_kiosk at entrance
  - Position room_door_a, room_door_b, room_door_c at room entries
  - Position agenda_panel inside meeting area
  - Affordances: view_schedule, enter_room, view_agenda

  **Must NOT do**:
  - Do not implement room reservation logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: JSON additions
  - **Skills**: []
    - Pattern sufficient

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.2 (with 3.5, 3.6)
  - **Blocks**: Task 3.8
  - **Blocked By**: Tasks 3.1-3.3

  **References**:
  - `world/packs/base/maps/meeting-center.json` - Meeting map
  - `packages/server/src/services/MeetingService.ts` - Meeting patterns

  **Acceptance Criteria**:
  - [ ] meeting-center.json has schedule_kiosk
  - [ ] meeting-center.json has room_door_a, room_door_b, room_door_c
  - [ ] meeting-center.json has agenda_panel

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Meeting center has 5 facilities
    Tool: Bash
    Preconditions: File updated
    Steps:
      1. Run: node -e "const m=JSON.parse(require('fs').readFileSync('world/packs/base/maps/meeting-center.json')); const objs=m.layers.find(l=>l.name==='objects')?.objects||[]; console.log(objs.length, objs.map(o=>o.name).join(','))"
      2. Assert: Contains schedule_kiosk, room_door_a, room_door_b, room_door_c, agenda_panel
    Expected Result: All 5 meeting facilities
    Evidence: Node output captured
  ```

  **Commit**: YES
  - Message: `feat(facility): add meeting-center facilities`
  - Files: `world/packs/base/maps/meeting-center.json`
  - Pre-commit: `node -e "JSON.parse(require('fs').readFileSync('world/packs/base/maps/meeting-center.json'))"`

---

- [ ] 3.5. Add lounge facilities (vending_machine)

  **What to do**:
  - Add vending_machine facility to lounge-cafe.json
  - cafe_counter already exists
  - Position near seating area
  - Affordance: buy_snack

  **Must NOT do**:
  - Do not modify existing cafe_counter

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single facility add
  - **Skills**: []
    - Trivial

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.2 (with 3.4, 3.6)
  - **Blocks**: Task 3.8
  - **Blocked By**: Tasks 3.1-3.3

  **References**:
  - `world/packs/base/maps/lounge-cafe.json` - Lounge map

  **Acceptance Criteria**:
  - [ ] lounge-cafe.json has vending_machine object

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Lounge has vending_machine
    Tool: Bash
    Preconditions: File updated
    Steps:
      1. Run: node -e "const m=JSON.parse(require('fs').readFileSync('world/packs/base/maps/lounge-cafe.json')); const objs=m.layers.find(l=>l.name==='objects')?.objects||[]; console.log(objs.map(o=>o.name).includes('vending_machine'))"
      2. Assert: Output is "true"
    Expected Result: vending_machine exists
    Evidence: Node output captured
  ```

  **Commit**: YES
  - Message: `feat(facility): add lounge vending machine`
  - Files: `world/packs/base/maps/lounge-cafe.json`
  - Pre-commit: `node -e "JSON.parse(require('fs').readFileSync('world/packs/base/maps/lounge-cafe.json'))"`

---

- [ ] 3.6. Add arcade facilities (stage, game_table)

  **What to do**:
  - Add stage and game_table to arcade.json
  - Position stage for events/performances
  - Position game_table for multiplayer games
  - Affordances: watch_performance, play_game

  **Must NOT do**:
  - Do not implement game logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: JSON additions
  - **Skills**: []
    - Pattern sufficient

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.2 (with 3.4, 3.5)
  - **Blocks**: Task 3.8
  - **Blocked By**: Tasks 3.1-3.3

  **References**:
  - `world/packs/base/maps/arcade.json` - Arcade map

  **Acceptance Criteria**:
  - [ ] arcade.json has stage object
  - [ ] arcade.json has game_table object

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Arcade has stage and game_table
    Tool: Bash
    Preconditions: File updated
    Steps:
      1. Run: node -e "const m=JSON.parse(require('fs').readFileSync('world/packs/base/maps/arcade.json')); const objs=m.layers.find(l=>l.name==='objects')?.objects||[]; console.log(objs.map(o=>o.name).join(','))"
      2. Assert: Contains "stage" and "game_table"
    Expected Result: Both arcade facilities exist
    Evidence: Node output captured
  ```

  **Commit**: YES
  - Message: `feat(facility): add arcade facilities`
  - Files: `world/packs/base/maps/arcade.json`
  - Pre-commit: `node -e "JSON.parse(require('fs').readFileSync('world/packs/base/maps/arcade.json'))"`

---

- [ ] 3.7. Add plaza facilities (fountain)

  **What to do**:
  - Ensure plaza.json (from 1.4) has fountain facility
  - Central position in plaza
  - Affordances: sit_nearby, make_wish, admire

  **Must NOT do**:
  - Do not add complex fountain state

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Verify/add single object
  - **Skills**: []
    - Trivial

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.3 (with 3.8)
  - **Blocks**: Task 3.8
  - **Blocked By**: Tasks 3.4-3.6, 1.4

  **References**:
  - `world/packs/base/maps/plaza.json` - Plaza map (from 1.4)

  **Acceptance Criteria**:
  - [ ] plaza.json has fountain object in objects layer
  - [ ] fountain has type: "facility"

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Plaza has fountain
    Tool: Bash
    Preconditions: plaza.json exists
    Steps:
      1. Run: node -e "const m=JSON.parse(require('fs').readFileSync('world/packs/base/maps/plaza.json')); const objs=m.layers.find(l=>l.name==='objects')?.objects||[]; console.log(objs.find(o=>o.name==='fountain')?.type)"
      2. Assert: Output is "facility"
    Expected Result: fountain facility exists
    Evidence: Node output captured
  ```

  **Commit**: YES (may merge with 1.4 if already included)
  - Message: `feat(facility): ensure plaza fountain`
  - Files: `world/packs/base/maps/plaza.json`
  - Pre-commit: N/A

---

- [ ] 3.8. Register all facility handlers (TDD GREEN)

  **What to do**:
  - Create facility handler file for new types
  - Register handlers in GameRoom initialization
  - Implement basic affordance resolution per type
  - Update FacilityService setup to include all 16 types
  - Run tests to verify GREEN

  **Must NOT do**:
  - Do not implement complex business logic
  - Keep handlers returning simple outcomes

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multiple handler implementations
  - **Skills**: []
    - Standard patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3.3 (sequential after 3.7)
  - **Blocks**: All B4 tasks
  - **Blocked By**: Tasks 3.1-3.7

  **References**:
  - `packages/server/src/services/FacilityService.ts:115-122` - registerHandler pattern
  - `packages/server/src/rooms/GameRoom.ts` - Room initialization

  **Acceptance Criteria**:

  **TDD (GREEN phase):**
  - [ ] All 16 facility types have handlers registered
  - [ ] `pnpm test tests/unit/facilities.test.ts` → PASS
  - [ ] Facilities can be interacted with via FacilityService

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Facility tests pass (GREEN phase)
    Tool: Bash
    Preconditions: Handlers implemented
    Steps:
      1. Run: pnpm test tests/unit/facilities.test.ts
      2. Assert: Exit code 0
      3. Assert: Output contains "PASS"
    Expected Result: All facility tests green
    Evidence: Test output captured

  Scenario: All handlers registered
    Tool: Bash
    Preconditions: Server code updated
    Steps:
      1. Run: grep -c "registerHandler" packages/server/src/rooms/GameRoom.ts
      2. Assert: Output >= 16
    Expected Result: 16+ handler registrations
    Evidence: grep output
  ```

  **Commit**: YES
  - Message: `feat(facility): register handlers for all 16 facility types`
  - Files: `packages/server/src/rooms/GameRoom.ts`, `packages/server/src/services/FacilityHandlers.ts` (new)
  - Pre-commit: `pnpm test tests/unit/facilities.test.ts`

---

### BUNDLE 4: AIC Affordance Fix

---

- [ ] 4.1. Write AIC observe affordance tests (TDD RED)

  **What to do**:
  - Create integration test for AIC observe endpoint
  - Test that nearby facilities appear in response
  - Test that `affords` array is populated for facilities
  - Test distance calculation for facilities

  **Must NOT do**:
  - Do not modify observe handler yet (RED phase)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Integration test writing
  - **Skills**: []
    - Existing API test patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4.1 (with 4.2)
  - **Blocks**: Task 4.3
  - **Blocked By**: Task 3.8

  **References**:
  - `packages/server/src/aic/handlers/observe.ts:68-156` - Current handler
  - `packages/shared/src/types.ts:76-81` - ObservedEntity with affords

  **Acceptance Criteria**:

  **TDD (RED phase):**
  - [ ] Test file: `tests/integration/aic-observe-affordances.test.ts`
  - [ ] Test: observe returns facilities in nearby array
  - [ ] Test: facility has non-empty affords array
  - [ ] `pnpm test tests/integration/aic-observe-affordances.test.ts` → FAIL

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: AIC affordance tests fail (RED phase)
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run: pnpm test tests/integration/aic-observe-affordances.test.ts
      2. Assert: Exit code 1
      3. Assert: Output shows facilities not in nearby
    Expected Result: Tests failing as expected
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `test(aic): add observe affordance tests (TDD RED)`
  - Files: `tests/integration/aic-observe-affordances.test.ts`
  - Pre-commit: `pnpm typecheck`

---

- [ ] 4.2. Fix observe handler to include facilities (TDD GREEN)

  **What to do**:
  - Modify observe.ts to include facilities in nearby array
  - Get facilities from room state via FacilityService
  - Calculate distance from agent to each facility
  - Include facilities within radius with their affordances
  - Format as ObservedEntity with entity, distance, affords

  **Must NOT do**:
  - Do not break existing entity observation
  - Do not modify affordance resolution logic

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Critical AIC API fix
  - **Skills**: []
    - Standard TypeScript

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4.1 (with 4.1)
  - **Blocks**: Task 4.3
  - **Blocked By**: Task 3.8

  **References**:
  - `packages/server/src/aic/handlers/observe.ts:109-127` - Nearby loop
  - `packages/server/src/services/FacilityService.ts:41-53` - getAffordances
  - `packages/shared/src/types.ts:65-69` - Affordance type

  **Acceptance Criteria**:

  **TDD (GREEN phase):**
  - [ ] observe.ts includes facilities in nearby
  - [ ] Facilities have correct affords array
  - [ ] `pnpm test tests/integration/aic-observe-affordances.test.ts` → PASS
  - [ ] Existing observe tests still pass

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: AIC affordance tests pass (GREEN phase)
    Tool: Bash
    Preconditions: Handler fixed
    Steps:
      1. Run: pnpm test tests/integration/aic-observe-affordances.test.ts
      2. Assert: Exit code 0
    Expected Result: Affordance tests pass
    Evidence: Test output captured

  Scenario: All AIC tests still pass
    Tool: Bash
    Preconditions: Handler fixed
    Steps:
      1. Run: pnpm test tests/integration/aic*.test.ts
      2. Assert: Exit code 0
    Expected Result: No regressions
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `fix(aic): include facility affordances in observe response`
  - Files: `packages/server/src/aic/handlers/observe.ts`
  - Pre-commit: `pnpm test tests/integration/aic*.test.ts`

---

- [ ] 4.3. Verify AIC observe returns affordances via HTTP

  **What to do**:
  - Start server
  - Register agent
  - Call observe endpoint
  - Verify response includes facility affordances
  - Document response format

  **Must NOT do**:
  - Do not modify code (verification only)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: HTTP verification
  - **Skills**: [`playwright`]
    - For HTTP request automation

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4.2 (sequential)
  - **Blocks**: All B5 tasks
  - **Blocked By**: Tasks 4.1, 4.2

  **References**:
  - AIC API docs in README
  - `packages/server/src/aic/router.ts` - Endpoint definitions

  **Acceptance Criteria**:
  - [ ] Server starts successfully
  - [ ] Agent registration works
  - [ ] Observe response includes facilities with affordances
  - [ ] Response matches ObserveResponseData type

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: AIC observe returns facility affordances via HTTP
    Tool: Bash
    Preconditions: Server running
    Steps:
      1. Start server: pnpm dev:server &
      2. Wait: sleep 3
      3. Register agent: curl -X POST http://localhost:2567/aic/v0.1/register -H "Content-Type: application/json" -d '{"name":"TestAgent","roomId":"default"}'
      4. Extract agentId from response
      5. Observe: curl -X POST http://localhost:2567/aic/v0.1/observe -H "Content-Type: application/json" -d '{"agentId":"<id>","roomId":"default","radius":500,"detail":"full"}'
      6. Assert: Response nearby array has entries with affords arrays
      7. Kill server
    Expected Result: Facilities with affordances in response
    Evidence: curl response JSON saved to .sisyphus/evidence/task-4.3-observe.json

  Scenario: Affordance format is correct
    Tool: Bash
    Preconditions: Observe response captured
    Steps:
      1. Parse response JSON
      2. Find entry with affords array
      3. Assert: affords[0] has action and label fields
    Expected Result: Correct Affordance structure
    Evidence: Parsed output
  ```

  **Commit**: NO (verification only)

---

### BUNDLE 5: QA & Deployment

---

- [ ] 5.1. E2E test S1 - Agent registration & observe

  **What to do**:
  - Create Playwright test for agent registration
  - Verify agent appears in world
  - Verify observe returns correct data
  - Capture screenshots as evidence

  **Must NOT do**:
  - Do not test client UI interactions (API only)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: E2E testing with evidence capture
  - **Skills**: [`playwright`]
    - Required for browser automation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5.1 (with 5.2, 5.3)
  - **Blocks**: Task 5.7
  - **Blocked By**: Task 4.3

  **References**:
  - README AIC API section
  - `tests/e2e/` - E2E test directory

  **Acceptance Criteria**:
  - [ ] Test file: `tests/e2e/s1-registration.spec.ts`
  - [ ] Test passes with Playwright
  - [ ] Evidence saved to `.sisyphus/evidence/`

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: S1 - Agent registration E2E
    Tool: Playwright (playwright skill)
    Preconditions: Server running on localhost:2567
    Steps:
      1. POST /aic/v0.1/register with name="S1TestAgent"
      2. Assert: status 200
      3. Assert: response has agentId, sessionToken
      4. POST /aic/v0.1/observe with agentId
      5. Assert: status 200
      6. Assert: response.data.self.name === "S1TestAgent"
      7. Screenshot: .sisyphus/evidence/s1-registration.png
    Expected Result: Agent registered and observable
    Evidence: .sisyphus/evidence/s1-registration.png
  ```

  **Commit**: YES
  - Message: `test(e2e): add S1 agent registration scenario`
  - Files: `tests/e2e/s1-registration.spec.ts`
  - Pre-commit: `pnpm playwright test tests/e2e/s1-registration.spec.ts`

---

- [ ] 5.2. E2E test S2 - Zone transitions

  **What to do**:
  - Create test for agent moving between zones
  - Verify zone.enter and zone.exit events
  - Test plaza zone is reachable

  **Must NOT do**:
  - Do not test NPC interactions in this scenario

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: E2E with movement
  - **Skills**: [`playwright`]
    - Required

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5.1 (with 5.1, 5.3)
  - **Blocks**: Task 5.7
  - **Blocked By**: Task 4.3

  **References**:
  - `packages/shared/src/types.ts:289-299` - Zone event payloads

  **Acceptance Criteria**:
  - [ ] Test file: `tests/e2e/s2-zone-transitions.spec.ts`
  - [ ] Agent moves from lobby to plaza
  - [ ] zone.exit and zone.enter events received

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: S2 - Zone transition to plaza
    Tool: Playwright (playwright skill)
    Preconditions: Server running, agent registered
    Steps:
      1. Register agent in lobby (spawn at 176,176)
      2. POST /aic/v0.1/moveTo dest={tx:100, ty:20} (plaza area)
      3. Poll /aic/v0.1/pollEvents for zone events
      4. Assert: received zone.exit with zoneId="lobby"
      5. Assert: received zone.enter with zoneId="plaza"
    Expected Result: Zone transition events fired
    Evidence: .sisyphus/evidence/s2-zone-transition.json
  ```

  **Commit**: YES
  - Message: `test(e2e): add S2 zone transitions scenario`
  - Files: `tests/e2e/s2-zone-transitions.spec.ts`
  - Pre-commit: `pnpm playwright test tests/e2e/s2-zone-transitions.spec.ts`

---

- [ ] 5.3. E2E test S3 - Facility interactions

  **What to do**:
  - Create test for interacting with facilities
  - Test at least 3 different facility types
  - Verify affordances are available
  - Verify interaction outcomes

  **Must NOT do**:
  - Do not test all 16 facilities (3 representative)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: E2E interaction testing
  - **Skills**: [`playwright`]
    - Required

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5.1 (with 5.1, 5.2)
  - **Blocks**: Task 5.7
  - **Blocked By**: Task 4.3

  **References**:
  - `packages/shared/src/types.ts:103-110` - InteractRequest

  **Acceptance Criteria**:
  - [ ] Test file: `tests/e2e/s3-facility-interactions.spec.ts`
  - [ ] Tests reception_desk, fountain, kanban_terminal
  - [ ] Each interaction returns valid outcome

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: S3 - Interact with fountain in plaza
    Tool: Playwright (playwright skill)
    Preconditions: Agent in plaza zone
    Steps:
      1. Observe to find fountain facility
      2. Assert: fountain in nearby with affords
      3. POST /aic/v0.1/interact with action="make_wish"
      4. Assert: status 200
      5. Assert: outcome.type === "ok"
    Expected Result: Fountain interaction succeeds
    Evidence: .sisyphus/evidence/s3-fountain-interact.json
  ```

  **Commit**: YES
  - Message: `test(e2e): add S3 facility interactions scenario`
  - Files: `tests/e2e/s3-facility-interactions.spec.ts`
  - Pre-commit: `pnpm playwright test tests/e2e/s3-facility-interactions.spec.ts`

---

- [ ] 5.4. E2E test S4 - NPC proximity events

  **What to do**:
  - Create test for NPC proximity detection
  - Move agent near meeting_host
  - Verify proximity.enter event
  - Move away and verify proximity.exit

  **Must NOT do**:
  - Do not test NPC dialogue (proximity only)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: E2E proximity testing
  - **Skills**: [`playwright`]
    - Required

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5.2 (with 5.5, 5.6)
  - **Blocks**: Task 5.7
  - **Blocked By**: Tasks 5.1-5.3

  **References**:
  - `packages/shared/src/types.ts:278-287` - Proximity event payloads

  **Acceptance Criteria**:
  - [ ] Test file: `tests/e2e/s4-npc-proximity.spec.ts`
  - [ ] Agent approaches meeting_host
  - [ ] proximity.enter event received

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: S4 - NPC proximity detection
    Tool: Playwright (playwright skill)
    Preconditions: Agent in meeting-center
    Steps:
      1. Find meeting_host NPC via observe
      2. Move agent within 100 units of NPC
      3. Poll events
      4. Assert: proximity.enter with otherId=meeting_host
    Expected Result: Proximity event fires
    Evidence: .sisyphus/evidence/s4-npc-proximity.json
  ```

  **Commit**: YES
  - Message: `test(e2e): add S4 NPC proximity scenario`
  - Files: `tests/e2e/s4-npc-proximity.spec.ts`
  - Pre-commit: `pnpm playwright test tests/e2e/s4-npc-proximity.spec.ts`

---

- [ ] 5.5. E2E test S5 - Chat in zones

  **What to do**:
  - Create test for chat functionality
  - Send chat message in proximity channel
  - Verify message appears in chatObserve
  - Test chat in plaza zone

  **Must NOT do**:
  - Do not test meeting/team channels

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: E2E chat testing
  - **Skills**: [`playwright`]
    - Required

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5.2 (with 5.4, 5.6)
  - **Blocks**: Task 5.7
  - **Blocked By**: Tasks 5.1-5.3

  **References**:
  - `packages/shared/src/types.ts:112-118` - ChatSendRequest

  **Acceptance Criteria**:
  - [ ] Test file: `tests/e2e/s5-chat.spec.ts`
  - [ ] Agent sends message in plaza
  - [ ] Message retrievable via chatObserve

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: S5 - Chat in plaza zone
    Tool: Playwright (playwright skill)
    Preconditions: Agent in plaza
    Steps:
      1. POST /aic/v0.1/chatSend with message="Hello plaza!"
      2. Assert: status 200
      3. POST /aic/v0.1/chatObserve
      4. Assert: messages contains "Hello plaza!"
    Expected Result: Chat message sent and received
    Evidence: .sisyphus/evidence/s5-chat.json
  ```

  **Commit**: YES
  - Message: `test(e2e): add S5 chat scenario`
  - Files: `tests/e2e/s5-chat.spec.ts`
  - Pre-commit: `pnpm playwright test tests/e2e/s5-chat.spec.ts`

---

- [ ] 5.6. E2E test S6 - Full scenario walkthrough

  **What to do**:
  - Create comprehensive test covering full agent lifecycle
  - Register, move through zones, interact with facilities, chat
  - Verify all major features work together

  **Must NOT do**:
  - Do not duplicate individual scenario tests

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Full E2E integration
  - **Skills**: [`playwright`]
    - Required

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5.2 (with 5.4, 5.5)
  - **Blocks**: Task 5.7
  - **Blocked By**: Tasks 5.1-5.3

  **References**:
  - All previous E2E tests

  **Acceptance Criteria**:
  - [ ] Test file: `tests/e2e/s6-full-walkthrough.spec.ts`
  - [ ] Agent completes full journey through world
  - [ ] No errors throughout lifecycle

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: S6 - Full agent walkthrough
    Tool: Playwright (playwright skill)
    Preconditions: Clean server state
    Steps:
      1. Register agent
      2. Observe in lobby
      3. Move to meeting-center
      4. Interact with schedule_kiosk
      5. Move to plaza
      6. Interact with fountain
      7. Send chat message
      8. Move to arcade
      9. Find arcade_host NPC
      10. Return to lobby
    Expected Result: All steps complete without error
    Evidence: .sisyphus/evidence/s6-walkthrough.json
  ```

  **Commit**: YES
  - Message: `test(e2e): add S6 full walkthrough scenario`
  - Files: `tests/e2e/s6-full-walkthrough.spec.ts`
  - Pre-commit: `pnpm playwright test tests/e2e/s6-full-walkthrough.spec.ts`

---

- [ ] 5.7. CI verification & Docker deployment

  **What to do**:
  - Run full CI pipeline locally
  - Verify all tests pass
  - Build Docker image
  - Start container and verify health
  - Document deployment status

  **Must NOT do**:
  - Do not push to production
  - Do not modify CI workflow

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Verification and build
  - **Skills**: []
    - Standard commands

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5.3 (final)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 5.1-5.6

  **References**:
  - `Dockerfile` - Docker build
  - `.github/workflows/ci.yml` - CI configuration
  - `docker-compose.yml` - Docker Compose

  **Acceptance Criteria**:
  - [ ] `pnpm test` → all pass
  - [ ] `pnpm typecheck` → 0 errors
  - [ ] `pnpm lint` → 0 errors
  - [ ] `docker build -t openclaw .` → success
  - [ ] Container health check passes

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Full CI pipeline passes
    Tool: Bash
    Preconditions: All code changes committed
    Steps:
      1. Run: pnpm install
      2. Run: pnpm typecheck
      3. Assert: Exit code 0
      4. Run: pnpm lint
      5. Assert: Exit code 0
      6. Run: pnpm test
      7. Assert: Exit code 0
    Expected Result: All CI checks pass
    Evidence: Terminal output captured

  Scenario: Docker build and run
    Tool: Bash
    Preconditions: CI passes
    Steps:
      1. Run: docker build -t openclaw .
      2. Assert: Exit code 0
      3. Run: docker run -d -p 2567:2567 --name openclaw-test openclaw
      4. Wait: sleep 5
      5. Run: curl http://localhost:2567/health
      6. Assert: Status 200
      7. Run: docker stop openclaw-test && docker rm openclaw-test
    Expected Result: Container runs and responds
    Evidence: Health check response saved
  ```

  **Commit**: YES
  - Message: `chore: verify CI and Docker deployment`
  - Files: None (verification only)
  - Pre-commit: `pnpm test && pnpm typecheck && pnpm lint`

---

## Commit Strategy

| Bundle | After Tasks | Message                                                       | Files                            | Verification |
| ------ | ----------- | ------------------------------------------------------------- | -------------------------------- | ------------ |
| B1     | 1.1         | `feat(shared): add plaza zone and new facility/NPC types`     | types.ts                         | typecheck    |
| B1     | 1.2         | `test(zone): add plaza zone detection tests (TDD RED)`        | tests                            | typecheck    |
| B1     | 1.3         | `feat(zone): implement plaza zone bounds`                     | ZoneSystem.ts                    | test         |
| B1     | 1.4-1.5     | `feat(world): add plaza zone map`                             | plaza.json, manifest.json        | JSON valid   |
| B1     | 1.6         | `feat(client): load plaza zone map`                           | client files                     | build        |
| B2     | 2.1         | `test(npc): add meeting_host and arcade_host tests (TDD RED)` | tests                            | typecheck    |
| B2     | 2.2-2.4     | `feat(npc): add meeting-host and arcade-host NPCs`            | NPC JSONs, index                 | JSON valid   |
| B2     | 2.5         | `test(npc): verify new NPC spawning (TDD GREEN)`              | -                                | test         |
| B3     | 3.1         | `test(facility): add tests for 16 facility types (TDD RED)`   | tests                            | typecheck    |
| B3     | 3.2-3.6     | `feat(facility): add zone facilities`                         | map JSONs                        | JSON valid   |
| B3     | 3.7         | `feat(facility): ensure plaza fountain`                       | plaza.json                       | JSON valid   |
| B3     | 3.8         | `feat(facility): register handlers for all 16 facility types` | FacilityHandlers.ts, GameRoom.ts | test         |
| B4     | 4.1         | `test(aic): add observe affordance tests (TDD RED)`           | tests                            | typecheck    |
| B4     | 4.2         | `fix(aic): include facility affordances in observe response`  | observe.ts                       | test         |
| B5     | 5.1-5.6     | `test(e2e): add scenarios S1-S6`                              | e2e tests                        | playwright   |
| B5     | 5.7         | `chore: verify CI and Docker deployment`                      | -                                | CI + docker  |

---

## Success Criteria

### Verification Commands

```bash
# Type check
pnpm typecheck  # Expected: 0 errors

# All tests
pnpm test  # Expected: All pass

# Lint
pnpm lint  # Expected: 0 errors

# E2E tests
pnpm playwright test  # Expected: S1-S6 pass

# Docker
docker build -t openclaw .  # Expected: Success
docker run -p 2567:2567 openclaw  # Expected: Health check 200
```

### Final Checklist

- [ ] 6 zones defined (lobby, office, meeting-center, lounge-cafe, arcade, plaza)
- [ ] 12 NPCs spawning (10 existing + meeting-host + arcade-host)
- [ ] 16 facilities registered with handlers
- [ ] AIC observe returns facility affordances
- [ ] All TDD tests pass (RED→GREEN complete)
- [ ] E2E scenarios S1-S7 pass
- [ ] Docker container builds and runs
- [ ] CI pipeline passes

---

## Holdout Scenarios (Not Detailed)

The following scenarios are mentioned for completeness but not detailed in this plan:

- **S7**: Performance stress test with 50+ concurrent agents
- **S8**: NPC schedule transitions over simulated 24-hour cycle
- **S9**: Meeting room reservation and access control
- **S10**: Kanban board state synchronization
- **S11**: Whiteboard collaborative editing
- **S12**: Voting system in meetings

These can be added as a follow-up plan after core implementation is verified.
