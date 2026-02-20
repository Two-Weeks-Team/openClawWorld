/**
 * AgentProcess - Manages an agent in a child process (or in-process for simplicity)
 *
 * For the initial implementation, agents run as async tasks in the same process.
 * This can be upgraded to child_process.fork for true isolation.
 */

import type { AgentConfig, AgentStatus, HeartbeatMessage } from '../types/agent.types.js';
import type { EcosystemConfig } from '../config/ecosystem.config.js';
import { AgentRuntime } from './AgentRuntime.js';

export class AgentProcess {
  readonly config: AgentConfig;
  private runtime: AgentRuntime | null = null;
  private lastHeartbeat: HeartbeatMessage | null = null;
  private restartCount = 0;

  constructor(
    config: AgentConfig,
    private readonly ecosystemConfig: EcosystemConfig
  ) {
    this.config = config;
  }

  async start(): Promise<void> {
    this.runtime = new AgentRuntime(this.config, this.ecosystemConfig);

    // Run in background (don't await - it's an infinite loop)
    this.runtime.start().catch(error => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[AgentProcess:${this.config.name}] Crashed: ${message}`);
    });
  }

  stop(): void {
    this.runtime?.stop();
    this.runtime = null;
  }

  async restart(): Promise<void> {
    this.stop();
    this.restartCount++;
    console.log(`[AgentProcess:${this.config.name}] Restarting (attempt ${this.restartCount})`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Brief delay before restart
    await this.start();
  }

  getStatus(): AgentStatus {
    return this.runtime?.getStatus() ?? 'dead';
  }

  getHeartbeat(): HeartbeatMessage {
    if (this.runtime) {
      this.lastHeartbeat = this.runtime.getHeartbeat();
    }
    return (
      this.lastHeartbeat ?? {
        agentId: '',
        status: 'dead',
        tickNumber: 0,
        timestamp: Date.now(),
      }
    );
  }

  getRestartCount(): number {
    return this.restartCount;
  }
}
