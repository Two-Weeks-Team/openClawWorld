import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Server as ColyseusServer } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import { GameRoom } from './rooms/GameRoom.js';
import { aicRouter, requestIdMiddleware, errorHandler, notFoundHandler } from './aic/index.js';
import { getMetricsCollector } from './metrics/MetricsCollector.js';
import { disposeAllIdempotencyStores } from './aic/idempotency.js';

const PORT = parseInt(process.env.PORT ?? '2567', 10);
const NODE_ENV = process.env.NODE_ENV ?? 'development';

async function startServer(): Promise<void> {
  const app = express();

  app.use(
    cors({
      origin: NODE_ENV === 'development' ? '*' : (process.env.ALLOWED_ORIGINS?.split(',') ?? '*'),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
    })
  );

  app.use(express.json());
  app.use(requestIdMiddleware);

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      server: 'openclawworld',
      version: '0.1.0',
      env: NODE_ENV,
      timestamp: Date.now(),
    });
  });

  app.get('/metrics', (_req, res) => {
    const metrics = getMetricsCollector().getMetricsJSON();
    res.json(metrics);
  });

  const metricsCollector = getMetricsCollector();

  app.use('/aic/v0.1', (_req, _res, next) => {
    metricsCollector.recordAicRequest();
    next();
  });

  app.use('/aic/v0.1', aicRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  const httpServer = createServer(app);

  const colyseusServer = new ColyseusServer({
    transport: new WebSocketTransport({
      server: httpServer,
    }),
  });

  colyseusServer.define('game', GameRoom);

  await colyseusServer.listen(PORT);

  console.log(`[Server] OpenClawWorld server running on port ${PORT}`);
  console.log(`[Server] Environment: ${NODE_ENV}`);
  console.log(`[Server] WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/health`);
  console.log(`[Server] AIC API: http://localhost:${PORT}/aic/v0.1`);
  console.log(`[Server] Metrics: http://localhost:${PORT}/metrics`);

  setupGracefulShutdown(httpServer, colyseusServer);
}

function setupGracefulShutdown(
  httpServer: ReturnType<typeof createServer>,
  colyseusServer: InstanceType<typeof ColyseusServer>
): void {
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[Server] Received ${signal}, starting graceful shutdown...`);

    const shutdownTimeout = setTimeout(() => {
      console.error('[Server] Shutdown timeout exceeded, forcing exit');
      process.exit(1);
    }, 30000);

    try {
      httpServer.close(() => {
        console.log('[Server] HTTP server closed');
      });

      await colyseusServer.gracefullyShutdown(false);
      console.log('[Server] Colyseus server shut down');

      disposeAllIdempotencyStores();
      console.log('[Server] Idempotency stores disposed');

      clearTimeout(shutdownTimeout);
      console.log('[Server] Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('[Server] Error during shutdown:', error);
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

startServer().catch(error => {
  console.error('[Server] Failed to start:', error);
  process.exit(1);
});
