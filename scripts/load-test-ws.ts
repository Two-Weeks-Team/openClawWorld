#!/usr/bin/env tsx
/**
 * WebSocket Load Test for OpenClawWorld
 *
 * Simulates concurrent WebSocket connections to the Colyseus game server
 * using the colyseus.js SDK directly. Measures connection success rates,
 * state change throughput, and error rates.
 *
 * Usage:
 *   pnpm load-test:ws
 *   pnpm load-test:ws -- --clients 50 --duration 30
 */

import { Client, Room } from '@colyseus/sdk';

interface WsLoadTestConfig {
  endpoint: string;
  roomName: string;
  numClients: number;
  durationSeconds: number;
  joinDelay: number;
}

interface WsMetrics {
  joins: number;
  leaves: number;
  errors: number;
  stateChanges: number;
  messagesReceived: number;
  joinLatencies: number[];
}

interface LatencyStats {
  min: number;
  max: number;
  avg: number;
  p95: number;
  count: number;
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

class WsLoadTestRunner {
  private config: WsLoadTestConfig;
  private metrics: WsMetrics = {
    joins: 0,
    leaves: 0,
    errors: 0,
    stateChanges: 0,
    messagesReceived: 0,
    joinLatencies: [],
  };
  private rooms: Room[] = [];

  constructor(config: WsLoadTestConfig) {
    this.config = config;
  }

  async run(): Promise<void> {
    console.log('==========================================================');
    console.log('        OpenClawWorld WebSocket Load Test');
    console.log('==========================================================');
    console.log();
    console.log('Configuration:');
    console.log(`  Endpoint:     ${this.config.endpoint}`);
    console.log(`  Room:         ${this.config.roomName}`);
    console.log(`  Clients:      ${this.config.numClients}`);
    console.log(`  Duration:     ${this.config.durationSeconds}s`);
    console.log(`  Join Delay:   ${this.config.joinDelay}ms`);
    console.log();

    // Connect all clients
    console.log('Connecting clients...');
    const client = new Client(this.config.endpoint);

    for (let i = 0; i < this.config.numClients; i++) {
      try {
        const startTime = performance.now();

        const room = await client.joinOrCreate(this.config.roomName, {
          name: `ws-loadtest-${i}`,
          roomId: 'auto',
        });

        const joinLatency = performance.now() - startTime;
        this.metrics.joinLatencies.push(joinLatency);
        this.metrics.joins++;

        room.onStateChange((_state: unknown) => {
          this.metrics.stateChanges++;
        });

        room.onMessage('*', (_type: string | number, _payload: unknown) => {
          this.metrics.messagesReceived++;
        });

        room.onLeave((_code: number) => {
          this.metrics.leaves++;
        });

        room.onError((code, message) => {
          this.metrics.errors++;
          console.error(`[Client ${i}] Room error ${code}: ${message}`);
        });

        this.rooms.push(room);

        if ((i + 1) % 10 === 0) {
          console.log(`  ${i + 1}/${this.config.numClients} clients connected`);
        }

        if (this.config.joinDelay > 0) {
          await sleep(this.config.joinDelay);
        }
      } catch (error) {
        this.metrics.errors++;
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[Client ${i}] Failed to join: ${msg}`);
      }
    }

    console.log(`  ${this.metrics.joins}/${this.config.numClients} clients connected successfully`);
    console.log();

    // Let the test run
    console.log(`Running for ${this.config.durationSeconds}s...`);
    await sleep(this.config.durationSeconds * 1000);

    // Disconnect all clients
    console.log('Disconnecting clients...');
    await Promise.allSettled(this.rooms.map(room => room.leave(true)));
    await sleep(1000);

    this.printReport();
  }

  private printReport(): void {
    console.log();
    console.log('==========================================================');
    console.log('              WebSocket Load Test Results');
    console.log('==========================================================');
    console.log();

    console.log('Connection Statistics:');
    console.log(`  Attempted:         ${this.config.numClients}`);
    console.log(`  Successful Joins:  ${this.metrics.joins}`);
    console.log(`  Leaves:            ${this.metrics.leaves}`);
    console.log(`  Errors:            ${this.metrics.errors}`);
    console.log(
      `  Success Rate:      ${((this.metrics.joins / this.config.numClients) * 100).toFixed(2)}%`
    );
    console.log();

    console.log('Activity Statistics:');
    console.log(`  State Changes:     ${this.metrics.stateChanges}`);
    console.log(`  Messages Received: ${this.metrics.messagesReceived}`);
    console.log();

    const joinStats = calculateStats(this.metrics.joinLatencies);
    console.log('Join Latency (ms):');
    console.log(`  Count: ${joinStats.count}`);
    if (joinStats.count > 0) {
      console.log(`  Min:   ${joinStats.min.toFixed(2)} ms`);
      console.log(`  Max:   ${joinStats.max.toFixed(2)} ms`);
      console.log(`  Avg:   ${joinStats.avg.toFixed(2)} ms`);
      console.log(`  P95:   ${joinStats.p95.toFixed(2)} ms`);
    }
    console.log();
  }
}

function parseArgs(): WsLoadTestConfig {
  const args = process.argv.slice(2);

  const config: WsLoadTestConfig = {
    endpoint: process.env.SERVER_URL ?? 'ws://localhost:2567',
    roomName: 'game',
    numClients: 100,
    durationSeconds: 30,
    joinDelay: 50,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--clients':
      case '--numClients':
      case '-c':
        if (nextArg) {
          config.numClients = parseInt(nextArg, 10);
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
          config.roomName = nextArg;
          i++;
        }
        break;
      case '--endpoint':
      case '-e':
        if (nextArg) {
          config.endpoint = nextArg;
          i++;
        }
        break;
      case '--delay':
        if (nextArg) {
          config.joinDelay = parseInt(nextArg, 10);
          i++;
        }
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
  console.log('OpenClawWorld WebSocket Load Test Script');
  console.log();
  console.log('Usage: pnpm load-test:ws [options]');
  console.log();
  console.log('Options:');
  console.log('  -c, --clients <n>     Number of WebSocket clients (default: 100)');
  console.log('  -d, --duration <s>    Test duration in seconds (default: 30)');
  console.log('  -r, --room <name>     Room name to join (default: game)');
  console.log('  -e, --endpoint <url>  WebSocket endpoint (default: ws://localhost:2567)');
  console.log('  --delay <ms>          Delay between client joins in ms (default: 50)');
  console.log('  -h, --help            Show this help message');
  console.log();
  console.log('Environment Variables:');
  console.log('  SERVER_URL            Server WebSocket URL');
  console.log();
  console.log('Examples:');
  console.log('  pnpm load-test:ws');
  console.log('  pnpm load-test:ws -- --clients 50 --duration 30');
  console.log('  pnpm load-test:ws -- -c 200 --endpoint ws://staging:2567');
}

async function main(): Promise<void> {
  const config = parseArgs();
  const runner = new WsLoadTestRunner(config);

  try {
    await runner.run();
    process.exit(0);
  } catch (error) {
    console.error('WebSocket load test failed:', error);
    process.exit(1);
  }
}

main();
