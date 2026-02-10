import 'dotenv/config';
import express from 'express';
import colyseus from 'colyseus';
import wsTransport from '@colyseus/ws-transport';
import { createServer } from 'http';
import { GameRoom } from './rooms/GameRoom.js';

const { Server: ColyseusServer } = colyseus;
const { WebSocketTransport } = wsTransport;

const PORT = parseInt(process.env.PORT ?? '2567', 10);
const NODE_ENV = process.env.NODE_ENV ?? 'development';

async function startServer(): Promise<void> {
  const app = express();

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      server: 'openclawworld',
      version: '0.1.0',
      env: NODE_ENV,
      timestamp: Date.now(),
    });
  });

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
}

startServer().catch((error) => {
  console.error('[Server] Failed to start:', error);
  process.exit(1);
});
