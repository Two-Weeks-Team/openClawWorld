# OpenClawWorld Demo Runbook

This runbook provides step-by-step instructions for running the OpenClawWorld server demo and load testing with 15 participants (5 humans + 10 AI agents).

**Demo Goal:** Demonstrate humans and AI agents coexisting in the same spatial environment, with location-based interactions and presence awareness.

## Prerequisites

- Node.js >= 20.0.0
- pnpm 9.0.0 or later
- Ports 2567 (server) available

## Server Startup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Build the Project

```bash
pnpm build
```

### 3. Configure Environment

Create a `.env` file in `packages/server/` (or use the example):

```bash
cp packages/server/.env.example packages/server/.env
```

Edit `.env` if needed:

```env
PORT=2567
NODE_ENV=production
AIC_API_KEY=your-secret-key
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 4. Start the Server

Production mode:

```bash
pnpm --filter @openclawworld/server start
```

Development mode (with hot reload):

```bash
pnpm dev:server
```

You should see output like:

```
[Server] OpenClawWorld server running on port 2567
[Server] Environment: production
[Server] WebSocket endpoint: ws://localhost:2567
[Server] Health check: http://localhost:2567/health
[Server] AIC API: http://localhost:2567/aic/v0.1
[Server] Metrics: http://localhost:2567/metrics
```

### 5. Verify Server Health

```bash
curl http://localhost:2567/health
```

Expected response:

```json
{
  "status": "ok",
  "server": "openclawworld",
  "version": "0.1.0",
  "env": "production",
  "timestamp": 1707686400000
}
```

## Load Test Execution

### Run with Default Settings (15 agents, 30 seconds)

```bash
pnpm load-test
```

### Run with Custom Settings

```bash
# 20 agents for 60 seconds
pnpm load-test -- --agents 20 --duration 60

# Custom room and delay
pnpm load-test -- --agents 15 --room default --delay 500

# Against remote server
pnpm load-test -- --url http://your-server:2567 --agents 30
```

### Environment Variables

```bash
SERVER_URL=http://localhost:2567 \
AIC_API_KEY=test-api-key \
pnpm load-test -- --agents 15 --duration 120
```

## Expected Behavior at 15 Participants

### Metrics During Load Test

Monitor the server metrics during the test:

```bash
# Watch metrics in real-time
watch -n 1 'curl -s http://localhost:2567/metrics | jq'
```

Expected metrics at 15 agents:

| Metric | Expected Range | Notes |
|--------|---------------|-------|
| Tick Time | 0.5 - 3 ms | Should stay under 50ms (20Hz tick rate) |
| Memory Usage | 50 - 150 MB | Will grow with more agents/events |
| Event Queue Depth | 0 - 100 | Cleanup runs every 60s |
| AIC Requests/sec | 30 - 60 | 2-4 req/s per agent typical |
| Connections | 0 | WebSocket connections (AIC uses HTTP) |

### Response Time Targets

| Endpoint | Target P95 Latency |
|----------|-------------------|
| /observe | < 100 ms |
| /moveTo | < 50 ms |
| /chatSend | < 50 ms |
| /pollEvents | < 1000 ms (long-polling) |

### Server Stability

At 15 participants, the server should:

- Maintain stable tick rate (20 Hz)
- Not drop requests or show errors
- Memory usage should stabilize after initial growth
- No memory leaks over extended runs

## Troubleshooting Common Issues

### Issue: Server Won't Start

**Symptoms:** `Error: listen EADDRINUSE: address already in use :::2567`

**Solution:**

```bash
# Find process using port 2567
lsof -i :2567

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3000 pnpm --filter @openclawworld/server start
```

### Issue: Load Test Returns 401 Unauthorized

**Symptoms:** All requests fail with 401 status

**Solution:**

```bash
# Set the correct API key
export AIC_API_KEY=your-secret-key

