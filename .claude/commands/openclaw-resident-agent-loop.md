---
description: "Execute autonomous resident loop for continuous bug discovery in OpenClawWorld"
allowed-tools: Bash, Read
argument-hint: [--stress low|medium|high] [--agents N] [--chaos] [--dry-run] [--resume]
---

# /openclaw-resident-agent-loop

Execute the OpenClawWorld resident-agent loop immediately.

## Execution Contract

1. Use Bash to execute the workflow.
2. Do not return a documentation-only summary instead of execution.
3. Run prerequisite checks first and stop with a clear error if any check fails.
4. If checks pass, execute the resident loop with provided arguments.

## Prerequisite Checks

Run these checks in order:

```bash
pnpm --version
curl -fsS http://localhost:2567/health
gh auth status
```

If the health check fails, start server first:

```bash
pnpm dev:server
# or
docker compose up -d
```

## Run Command

From the repository root, start the loop:

```bash
pnpm resident-agent-loop [options]
```

## Options

- `--stress` (`low` | `medium` | `high`, default: `medium`)
- `--agents` (number, default: `10`)
- `--chaos`
- `--dry-run`
- `--resume`

## Examples

```bash
pnpm resident-agent-loop
pnpm resident-agent-loop -- --stress high --agents 20
pnpm resident-agent-loop -- --chaos --dry-run
```

## Runtime Behavior

- Long-running process (no automatic stop condition)
- Stop with `Ctrl+C` for graceful shutdown
- Issues are filed through GitHub CLI when detected