#!/usr/bin/env tsx
/**
 * HTTP Load Test Script for OpenClawWorld Server
 *
 * Simulates multiple agents performing observe/move/chat cycles
 * using the proper register flow for authentication.
 *
 * Each agent:
 *   1. POST /aic/v0.1/register -> gets sessionToken, agentId, roomId
 *   2. Runs observe/move/chat cycles using the returned credentials
 *   3. POST /aic/v0.1/unregister on cleanup
 *
 * Usage:
 *   pnpm load-test:http
 *   pnpm load-test:http -- --agents 20 --duration 60
 *   pnpm load-test:http -- --no-threshold
 */

import { randomBytes } from 'crypto';

interface LoadTestConfig {
  serverUrl: string;
  agentCount: number;
  durationSeconds: number;
  roomId: string;
  cycleDelayMs: number;
  checkThresholds: boolean;
}

interface LatencyStats {
  min: number;
  max: number;
  avg: number;
  p95: number;
  count: number;
}

interface AgentMetrics {
  observeLatencies: number[];
  moveLatencies: number[];
  chatLatencies: number[];
  errors: number;
}

interface RegisterResponse {
  status: string;
  data: {
    agentId: string;
    roomId: string;
    sessionToken: string;
  };
}

class LoadTestAgent {
  private agentName: string;
  private targetRoomId: string;
  private serverUrl: string;
  private metrics: AgentMetrics;
  private running = false;

  // Set after register()
  private sessionToken: string | null = null;
  private registeredAgentId: string | null = null;
  private registeredRoomId: string | null = null;

  constructor(agentIndex: number, config: LoadTestConfig) {
    this.agentName = `loadtest-agent-${agentIndex}`;
    this.targetRoomId = config.roomId;
    this.serverUrl = config.serverUrl;
    this.metrics = {
      observeLatencies: [],
      moveLatencies: [],
      chatLatencies: [],
      errors: 0,
    };
  }

  getAgentName(): string {
    return this.agentName;
  }

  getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }

  async register(): Promise<void> {
    const response = await fetch(`${this.serverUrl}/aic/v0.1/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: this.agentName,
        roomId: this.targetRoomId,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Register failed for ${this.agentName}: ${response.status} ${text}`);
    }

    const body = (await response.json()) as RegisterResponse;
    this.sessionToken = body.data.sessionToken;
    this.registeredAgentId = body.data.agentId;
    this.registeredRoomId = body.data.roomId;
  }

  async unregister(): Promise<void> {
    if (!this.sessionToken || !this.registeredAgentId || !this.registeredRoomId) {
      return;
    }

    try {
      await fetch(`${this.serverUrl}/aic/v0.1/unregister`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.sessionToken}`,
        },
        body: JSON.stringify({
          agentId: this.registeredAgentId,
          roomId: this.registeredRoomId,
        }),
      });
    } catch {
      // Best-effort cleanup, ignore errors
    }
  }

  async start(cycleDelayMs: number): Promise<void> {
    await this.register();
    this.running = true;

    while (this.running) {
      try {
        await this.cycle();
      } catch (error) {
        this.metrics.errors++;
        console.error(`[Agent ${this.agentName}] Error:`, error);
      }

      await sleep(cycleDelayMs);
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.unregister();
  }

  private async cycle(): Promise<void> {
    await this.observe();
    await this.move();
    await this.chat();
  }

  private async observe(): Promise<void> {
    const start = performance.now();

    const response = await fetch(`${this.serverUrl}/aic/v0.1/observe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.sessionToken}`,
      },
      body: JSON.stringify({
        agentId: this.registeredAgentId,
        roomId: this.registeredRoomId,
        radius: 100,
      }),
    });

    const latency = performance.now() - start;
    this.metrics.observeLatencies.push(latency);

    if (!response.ok) {
      throw new Error(`Observe failed: ${response.status}`);
    }
  }

  private async move(): Promise<void> {
    const tx = Math.floor(Math.random() * 20);
    const ty = Math.floor(Math.random() * 15);
    const txId = `tx_${Date.now()}_${randomBytes(4).toString('hex')}`;

    const start = performance.now();

    const response = await fetch(`${this.serverUrl}/aic/v0.1/moveTo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.sessionToken}`,
      },
      body: JSON.stringify({
        agentId: this.registeredAgentId,
        roomId: this.registeredRoomId,
        txId,
        dest: { tx, ty },
      }),
    });

    const latency = performance.now() - start;
    this.metrics.moveLatencies.push(latency);

    if (!response.ok) {
      throw new Error(`Move failed: ${response.status}`);
    }
  }

  private async chat(): Promise<void> {
    const txId = `tx_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const message = `Hello from ${this.agentName}`;

    const start = performance.now();

    const response = await fetch(`${this.serverUrl}/aic/v0.1/chatSend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.sessionToken}`,
      },
      body: JSON.stringify({
        agentId: this.registeredAgentId,
        roomId: this.registeredRoomId,
        txId,
        channel: 'global',
        message,
      }),
    });

    const latency = performance.now() - start;
    this.metrics.chatLatencies.push(latency);

    if (!response.ok) {
      throw new Error(`Chat failed: ${response.status}`);
    }
  }
}

