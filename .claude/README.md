# Claude Code Commands for OpenClawWorld

This directory contains custom slash commands for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (Anthropic's official CLI).

## Quick Compatibility Matrix

This section is the single-source quick reference for command availability across supported agent CLIs.

| CLI         | Resident Loop Command           | ocw-tools Command | Notes                                            |
| ----------- | ------------------------------- | ----------------- | ------------------------------------------------ |
| Claude Code | `/openclaw-resident-agent-loop` | `/ocw-tools`      | Uses `.claude/commands/`                         |
| OpenCode    | `/openclaw-resident-agent-loop` | `/ocw-tools`      | Uses `.opencode/command/`                        |
| Gemini CLI  | `openclaw-resident-agent-loop`  | `ocw-tools`       | Uses `.gemini/commands/*.toml`                   |
| Codex CLI   | `openclaw-resident-agent-loop`  | `ocw-tools`       | Both commands are included in `.codex/AGENTS.md` |

## Runtime Checklist (Resident Loop)

Before running the resident loop in any CLI, verify:

```bash
curl -fsS http://localhost:2567/health
gh auth status
pnpm --version
```

Start command (shell fallback for any CLI):

```bash
pnpm resident-agent-loop -- --stress medium --agents 10
```

## 3-Minute Quick Start (All Supported CLIs)

1. Install and verify prerequisites:

```bash
pnpm install
pnpm dev:server  # or: docker compose up -d
curl -fsS http://localhost:2567/health
gh auth status
```

2. Open your target CLI from repository root.
3. Run the resident-loop command for your CLI:

- Claude Code: `/openclaw-resident-agent-loop --stress medium --agents 10`
- OpenCode: `/openclaw-resident-agent-loop --stress medium --agents 10`
- Gemini CLI: `openclaw-resident-agent-loop --stress medium --agents 10`
- Codex CLI: `openclaw-resident-agent-loop --stress medium --agents 10`

4. Universal fallback for all environments:

```bash
pnpm resident-agent-loop -- --stress medium --agents 10
```

5. Stop with `Ctrl+C` for graceful shutdown.

## Available Commands

| Command                         | Description                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `/openclaw-resident-agent-loop` | Autonomous world simulation that continuously discovers bugs and files GitHub issues |
| `/ocw-tools`                    | Reference for all OpenClawWorld AIC API tools (auto-generated from OpenAPI spec)     |

## Installation

### Option 1: Automatic (Recommended)

The commands in `.claude/commands/` are automatically available when you open this project with Claude Code.

```bash
# Just open the project
cd openClawWorld
claude
# Commands are ready to use!
```

### Option 2: Manual Installation (Global Access)

To use these commands from any directory:

```bash
# Copy to your user-level Claude commands
mkdir -p ~/.claude/commands
cp .claude/commands/*.md ~/.claude/commands/
```

## Usage

### /openclaw-resident-agent-loop

Runs an autonomous agent loop that continuously tests the OpenClawWorld server and files GitHub issues when problems are discovered.

```bash
# In Claude Code, type:
/openclaw-resident-agent-loop

# With arguments:
/openclaw-resident-agent-loop --stress high --agents 20
/openclaw-resident-agent-loop --chaos --dry-run
```

#### Prerequisites

1. **Server Running**: `pnpm dev:server` or `docker compose up -d`
2. **GitHub CLI**: `gh auth login`
3. **Dependencies**: `pnpm install`

#### Arguments

| Argument    | Default  | Description                      |
| ----------- | -------- | -------------------------------- |
| `--stress`  | `medium` | `low`, `medium`, or `high`       |
| `--agents`  | `10`     | Number of AI agents              |
| `--chaos`   | `false`  | Enable chaos testing             |
| `--dry-run` | `false`  | Log issues without creating them |

### /ocw-tools

Quick reference for all OpenClawWorld AIC API tools. This command is auto-generated from the OpenAPI specification.

```bash
# In Claude Code, type:
/ocw-tools
```

Lists all available tools:

- `ocw.observe` - Observe the world around the agent
- `ocw.move_to` - Move agent to a destination tile
- `ocw.interact` - Interact with a world object
- `ocw.chat_send` - Send a chat message
- `ocw.chat_observe` - Get recent chat messages
- `ocw.poll_events` - Poll for world events

## Multi-CLI Support

This project supports multiple AI coding assistants. Both `ocw-tools` and `openclaw-resident-agent-loop` are auto-generated from unified command definitions:

| CLI             | Config Location      | Commands                                                 |
| --------------- | -------------------- | -------------------------------------------------------- |
| **Claude Code** | `.claude/commands/`  | `/ocw-tools`, `/openclaw-resident-agent-loop`            |
| **OpenCode**    | `.opencode/command/` | `/ocw-tools`, `/openclaw-resident-agent-loop`            |
| **Gemini CLI**  | `.gemini/commands/`  | `ocw-tools`, `openclaw-resident-agent-loop`              |
| **Codex CLI**   | `.codex/AGENTS.md`   | `ocw-tools`, `openclaw-resident-agent-loop` (in context) |

To regenerate commands after command/OpenAPI changes:

```bash
pnpm generate
```

For command expansion, update unified definitions in `packages/plugin/scripts/generate-commands.ts` and run `pnpm generate:commands`.

### Extending for Other Teams

1. Add or update commands in `packages/plugin/scripts/generate-commands.ts`.
2. Regenerate all CLI artifacts with `pnpm generate:commands`.
3. Commit generated outputs together with source changes so CLI behavior stays synchronized.

## Creating New Commands

1. Create a new `.md` file in `.claude/commands/`
2. Add frontmatter with description and allowed tools
3. Write the command instructions in Markdown

Example structure:

```markdown
---
description: "Brief description of what the command does"
allowed-tools: Bash, Read, Write, Edit
argument-hint: [--option1] [--option2=value]
---

# /command-name

Instructions for the AI to follow...
```

## Learn More

- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [Slash Commands Guide](https://docs.anthropic.com/en/docs/claude-code/slash-commands)
- [OpenClawWorld Documentation](../docs/)
