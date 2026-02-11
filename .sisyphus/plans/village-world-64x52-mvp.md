# Village World 64x52 MVP Execution Checklist

## Scope

Deliver a shippable unified `64x52` tile world (`2048x1664 @ 32px`) with:

- 6 logical zones mapped inside one physical map
- real (non-reference-sliced) pixel tileset with clear license
- `>=12` interactions exposed in AIC observe/interact
- `>=8` NPCs with dialog guidance
- required AIC life-loop passing
- CI green, merged to main, Docker rebuilt

---

## Execution Rules

- Docker is source of truth.
- One bundle = one QA deliverable (worktree-friendly).
- Every bundle must produce evidence artifacts under `.sisyphus/evidence/`.
- Do not proceed to next bundle until current bundle acceptance checks pass.
- All commands run from repo root unless noted.

---

## Dependency Graph

- `B1` -> (`B2` and `B3` in parallel) -> `B4`

---

## Evidence Directory Convention

Create per-bundle folders:

- `.sisyphus/evidence/B1/`
- `.sisyphus/evidence/B2/`
- `.sisyphus/evidence/B3/`
- `.sisyphus/evidence/B4/`

Suggested files:

- command logs: `*.log`
- API dumps: `*.json`
- screenshots: `*.png`
- metadata/checksums: `*.txt`

---

## Bundle B1 - Unified Map Foundation

### B1-T01 - Create unified map spec-aligned JSON

- **category**: `unspecified-high`
- **skills**: `[]`
- **goal**: Add `world/packs/base/maps/village_outdoor.json` with `64x52`, tile `32x32`, layered Tiled JSON.
- **commands**:
  - `node -e "const fs=require('fs');const p='world/packs/base/maps/village_outdoor.json';const m=JSON.parse(fs.readFileSync(p,'utf8'));if(m.width!==64||m.height!==52||m.tilewidth!==32||m.tileheight!==32)process.exit(1);console.log('OK map dimensions');"`
  - `node -e "const fs=require('fs');const m=JSON.parse(fs.readFileSync('world/packs/base/maps/village_outdoor.json','utf8'));const names=(m.layers||[]).map(l=>l.name);if(!names.includes('ground')||!names.includes('collision')||!names.includes('objects'))process.exit(1);console.log('OK required layers');"`
- **evidence paths**:
  - `.sisyphus/evidence/B1/B1-T01-map-validate.log`
- **programmatic acceptance criteria**:
  - Both commands exit `0`.
  - Output includes `OK map dimensions` and `OK required layers`.

### B1-T02 - Remap ZoneSystem bounds to 64x52 layout

- **category**: `unspecified-high`
- **skills**: `[]`
- **goal**: Update `DEFAULT_ZONE_BOUNDS` to match reference-derived pixel bounds:
  - lobby `(192,96,736,416)`
  - office `(1024,192,448,448)`
  - meeting-center `(96,928,512,576)`
  - lounge-cafe `(704,928,512,320)`
  - arcade `(1344,736,608,416)`
  - plaza `(1344,1152,608,416)`
- **commands**:
  - `pnpm test tests/unit/zone-system-64x52.test.ts`
  - `pnpm typecheck`
- **evidence paths**:
  - `.sisyphus/evidence/B1/B1-T02-zone-tests.log`
  - `.sisyphus/evidence/B1/B1-T02-typecheck.log`
- **programmatic acceptance criteria**:
  - Both commands exit `0`.
  - Zone tests include all 6 zone IDs and boundary assertions.

### B1-T03 - Make world pack load unified map as source

- **category**: `unspecified-high`
- **skills**: `[]`
- **goal**: Ensure server load path uses unified world map semantics without breaking facility/NPC extraction.
- **commands**:
  - `pnpm test tests/integration/worldpack-unified-map.test.ts`
  - `pnpm build`
- **evidence paths**:
  - `.sisyphus/evidence/B1/B1-T03-worldpack-integration.log`
  - `.sisyphus/evidence/B1/B1-T03-build.log`
- **programmatic acceptance criteria**:
  - Both commands exit `0`.
  - Integration test asserts loaded map width `64`, height `52`, and non-empty objects array.

---

## Bundle B2 - Content Integration (Map + Assets + Interactions + NPC)

### B2-T01 - Add licensed pixel tileset assets (CC0 or self-made)

- **category**: `visual-engineering`
- **skills**: `["frontend-ui-ux"]`
- **goal**: Add production tileset and atlas metadata (no slicing from reference image), document license.
- **commands**:
  - `node -e "const fs=require('fs');if(!fs.existsSync('world/packs/base/assets/tilesets'))process.exit(1);if(!fs.existsSync('world/packs/base/assets/CREDITS.md'))process.exit(1);console.log('OK assets and credits');"`
  - `node -e "const fs=require('fs');const c=fs.readFileSync('world/packs/base/assets/CREDITS.md','utf8');if(!/CC0|Public Domain|self-made/i.test(c))process.exit(1);console.log('OK licensing markers');"`