class LoadTestRunner {
  private config: LoadTestConfig;
  private agents: LoadTestAgent[] = [];

  constructor(config: LoadTestConfig) {
    this.config = config;
  }

  async run(): Promise<void> {
    console.log('==========================================================');
    console.log('        OpenClawWorld HTTP Load Test');
    console.log('==========================================================');
    console.log();
    console.log('Configuration:');
    console.log(`  Server URL:      ${this.config.serverUrl}`);
    console.log(`  Agents:          ${this.config.agentCount}`);
    console.log(`  Duration:        ${this.config.durationSeconds}s`);
    console.log(`  Room ID:         ${this.config.roomId}`);
    console.log(`  Cycle Delay:     ${this.config.cycleDelayMs}ms`);
    console.log(`  Thresholds:      ${this.config.checkThresholds ? 'enabled' : 'disabled'}`);
    console.log();

    // Create and start agents (register + begin cycles)
    console.log('Registering and starting agents...');
    const startPromises: Promise<void>[] = [];
    for (let i = 0; i < this.config.agentCount; i++) {
      const agent = new LoadTestAgent(i, this.config);
      this.agents.push(agent);
      startPromises.push(agent.start(this.config.cycleDelayMs));
    }

    console.log(`  ${this.config.agentCount} agents launched`);
    console.log();

    // Let the test run for the configured duration
    await sleep(this.config.durationSeconds * 1000);

    // Stop all agents (stop cycles + unregister)
    console.log('Stopping and unregistering agents...');
    await Promise.all(this.agents.map(agent => agent.stop()));
    await sleep(1000);

    const exitCode = this.printReport();
    process.exit(exitCode);
  }

  private printReport(): number {
    const allMetrics = this.agents.map(a => a.getMetrics());

    const observeLatencies = allMetrics.flatMap(m => m.observeLatencies);
    const moveLatencies = allMetrics.flatMap(m => m.moveLatencies);
    const chatLatencies = allMetrics.flatMap(m => m.chatLatencies);
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errors, 0);

    const totalRequests = observeLatencies.length + moveLatencies.length + chatLatencies.length;

    console.log();
    console.log('==========================================================');
    console.log('                  Load Test Results');
    console.log('==========================================================');
    console.log();

    console.log('Overall Statistics:');
    console.log(`  Total Requests:  ${totalRequests}`);
    console.log(`  Total Errors:    ${totalErrors}`);
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
    console.log(`  Error Rate:      ${(errorRate * 100).toFixed(2)}%`);
    console.log();

    console.log('Latency Statistics (ms):');
    console.log();
    console.log('  Observe Endpoint:');
    this.printLatencyStats(calculateStats(observeLatencies));
    console.log();

    console.log('  MoveTo Endpoint:');
    this.printLatencyStats(calculateStats(moveLatencies));
    console.log();

    console.log('  ChatSend Endpoint:');
    this.printLatencyStats(calculateStats(chatLatencies));
    console.log();

    const allLatencies = [...observeLatencies, ...moveLatencies, ...chatLatencies];
    const combinedStats = calculateStats(allLatencies);
    console.log('  Combined (All Endpoints):');
    this.printLatencyStats(combinedStats);
    console.log();

    console.log('Requests per Second:');
    const durationSeconds = this.config.durationSeconds;
    console.log(`  Observe:  ${(observeLatencies.length / durationSeconds).toFixed(2)} req/s`);
    console.log(`  MoveTo:   ${(moveLatencies.length / durationSeconds).toFixed(2)} req/s`);
    console.log(`  ChatSend: ${(chatLatencies.length / durationSeconds).toFixed(2)} req/s`);
    console.log(`  Total:    ${(totalRequests / durationSeconds).toFixed(2)} req/s`);
    console.log();

