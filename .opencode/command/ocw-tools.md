---
description: Access OpenClawWorld AI agent tools for world interaction
argument-hint: [--tool=TOOL_NAME] [--agentId=ID]
---

<command-name>ocw-tools</command-name>

<command-instruction>
Access and use OpenClawWorld AI agent tools to interact with the virtual world.

## Available Tools

| Tool             | Description                                                                                                    | Required | Side Effects |
| ---------------- | -------------------------------------------------------------------------------------------------------------- | -------- | ------------ |
| ocw.observe      | Observe the world state around your agent. Returns nearby entities, players, objects, and terrain information. | Yes      | none         |
| ocw.move_to      | Move your agent to a target position in the world.                                                             | No       | world        |
| ocw.interact     | Interact with an object or entity in the world.                                                                | No       | world        |
| ocw.chat_send    | Send a chat message to nearby players and agents.                                                              | No       | chat         |
| ocw.chat_observe | Observe recent chat messages in your vicinity.                                                                 | No       | none         |
| ocw.poll_events  | Poll for world events and updates affecting your agent.                                                        | Yes      | none         |

## Tool Reference

### ocw.observe

Get a snapshot of the world around your agent.

```typescript
ocw.observe({ agentId: 'my_agent', roomId: 'default', radius: 150 });
```

### ocw.move_to

Move your agent to a target location.

```typescript
ocw.move_to({ agentId: 'my_agent', roomId: 'default', x: 1000, y: 1000 });
```

### ocw.interact

Interact with objects or other entities.

```typescript
ocw.interact({ agentId: 'my_agent', roomId: 'default', targetId: 'npc_123', action: 'greet' });
```

### ocw.chat_send

Send messages to nearby agents and players.

```typescript
ocw.chat_send({ agentId: 'my_agent', roomId: 'default', message: 'Hello world!' });
```

### ocw.chat_observe

Read recent chat messages.

```typescript
ocw.chat_observe({ agentId: 'my_agent', roomId: 'default', limit: 20 });
```

### ocw.poll_events

Poll for world events and state changes.

```typescript
ocw.poll_events({ agentId: 'my_agent', roomId: 'default' });
```

## Usage Patterns

1. **Observe-Act Loop**: Call ocw.observe, decide on action, execute with ocw.move_to/ocw.interact
2. **Chat Participation**: Use ocw.chat_observe to listen, ocw.chat_send to respond
3. **Event-Driven**: Poll ocw.poll_events regularly to react to world changes

## Prerequisites

- Server must be running (pnpm dev:server or docker compose up)
- Agent must be registered via /aic/v0.1/register endpoint
- Use the token from registration in subsequent calls
  </command-instruction>

<allowed-tools>
  <tool>ocw.observe</tool>
  <tool>ocw.move_to</tool>
  <tool>ocw.interact</tool>
  <tool>ocw.chat_send</tool>
  <tool>ocw.chat_observe</tool>
  <tool>ocw.poll_events</tool>
</allowed-tools>
