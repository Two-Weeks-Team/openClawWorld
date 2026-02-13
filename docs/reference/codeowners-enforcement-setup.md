# CODEOWNERS Enforcement Setup

This project uses `.github/CODEOWNERS` for map-stack review routing.

CODEOWNERS alone does not block merges. Branch protection is configured to enforce approvals.

## Current Branch Protection (main)

**Status: ACTIVE** (Applied: 2026-02-13)

### Required Status Checks

All of the following CI jobs must pass before merging:

| Job Name | Purpose |
|----------|---------|
| Codegen Freshness | Ensures generated code is up to date |
| Lint & Format | Code style and formatting |
| Type Check | TypeScript type validation |
| Build | Package compilation |
| Unit Tests | Test suite execution |
| Map Consistency | Map file sync and validation |

### Pull Request Requirements

| Setting | Value |
|---------|-------|
| Required approving reviews | 1 |
| Require review from Code Owners | Yes |
| Dismiss stale reviews on new commits | Yes |
| Direct push to main | Blocked |
| Force push | Blocked |

## Teams (CODEOWNERS)

The following teams are referenced in `.github/CODEOWNERS`:

- `@Two-Weeks-Team/maintainers` - Default owners
- `@Two-Weeks-Team/map-reviewers` - Map stack changes
- `@Two-Weeks-Team/asset-reviewers` - Asset pipeline changes
- `@Two-Weeks-Team/server-reviewers` - Server core changes
- `@Two-Weeks-Team/client-reviewers` - Client core changes

## Verification

### Automated Verification

```bash
# Check current branch protection status
gh api repos/Two-Weeks-Team/openClawWorld/branches/main/protection \
  --jq '{
    required_checks: .required_status_checks.contexts,
    reviews: {
      required_approving_review_count: .required_pull_request_reviews.required_approving_review_count,
      require_code_owner_reviews: .required_pull_request_reviews.require_code_owner_reviews
    },
    direct_push_blocked: (.allow_force_pushes.enabled == false)
  }'
```

### Manual Verification

1. Modify a path owned by CODEOWNERS (e.g., `world/packs/base/maps/`)
2. Open a PR
3. Verify:
   - GitHub automatically requests the mapped team reviewers
   - Merge is blocked until required approvals are satisfied
   - All CI checks must pass before merge is allowed

## Updating Protection Rules

To modify branch protection rules via CLI:

```bash
# View current settings
gh api repos/Two-Weeks-Team/openClawWorld/branches/main/protection

# Update settings (requires admin access)
gh api repos/Two-Weeks-Team/openClawWorld/branches/main/protection -X PUT --input protection.json
```

See GitHub documentation: https://docs.github.com/en/rest/branches/branch-protection