- **evidence paths**:
  - `.sisyphus/evidence/B2/B2-T01-assets-check.log`
  - `.sisyphus/evidence/B2/B2-T01-credits-check.log`
- **programmatic acceptance criteria**:
  - Both commands exit `0`.
  - `CREDITS.md` includes source URL(s) and license marker(s).

### B2-T02 - Place >=12 facility objects with affordance-ready metadata

- **category**: `unspecified-high`
- **skills**: `[]`
- **goal**: Ensure `objects` layer includes facilities across six zones, including `reception_desk` and `kanban_terminal`.
- **commands**:
  - `node -e "const fs=require('fs');const m=JSON.parse(fs.readFileSync('world/packs/base/maps/village_outdoor.json','utf8'));const objs=(m.layers.find(l=>l.name==='objects')||{}).objects||[];const fac=objs.filter(o=>o.type==='facility'||(o.properties||[]).some(p=>p.name==='type'&&p.value==='facility'));if(fac.length<12)process.exit(1);const names=fac.map(o=>o.name);if(!names.includes('reception_desk')||!names.includes('kanban_terminal'))process.exit(1);console.log('OK facilities',fac.length);"`
- **evidence paths**:
  - `.sisyphus/evidence/B2/B2-T02-facility-count.log`
- **programmatic acceptance criteria**:
  - Command exits `0`.
  - Output includes `OK facilities` with count `>=12`.

### B2-T03 - Register/verify facility handlers for required actions

- **category**: `unspecified-high`
- **skills**: `[]`
- **goal**: Ensure interact handlers cover required facility actions used in life-loop and observe affordances.
- **commands**:
  - `pnpm test tests/unit/facility-handlers-coverage.test.ts`
  - `pnpm typecheck`
- **evidence paths**:
  - `.sisyphus/evidence/B2/B2-T03-facility-handler-tests.log`
  - `.sisyphus/evidence/B2/B2-T03-typecheck.log`
- **programmatic acceptance criteria**:
  - Both commands exit `0`.
  - Coverage test asserts handlers for `reception_desk`, `kanban_terminal`, and remaining mapped facilities.

### B2-T04 - Ensure >=8 NPCs with dialog guidance in unified map

- **category**: `quick`
- **skills**: `[]`
- **goal**: NPC definitions load; at least 8 are active with dialogue nodes and zone placement.
- **commands**:
  - `node -e "const fs=require('fs');const idx=JSON.parse(fs.readFileSync('world/packs/base/npcs/index.json','utf8'));if(!Array.isArray(idx.npcs)||idx.npcs.length<8)process.exit(1);let ok=0;for(const id of idx.npcs){const p='world/packs/base/npcs/'+id+'.json';if(!fs.existsSync(p))continue;const n=JSON.parse(fs.readFileSync(p,'utf8'));if(n.dialogue&&Object.keys(n.dialogue).length>0&&n.zone)ok++;}if(ok<8)process.exit(1);console.log('OK npc dialog count',ok);"`
  - `pnpm test tests/integration/npc-unified-map.test.ts`
- **evidence paths**:
  - `.sisyphus/evidence/B2/B2-T04-npc-json-check.log`
  - `.sisyphus/evidence/B2/B2-T04-npc-integration.log`
- **programmatic acceptance criteria**:
  - Both commands exit `0`.
  - Output includes `OK npc dialog count` with value `>=8`.

---

## Bundle B3 - AIC Life-Loop Verification

### B3-T01 - Observe includes facility affordances on unified map

- **category**: `unspecified-high`
- **skills**: `[]`
- **goal**: AIC observe returns nearby facilities with non-empty `affords`.
- **commands**:
  - `pnpm test tests/integration/aic-observe-facilities-64x52.test.ts`
- **evidence paths**:
  - `.sisyphus/evidence/B3/B3-T01-observe-tests.log`
- **programmatic acceptance criteria**:
  - Command exits `0`.
  - Test asserts at least one facility entity with `affords.length > 0`.

### B3-T02 - Run required life-loop scenario end-to-end

- **category**: `quick`
- **skills**: `[]`
- **goal**: Pass exact sequence:
  - `register -> observe -> moveTo(lobby) -> interact(reception_desk) -> moveTo(office) -> interact(kanban_terminal) -> chatSend("hello nearby") -> pollEvents`
- **commands**:
  - `docker compose up -d --build`
  - `node tests/scripts/aic-life-loop-64x52.mjs > .sisyphus/evidence/B3/B3-T02-life-loop.json`
  - `node -e "const fs=require('fs');const r=JSON.parse(fs.readFileSync('.sisyphus/evidence/B3/B3-T02-life-loop.json','utf8'));const req=['register','observe','moveTo_lobby','interact_reception_desk','moveTo_office','interact_kanban_terminal','chatSend','pollEvents'];for(const k of req){if(!r.steps||r.steps[k]!=='ok')process.exit(1)}console.log('OK life-loop');"`
