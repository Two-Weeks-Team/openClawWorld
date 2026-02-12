# Claude Code Commands for OpenClawWorld

This directory contains custom slash commands for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (Anthropic's official CLI).

## Available Commands

| Command                         | Description                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `/openclaw-resident-agent-loop` | Autonomous world simulation that continuously discovers bugs and files GitHub issues |

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
/openclaw-resident-agent-loop --stress=high --agents=20
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
