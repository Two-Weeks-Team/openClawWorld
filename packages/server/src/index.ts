import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import colyseus from 'colyseus';
import wsTransport from '@colyseus/ws-transport';
import { createServer } from 'http';
import { GameRoom } from './rooms/GameRoom.js';
import { aicRouter, requestIdMiddleware, errorHandler, notFoundHandler } from './aic/index.js';

const { Server: ColyseusServer } = colyseus;
const { WebSocketTransport } = wsTransport;

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
}

startServer().catch(error => {
  console.error('[Server] Failed to start:', error);
  process.exit(1);
});
