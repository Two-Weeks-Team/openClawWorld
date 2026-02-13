# Map Change Evidence Template

Use this template when submitting PRs that affect map-related files.

---

## Change Summary

**Issue Link**: #[ISSUE_NUMBER]  
**Change Type**: [ ] New zone | [ ] Zone modification | [ ] Tileset update | [ ] NPC change | [ ] Collision fix | [ ] Other

### Description
<!-- Brief description of what was changed and why -->

---

## Affected Files

| File Path | Change Type |
|-----------|-------------|
| `world/packs/base/maps/grid_town_outdoor.json` | Modified/Added |
| <!-- Add more affected files --> | |

---

## Verification Results

### 1. Map Sync
```bash
pnpm sync-maps
```
**Result**: [ ] Pass | [ ] Fail  
**Hash Match**: [ ] Yes | [ ] No

### 2. Consistency Check
```bash
node scripts/verify-map-stack-consistency.mjs
```
**Result**: [ ] Pass | [ ] Fail  
**Output**:
```text
<!-- Paste verification output here -->
```

### 3. Build
```bash
pnpm build
```
**Result**: [ ] Pass | [ ] Fail

### 4. Tests
```bash
pnpm test
```
**Result**: [ ] Pass | [ ] Fail  
**Tests Passed**: X/Y

---

## Visual Verification (if applicable)

### Before
<!-- Screenshot or description of before state -->

### After
<!-- Screenshot or description of after state -->

---

## Checklist

### Mandatory Checks
- [ ] Map source/server/client hash match verified
- [ ] Tile size (16x16) contract maintained
- [ ] Spawn coordinates within valid bounds
- [ ] Collision layer values are 0 or 1 only
- [ ] NPC IDs match atlas frame keys
- [ ] No hardcoded zone/coordinate values added

### Documentation
- [ ] README links verified (if applicable)
- [ ] Map-related docs updated (if applicable)
- [ ] AGENTS.md regenerated (if structure changed)

---

## Remaining Risks

| Risk | Mitigation | Status |
|------|------------|--------|
| <!-- Describe any remaining risks --> | <!-- How it will be addressed --> | Resolved / Deferred |

---

## Rollback Plan

If this change causes issues:
1. Revert the PR
2. Run `pnpm sync-maps` to restore previous state
3. Verify with `node scripts/verify-map-stack-consistency.mjs`

---

## Reviewer Notes

<!-- Any special notes for reviewers -->
