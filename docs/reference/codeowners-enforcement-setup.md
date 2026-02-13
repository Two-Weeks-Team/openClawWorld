# CODEOWNERS Enforcement Setup

This project uses `.github/CODEOWNERS` for map-stack review routing.

CODEOWNERS alone does not block merges. To enforce approvals, configure branch protection.

## Required GitHub Setup

1. Create teams used in `.github/CODEOWNERS`:
   - `@Two-Weeks-Team/maintainers`
   - `@Two-Weeks-Team/map-reviewers`
   - `@Two-Weeks-Team/asset-reviewers`
   - `@Two-Weeks-Team/server-reviewers`
   - `@Two-Weeks-Team/client-reviewers`

2. Open repository settings:
   - `Settings -> Branches -> Branch protection rules`

3. For the protected branch (`main`):
   - Enable `Require a pull request before merging`
   - Enable `Require approvals`
   - Enable `Require review from Code Owners`

4. Optional hardening:
   - Enable `Dismiss stale pull request approvals when new commits are pushed`
   - Enable `Require status checks to pass before merging`

## Verification

After setup, modify a path owned by CODEOWNERS (for example `world/packs/base/maps/`) and open a PR.
GitHub should automatically request the mapped team reviewers and block merge until required approvals are satisfied.
