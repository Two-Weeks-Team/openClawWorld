## Summary

<!-- Brief description of what this PR does -->

## Related Issues

<!-- Link related issues using "Fixes #123" or "Closes #123" syntax -->

---

## Checklist

### General

- [ ] Code follows project conventions
- [ ] Self-reviewed the changes
- [ ] No new TypeScript errors introduced
- [ ] Tests pass locally (`pnpm test`)

### Map Changes (if applicable)

> Complete this section if your PR affects any map-related files:
>
> - `world/packs/base/maps/*.json`
> - `packages/server/assets/maps/*.json`
> - `packages/client/public/assets/maps/*.json`
> - `packages/shared/src/world.ts`
> - `packages/server/src/world/WorldPackLoader.ts`
> - `tools/kenney-curation.json`
> - `tools/extract_*.py`
> - `world/packs/base/npcs/*.json`

- [ ] **Not applicable** (no map-related changes)

<details>
<summary>Map Change Checklist (expand if applicable)</summary>

#### Verification Commands

- [ ] `pnpm verify:map-change` executed (recommended unified command)
- [ ] `pnpm sync-maps` executed
- [ ] `node scripts/verify-map-stack-consistency.mjs` passes
- [ ] `pnpm build` succeeds
- [ ] `pnpm test` passes

#### Contract Checks

- [ ] Map source/server/client hashes match
- [ ] Tile size (16x16) contract maintained
- [ ] Spawn coordinates within valid bounds
- [ ] Collision layer values are 0 or 1 only
- [ ] NPC IDs match atlas frame keys
- [ ] Minimap regression checked (zone/road/water + viewport alignment)
- [ ] No hardcoded zone/coordinate values added

#### Documentation

- [ ] Evidence provided using [template](docs/templates/map-change-evidence.md)
- [ ] README links verified (if applicable)
- [ ] Map-related docs updated (if applicable)

</details>

---

## Verification

```bash
# Paste verification output here
pnpm typecheck    # Result:
pnpm lint         # Result:
pnpm build        # Result:
pnpm test         # Result:
```

## Screenshots (if applicable)

<!-- Add screenshots for UI changes -->

## Additional Notes

<!-- Any additional context for reviewers -->
