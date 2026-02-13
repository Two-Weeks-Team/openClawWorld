# Map Change Evidence Example

This is a sample filled report based on the template in `map-change-evidence.md`.

---

## Change Summary

**Issue Link**: #248
**Change Type**: [ ] New zone | [ ] Zone modification | [ ] Tileset update | [x] NPC change | [ ] Collision fix | [ ] Other

### Description
Updated NPC zone mapping in `WorldPackLoader` to use NPC JSON `zone` fields as the source of truth.

---

## Affected Files

| File Path | Change Type |
|-----------|-------------|
| `packages/server/src/world/WorldPackLoader.ts` | Modified |
| `world/packs/base/npcs/*.json` | Reviewed (no direct edits) |

---

## Verification Results

### 1. Map Sync
```bash
pnpm sync-maps
```
**Result**: [x] Pass | [ ] Fail
**Hash Match**: [x] Yes | [ ] No

### 2. Consistency Check
```bash
node scripts/verify-map-stack-consistency.mjs
```
**Result**: [x] Pass | [ ] Fail
**Output**:
```text
✅ MAP STACK CONSISTENCY VERIFIED
```

### 3. Build
```bash
pnpm build
```
**Result**: [x] Pass | [ ] Fail

### 4. Tests
```bash
pnpm test
```
**Result**: [x] Pass | [ ] Fail
**Tests Passed**: 994/994

---

## Visual Verification (if applicable)

### Before
N/A (server-side mapping update)

### After
N/A (server-side mapping update)

---

## Checklist

### Mandatory Checks
- [x] Map source/server/client hash match verified
- [x] Tile size (16x16) contract maintained
- [x] Spawn coordinates within valid bounds
- [x] Collision layer values are 0 or 1 only
- [x] NPC IDs match atlas frame keys
- [x] No hardcoded zone/coordinate values added

### Documentation
- [x] README links verified (if applicable)
- [x] Map-related docs updated (if applicable)
- [ ] AGENTS.md regenerated (if structure changed)

---

## Remaining Risks

| Risk | Mitigation | Status |
|------|------------|--------|
| Zone field typo in NPC JSON | `verify-map-stack-consistency` + JSON review | Resolved |

---

## Rollback Plan

If this change causes issues:
1. Revert the PR
2. Run `pnpm sync-maps` to restore previous state
3. Verify with `node scripts/verify-map-stack-consistency.mjs`

---

## Reviewer Notes

This example is illustrative only. Replace commands/results with evidence from your PR.