    // Threshold checks
    if (this.config.checkThresholds) {
      console.log('Threshold Checks:');
      let failed = false;

      if (combinedStats.p95 > 500) {
        console.log(`  FAIL: p95 (${combinedStats.p95.toFixed(2)}ms) > 500ms`);
        failed = true;
      } else {
        console.log(`  PASS: p95 (${combinedStats.p95.toFixed(2)}ms) <= 500ms`);
      }

      if (errorRate > 0.01) {
        console.log(`  FAIL: error rate (${(errorRate * 100).toFixed(2)}%) > 1%`);
        failed = true;
      } else {
        console.log(`  PASS: error rate (${(errorRate * 100).toFixed(2)}%) <= 1%`);
      }

      console.log();

      if (failed) {
        console.log('RESULT: THRESHOLD CHECK FAILED');
        return 1;
      }

      console.log('RESULT: ALL THRESHOLDS PASSED');
    }

    return 0;
  }

  private printLatencyStats(stats: LatencyStats): void {
    console.log(`    Count: ${stats.count.toLocaleString()} requests`);
    if (stats.count > 0) {
      console.log(`    Min:   ${stats.min.toFixed(2)} ms`);
      console.log(`    Max:   ${stats.max.toFixed(2)} ms`);
      console.log(`    Avg:   ${stats.avg.toFixed(2)} ms`);
      console.log(`    P95:   ${stats.p95.toFixed(2)} ms`);
    }
  }
}

function calculateStats(latencies: number[]): LatencyStats {
  if (latencies.length === 0) {
    return { min: 0, max: 0, avg: 0, p95: 0, count: 0 };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const p95Index = Math.floor(sorted.length * 0.95);
  const p95 = sorted[Math.min(p95Index, sorted.length - 1)];

  return { min, max, avg, p95, count: latencies.length };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseArgs(): LoadTestConfig {
  const args = process.argv.slice(2);

  const config: LoadTestConfig = {
    serverUrl: process.env.SERVER_URL ?? 'http://localhost:2567',
    agentCount: 15,
    durationSeconds: 30,
    roomId: 'auto',
    cycleDelayMs: 1000,
    checkThresholds: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--agents':
      case '-a':
        if (nextArg) {
          config.agentCount = parseInt(nextArg, 10);
          i++;
        }
        break;
      case '--duration':
      case '-d':
        if (nextArg) {
          config.durationSeconds = parseInt(nextArg, 10);
          i++;
        }
        break;
      case '--room':
      case '-r':
        if (nextArg) {
          config.roomId = nextArg;
          i++;
        }
        break;
      case '--delay':
        if (nextArg) {
          config.cycleDelayMs = parseInt(nextArg, 10);
          i++;
        }
        break;
      case '--url':
      case '-u':
        if (nextArg) {
          config.serverUrl = nextArg;
          i++;
        }
        break;
      case '--no-threshold':
        config.checkThresholds = false;
        break;
      case '--threshold':
        config.checkThresholds = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return config;
}

function printHelp(): void {
  console.log('OpenClawWorld HTTP Load Test Script');
  console.log();
  console.log('Usage: pnpm load-test:http [options]');
  console.log();
  console.log('Options:');
  console.log('  -a, --agents <n>      Number of simulated agents (default: 15)');
  console.log('  -d, --duration <s>    Test duration in seconds (default: 30)');
  console.log('  -r, --room <id>       Room ID to join (default: auto)');
  console.log('  --delay <ms>          Delay between cycles in ms (default: 1000)');
  console.log('  -u, --url <url>       Server URL (default: http://localhost:2567)');
  console.log('  --no-threshold        Disable threshold checks');
  console.log('  --threshold           Enable threshold checks (default)');
  console.log('  -h, --help            Show this help message');
  console.log();
  console.log('Environment Variables:');
  console.log('  SERVER_URL            Server base URL');
  console.log();
  console.log('Thresholds (when enabled):');
  console.log('  p95 latency <= 500ms');
  console.log('  error rate  <= 1%');
  console.log();
  console.log('Examples:');
  console.log('  pnpm load-test:http');
  console.log('  pnpm load-test:http -- --agents 20 --duration 60');
  console.log('  pnpm load-test:http -- -a 30 -d 120 --url http://localhost:3000');
  console.log('  pnpm load-test:http -- --no-threshold');
}

async function main(): Promise<void> {
  const config = parseArgs();
  const runner = new LoadTestRunner(config);
  await runner.run();
}

main().catch(error => {
  console.error('Load test failed:', error);
  process.exit(1);
});
