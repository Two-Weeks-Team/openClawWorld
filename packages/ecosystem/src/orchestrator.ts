/**
 * Ecosystem Orchestrator - Manages the living agent ecosystem
 *
 * Spawns, monitors, and manages all agent processes.
 * Provides CLI dashboard and health monitoring.
 */

import type { EcosystemConfig } from './config/ecosystem.config.js';
import type { AgentConfig } from './types/agent.types.js';
import { AgentProcess } from './agent/AgentProcess.js';
import { getAgentTemplate, DEFAULT_AGENT_NAMES } from './config/agent-templates.js';
import { loadConfig } from './config/ecosystem.config.js';
import { existsSync, mkdirSync } from 'fs';

export class Orchestrator {
  private readonly config: EcosystemConfig;
  private agents: Map<string, AgentProcess> = new Map();
  private monitorInterval: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(configOverrides?: Partial<EcosystemConfig>) {
    this.config = loadConfig(configOverrides);
  }

  async start(agentNames?: string[]): Promise<void> {
    console.log('=== OpenClaw Living Ecosystem ===');
    console.log(`Server: ${this.config.serverBaseUrl}`);
    console.log(`Room: ${this.config.defaultRoomId}`);
    console.log(`Model: ${this.config.model}`);
    console.log('');

    // Ensure data directory exists
    if (!existsSync(this.config.dataDir)) {
      mkdirSync(this.config.dataDir, { recursive: true });
    }

    // Health check the server first
    const serverOk = await this.healthCheck();
    if (!serverOk) {
      console.error('Server is not reachable. Please start the openClawWorld server first.');
      process.exit(1);
    }

    // Determine which agents to spawn
    const names = agentNames ?? [...DEFAULT_AGENT_NAMES];
    const configs: AgentConfig[] = [];

    for (const name of names) {
      const template = getAgentTemplate(name);
      if (!template) {
        console.warn(`Unknown agent template: ${name}, skipping`);
        continue;
      }
      configs.push(template);
    }

    if (configs.length === 0) {
      console.error('No valid agent configurations found');
      process.exit(1);
    }

    console.log(`Spawning ${configs.length} agents: ${configs.map(c => c.name).join(', ')}`);
    this.running = true;

    // Spawn agents with delay between each
    for (const config of configs) {
      if (!this.running) break;

      const process = new AgentProcess(config, this.config);
      this.agents.set(config.id, process);

      try {
        await process.start();
        console.log(`  [+] ${config.name} spawned`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown';
        console.error(`  [!] ${config.name} failed to spawn: ${msg}`);
      }

      // Stagger spawns
      if (this.running) {
        await sleep(this.config.spawnDelayMs);
      }
    }

    console.log(`\n=== Ecosystem Running (${this.agents.size} agents) ===\n`);

    // Start monitoring
    this.startMonitor();

    // Handle graceful shutdown
    const shutdown = () => {
      console.log('\nShutting down ecosystem...');
      this.stop();
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Keep running until stopped
    await this.waitForStop();
  }

  stop(): void {
    this.running = false;

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    for (const [, agent] of this.agents) {
      console.log(`  [-] Stopping ${agent.config.name}...`);
      agent.stop();
    }

    this.agents.clear();
    console.log('Ecosystem stopped.');
  }

  getStatus(): Array<{
    name: string;
    status: string;
    tick: number;
    restarts: number;
  }> {
    const statuses = [];
    for (const [, agent] of this.agents) {
      const hb = agent.getHeartbeat();
      statuses.push({
        name: agent.config.name,
        status: hb.status,
        tick: hb.tickNumber,
        restarts: agent.getRestartCount(),
      });
    }
    return statuses;
  }

  private startMonitor(): void {
    this.monitorInterval = setInterval(async () => {
      for (const [, agent] of this.agents) {
        const hb = agent.getHeartbeat();

        // Check for dead agents
        if (hb.status === 'dead' && this.running) {
          console.log(`[Monitor] ${agent.config.name} is dead, restarting...`);
          try {
            await agent.restart();
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown';
            console.error(`[Monitor] Failed to restart ${agent.config.name}: ${msg}`);
          }
        }

        // Check for stale heartbeats
        if (hb.status === 'running' && Date.now() - hb.timestamp > this.config.heartbeatTimeoutMs) {
          console.warn(`[Monitor] ${agent.config.name} heartbeat stale, restarting...`);
          try {
            await agent.restart();
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown';
            console.error(`[Monitor] Failed to restart ${agent.config.name}: ${msg}`);
          }
        }
      }
    }, 30_000); // Check every 30 seconds
  }

  private async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.serverBaseUrl.replace('/aic/v0.1', '')}/aic/v0.1/status`,
        { method: 'GET' }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  private waitForStop(): Promise<void> {
    return new Promise(resolve => {
      const check = setInterval(() => {
        if (!this.running) {
          clearInterval(check);
          resolve();
        }
      }, 1000);
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
