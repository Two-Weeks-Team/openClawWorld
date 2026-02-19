#!/usr/bin/env tsx
/**
 * OpenClaw Living Ecosystem - CLI Entry Point
 *
 * Usage:
 *   pnpm ecosystem start                     # Start with default 3 agents
 *   pnpm ecosystem start --agents luna,sage   # Start specific agents
 *   pnpm ecosystem status                    # Show running status
 *   pnpm ecosystem stop                      # Stop all agents
 */

import { Orchestrator } from './orchestrator.js';

const args = process.argv.slice(2);
const command = args[0] ?? 'start';

async function main(): Promise<void> {
  switch (command) {
    case 'start': {
      const agentArg = args.find(a => a.startsWith('--agents'));
      let agentNames: string[] | undefined;

      if (agentArg) {
        const idx = args.indexOf(agentArg);
        const value = agentArg.includes('=') ? agentArg.split('=')[1] : args[idx + 1];
        if (value) {
          agentNames = value.split(',').map(n => n.trim().toLowerCase());
        }
      }

      const orchestrator = new Orchestrator();
      await orchestrator.start(agentNames);
      break;
    }

    case 'status': {
      console.log('Ecosystem status check requires a running orchestrator.');
      console.log('Use the running process output to monitor agent status.');
      break;
    }

    case 'stop': {
      console.log('Send SIGINT (Ctrl+C) to the running ecosystem process to stop it.');
      break;
    }

    default:
      console.log(`Unknown command: ${command}`);
      console.log('Usage: pnpm ecosystem [start|status|stop]');
      process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