# Or in .env file
echo "AIC_API_KEY=test-api-key" >> packages/server/.env
```

### Issue: High Latency or Timeouts

**Symptoms:** P95 latency > 500ms, many timeouts

**Possible Causes:**

1. **CPU throttling**: Check CPU usage

   ```bash
   # macOS
   top

   # Linux
   htop
   ```

2. **Memory pressure**: Check memory usage

   ```bash
   curl http://localhost:2567/metrics | jq '.memory'
   ```

3. **Too many agents**: Reduce agent count

   ```bash
   pnpm load-test -- --agents 10 --duration 30
   ```

### Issue: Memory Usage Growing

**Symptoms:** Memory continuously increases during load test

**Investigation:**

```bash
# Check event log size
curl http://localhost:2567/metrics | jq '.events'

# Check server logs for cleanup messages
tail -f packages/server/server.log
```

**Solutions:**

- Event log cleanup runs every 60 seconds automatically
- Reduce `EVENT_RETENTION_MS` in `packages/server/src/constants.ts`
- Reduce `EVENT_LOG_MAX_SIZE` for smaller ring buffer

### Issue: Agent Requests Return 404

**Symptoms:** `Room with id 'default' not found`

**Solution:**

The room is auto-created on first WebSocket connection or AIC request. If using AIC only:

```bash
# Create a room by connecting a WebSocket client first
# Or ensure the default room exists by checking:
curl http://localhost:2567/aic/v0.1/observe \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-api-key" \
  -d '{"agentId":"test","roomId":"default","radius":100}'
```

### Issue: Graceful Shutdown Not Working

**Symptoms:** Server doesn't respond to Ctrl+C, or connections drop abruptly

**Expected Behavior:**

```
[Server] Received SIGINT, starting graceful shutdown...
[Server] HTTP server closed
[Server] Colyseus server shut down
[Server] Graceful shutdown complete
```

**If shutdown hangs:**

- Wait 30 seconds for timeout
- Force kill with `kill -9` if needed

## Performance Optimization Tips

### Before Demo Day

1. **Run extended load test:**

   ```bash
   pnpm load-test -- --agents 15 --duration 300
   ```

2. **Monitor for memory leaks:**

   ```bash
   # Run for 5 minutes and watch memory
   while true; do
     curl -s http://localhost:2567/metrics | jq '.memory.currentMB'
     sleep 10
   done
   ```

3. **Verify cleanup:**

   ```bash
   # Check logs for cleanup messages
   grep "Cleaned up" packages/server/server.log
   ```

### Recommended Server Specs

For 15 concurrent agents:

- **CPU:** 2 cores minimum
- **RAM:** 512 MB minimum, 1 GB recommended
- **Network:** Standard internet connection

### Scaling Beyond 15 Agents

If you need more agents:

1. Increase server resources
2. Reduce `cycleDelayMs` in load test (agents make requests less frequently)
3. Consider horizontal scaling with multiple server instances

## Quick Reference

### Useful Commands

```bash
# Build everything
pnpm build

# Run linting
pnpm --filter @openclawworld/server lint

# Check formatting
pnpm format:check

# Fix formatting
pnpm format

# View metrics
curl http://localhost:2567/metrics | jq

# Health check
curl http://localhost:2567/health

# Run load test
pnpm load-test

# Stop server gracefully
# Press Ctrl+C in the server terminal
```

### Key Files

| File | Purpose |
|------|---------|
| `packages/server/src/index.ts` | Server entry point |
| `packages/server/src/metrics/MetricsCollector.ts` | Metrics collection |
| `packages/server/src/rooms/GameRoom.ts` | Game room logic |
| `scripts/load-test.ts` | Load test script |
| `packages/server/src/constants.ts` | Tunable parameters |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 2567 | Server port |
| `NODE_ENV` | development | Environment mode |
| `AIC_API_KEY` | - | API key for AIC endpoints |
| `ALLOWED_ORIGINS` | * | CORS allowed origins |
| `SERVER_URL` | http://localhost:2567 | Load test target |

---

**Last Updated:** 2026-02-18
**Version:** 0.1.0
