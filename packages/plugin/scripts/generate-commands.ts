#!/usr/bin/env node
/**
 * CLI Command Generator
 * Generates CLI-specific command files from unified command definitions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ClaudeAdapter,
  OpenCodeAdapter,
  GeminiAdapter,
  CodexAdapter,
  type UnifiedCommand,
  type ToolInfo,
} from '../src/adapters/index.js';
import { GENERATED_TOOLS } from '../src/generated/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '../../..');

// Map tools to their detailed descriptions
function getToolDetails(): ToolInfo[] {
  return [
    {
      name: 'ocw.observe',
      description:
        'Observe the world state around your agent. Returns nearby entities, players, objects, and terrain information.',
      required: true,
      sideEffects: 'none',
      parameters: [
        {
          name: 'agentId',
          type: 'string',
          required: true,
          description: 'Your unique agent identifier',
        },
        {
          name: 'roomId',
          type: 'string',
          required: true,
          description: 'The room/world to observe',
        },
        {
          name: 'radius',
          type: 'number',
          required: false,
          description: 'Observation radius in pixels (default: 100)',
        },
        {
          name: 'detail',
          type: 'string',
          required: false,
          description: 'Detail level: basic, full, or debug',
        },
      ],
    },
    {
      name: 'ocw.move_to',
      description: 'Move your agent to a target position in the world.',
      required: false,
      sideEffects: 'world',
      parameters: [
        {
          name: 'agentId',
          type: 'string',
          required: true,
          description: 'Your unique agent identifier',
        },
        {
          name: 'roomId',
          type: 'string',
          required: true,
          description: 'The room/world to move in',
        },
        { name: 'x', type: 'number', required: true, description: 'Target X coordinate' },
        { name: 'y', type: 'number', required: true, description: 'Target Y coordinate' },
        {
          name: 'speed',
          type: 'number',
          required: false,
          description: 'Movement speed multiplier',
        },
      ],
    },
    {
      name: 'ocw.interact',
      description: 'Interact with an object or entity in the world.',
      required: false,
      sideEffects: 'world',
      parameters: [
        {
          name: 'agentId',
          type: 'string',
          required: true,
          description: 'Your unique agent identifier',
        },
        {
          name: 'roomId',
          type: 'string',
          required: true,
          description: 'The room/world where interaction occurs',
        },
        {
          name: 'targetId',
          type: 'string',
          required: true,
          description: 'ID of the entity or object to interact with',
        },
        {
          name: 'action',
          type: 'string',
          required: false,
          description: 'Type of interaction (greet, use, examine, etc.)',
        },
      ],
    },
    {
      name: 'ocw.chat_send',
      description: 'Send a chat message to nearby players and agents.',
      required: false,
      sideEffects: 'chat',
      parameters: [
        {
          name: 'agentId',
          type: 'string',
          required: true,
          description: 'Your unique agent identifier',
        },
        {
          name: 'roomId',
          type: 'string',
          required: true,
          description: 'The room/world to send message in',
        },
        {
          name: 'message',
          type: 'string',
          required: true,
          description: 'The message content to send',
        },
        {
          name: 'type',
          type: 'string',
          required: false,
          description: 'Message type: say, shout, or whisper',
        },
      ],
    },
    {
      name: 'ocw.chat_observe',
      description: 'Observe recent chat messages in your vicinity.',
      required: false,
      sideEffects: 'chat',
      parameters: [
        {
          name: 'agentId',
          type: 'string',
          required: true,
          description: 'Your unique agent identifier',
        },
        {
          name: 'roomId',
          type: 'string',
          required: true,
          description: 'The room/world to observe chat in',
        },
        {
          name: 'limit',
          type: 'number',
          required: false,
          description: 'Maximum number of messages to retrieve (default: 10)',
        },
        {
          name: 'since',
          type: 'number',
          required: false,
          description: 'Timestamp to retrieve messages since',
        },
      ],
    },
    {
      name: 'ocw.poll_events',
      description: 'Poll for world events and updates affecting your agent.',
      required: true,
      sideEffects: 'none',
      parameters: [
        {
          name: 'agentId',
          type: 'string',
          required: true,
          description: 'Your unique agent identifier',
        },
        {
          name: 'roomId',
          type: 'string',
          required: true,
          description: 'The room/world to poll events from',
        },
        {
          name: 'lastEventId',
          type: 'string',
          required: false,
          description: 'Last processed event ID for delta updates',
        },
      ],
    },
  ];
}

// Create the unified OCW-tools command
function createOCWToolsCommand(): UnifiedCommand {
  const tools = GENERATED_TOOLS.map(t => t.name);
  const toolDetails = getToolDetails();

  const instructions = `Access and use OpenClawWorld AI agent tools to interact with the virtual world.

## Available Tools

| Tool | Description | Required | Side Effects |
|------|-------------|----------|--------------|
${toolDetails.map(t => `| ${t.name} | ${t.description} | ${t.required ? 'Yes' : 'No'} | ${t.sideEffects} |`).join('\n')}

## Tool Reference

### ocw.observe
Get a snapshot of the world around your agent.
\`\`\`typescript
ocw.observe({ agentId: "my_agent", roomId: "default", radius: 150 })
\`\`\`

### ocw.move_to
Move your agent to a target location.
\`\`\`typescript
ocw.move_to({ agentId: "my_agent", roomId: "default", x: 1000, y: 1000 })
\`\`\`

### ocw.interact
Interact with objects or other entities.
\`\`\`typescript
ocw.interact({ agentId: "my_agent", roomId: "default", targetId: "npc_123", action: "greet" })
\`\`\`

### ocw.chat_send
Send messages to nearby agents and players.
\`\`\`typescript
ocw.chat_send({ agentId: "my_agent", roomId: "default", message: "Hello world!" })
\`\`\`

### ocw.chat_observe
Read recent chat messages.
\`\`\`typescript
ocw.chat_observe({ agentId: "my_agent", roomId: "default", limit: 20 })
\`\`\`

### ocw.poll_events
Poll for world events and state changes.
\`\`\`typescript
ocw.poll_events({ agentId: "my_agent", roomId: "default" })
\`\`\`

## Usage Patterns

1. **Observe-Act Loop**: Call ocw.observe, decide on action, execute with ocw.move_to/ocw.interact
2. **Chat Participation**: Use ocw.chat_observe to listen, ocw.chat_send to respond
3. **Event-Driven**: Poll ocw.poll_events regularly to react to world changes

## Prerequisites

- Server must be running (pnpm dev:server or docker compose up)
- Agent must be registered via /aic/v0.1/register endpoint
- Use the token from registration in subsequent calls`;

  return {
    name: 'ocw-tools',
    description: 'Access OpenClawWorld AI agent tools for world interaction',
    tools,
    arguments: '[--tool=TOOL_NAME] [--agentId=ID]',
    instructions,
    toolDetails,
  };
}

// Generate commands for all CLI formats
function generateCommands(): void {
  const command = createOCWToolsCommand();

  // Claude Code (Markdown)
  const claudeAdapter = new ClaudeAdapter({ outputDir: '.claude/commands', extension: 'md' });
  const claudeOutput = claudeAdapter.generate(command);
  const claudeDir = path.join(PROJECT_ROOT, '.claude', 'commands');
  fs.mkdirSync(claudeDir, { recursive: true });
  fs.writeFileSync(path.join(claudeDir, 'ocw-tools.md'), claudeOutput);
  console.log('✓ Generated: .claude/commands/ocw-tools.md');

  // OpenCode (Markdown)
  const opencodeAdapter = new OpenCodeAdapter({ outputDir: '.opencode/command', extension: 'md' });
  const opencodeOutput = opencodeAdapter.generate(command);
  const opencodeDir = path.join(PROJECT_ROOT, '.opencode', 'command');
  fs.mkdirSync(opencodeDir, { recursive: true });
  fs.writeFileSync(path.join(opencodeDir, 'ocw-tools.md'), opencodeOutput);
  console.log('✓ Generated: .opencode/command/ocw-tools.md');

  // Gemini CLI (TOML)
  const geminiAdapter = new GeminiAdapter({ outputDir: '.gemini/commands', extension: 'toml' });
  const geminiOutput = geminiAdapter.generate(command);
  const geminiDir = path.join(PROJECT_ROOT, '.gemini', 'commands');
  fs.mkdirSync(geminiDir, { recursive: true });
  fs.writeFileSync(path.join(geminiDir, 'ocw-tools.toml'), geminiOutput);
  console.log('✓ Generated: .gemini/commands/ocw-tools.toml');

  // Codex CLI (AGENTS.md)
  const codexAdapter = new CodexAdapter({ outputDir: '.codex', extension: 'md' });
  const codexOutput = codexAdapter.generate(command);
  const codexDir = path.join(PROJECT_ROOT, '.codex');
  fs.mkdirSync(codexDir, { recursive: true });
  fs.writeFileSync(path.join(codexDir, 'AGENTS.md'), codexOutput);
  console.log('✓ Generated: .codex/AGENTS.md');

  console.log('\n✅ All CLI command files generated successfully!');
}

// Main execution
try {
  generateCommands();
} catch (error) {
  console.error('❌ Error generating commands:', error);
  process.exit(1);
}