- **evidence paths**:
  - `.sisyphus/evidence/B3/B3-T02-life-loop.json`
  - `.sisyphus/evidence/B3/B3-T02-life-loop-assert.log`
- **programmatic acceptance criteria**:
  - All commands exit `0`.
  - Final assert outputs `OK life-loop`.

### B3-T03 - Verify zone transition and event emission during move

- **category**: `quick`
- **skills**: `[]`
- **goal**: `moveTo` and `pollEvents` expose expected zone enter/exit success events.
- **commands**:
  - `pnpm test tests/integration/aic-zone-events-64x52.test.ts`
- **evidence paths**:
  - `.sisyphus/evidence/B3/B3-T03-zone-event-tests.log`
- **programmatic acceptance criteria**:
  - Command exits `0`.
  - Tests assert presence of `zone.enter` and successful interaction events.

---

## Bundle B4 - CI, Merge, Docker Rebuild

### B4-T01 - CI-equivalent verification

- **category**: `quick`
- **skills**: `[]`
- **goal**: Match `.github/workflows/ci.yml` checks.
- **commands**:
  - `pnpm build`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm format:check`
  - `pnpm test -- --coverage`
- **evidence paths**:
  - `.sisyphus/evidence/B4/B4-T01-build.log`
  - `.sisyphus/evidence/B4/B4-T01-typecheck.log`
  - `.sisyphus/evidence/B4/B4-T01-lint.log`
  - `.sisyphus/evidence/B4/B4-T01-format.log`
  - `.sisyphus/evidence/B4/B4-T01-test-coverage.log`
- **programmatic acceptance criteria**:
  - Every command exits `0`.

### B4-T02 - Worktree bundle commit + PR

- **category**: `quick`
- **skills**: `["git-master"]`
- **goal**: Produce clean bundle commit history and open PR with evidence checklist.
- **commands**:
  - `git status --short`
  - `git add -A && git commit -m "feat(world): ship unified 64x52 village_outdoor MVP with AIC life-loop"`
  - `git push -u origin <bundle-branch>`
  - `gh pr create --title "Village 64x52 MVP: unified map + AIC life-loop" --body-file .sisyphus/evidence/B4/pr-body.md`
- **evidence paths**:
  - `.sisyphus/evidence/B4/B4-T02-git-status.log`
  - `.sisyphus/evidence/B4/B4-T02-pr-url.txt`
- **programmatic acceptance criteria**:
  - Commit created (non-empty diff).
  - PR URL captured in `B4-T02-pr-url.txt`.

### B4-T03 - Merge main and Docker rebuild verification

- **category**: `quick`
- **skills**: `["git-master"]`
- **goal**: Merge and verify runtime health from Docker.
- **commands**:
  - `gh pr merge <PR_NUMBER> --merge --delete-branch`
  - `git checkout main && git pull`
  - `docker compose up -d --build`
  - `docker compose ps`
  - `curl -sf http://localhost:2567/health`
- **evidence paths**:
  - `.sisyphus/evidence/B4/B4-T03-compose-ps.log`
  - `.sisyphus/evidence/B4/B4-T03-health.json`
- **programmatic acceptance criteria**:
  - Merge command exits `0`.
  - `curl -sf` exits `0`.
  - `docker compose ps` shows server container as healthy/running.

---

## Bundle Exit Gates

### B1 Exit Gate

- `B1-T01~T03` all passed with evidence present.

### B2 Exit Gate

- `B2-T01~T04` all passed.
- Facility count `>=12`, NPC dialog count `>=8`.

### B3 Exit Gate

- `B3-T01~T03` all passed.
- Life-loop JSON includes all required step keys with value `ok`.

### B4 Exit Gate (Release Gate)

- CI-equivalent all green.
- PR merged to main.
- Docker rebuilt and `/health` successful.

---

## Final MVP Done Definition (Programmatic)

Run and require success:

1. `pnpm build`
2. `pnpm typecheck`
3. `pnpm lint`
4. `pnpm format:check`
5. `pnpm test -- --coverage`
6. `node tests/scripts/aic-life-loop-64x52.mjs`
7. `docker compose up -d --build`
8. `curl -sf http://localhost:2567/health`

All must exit `0`.

---

## Delegate Task Quick Matrix

| Task ID | category           | skills           |
| ------- | ------------------ | ---------------- |
| B1-T01  | unspecified-high   | []               |
| B1-T02  | unspecified-high   | []               |
| B1-T03  | unspecified-high   | []               |
| B2-T01  | visual-engineering | [frontend-ui-ux] |
| B2-T02  | unspecified-high   | []               |
| B2-T03  | unspecified-high   | []               |
| B2-T04  | quick              | []               |
| B3-T01  | unspecified-high   | []               |
| B3-T02  | quick              | []               |
| B3-T03  | quick              | []               |
| B4-T01  | quick              | []               |
| B4-T02  | quick              | [git-master]     |
| B4-T03  | quick              | [git-master]     |
