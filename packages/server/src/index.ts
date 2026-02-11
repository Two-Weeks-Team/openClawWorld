import 'dotenv/config';
import { listen } from '@colyseus/tools';
import { disposeAllIdempotencyStores } from './aic/idempotency.js';
import appConfig from './app.config.js';

const PORT = parseInt(process.env.PORT ?? '2567', 10);
const NODE_ENV = process.env.NODE_ENV ?? 'development';

listen(appConfig, PORT).then(server => {
  console.log(`[Server] OpenClawWorld server running on port ${PORT}`);
  console.log(`[Server] Environment: ${NODE_ENV}`);
  console.log(`[Server] WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/health`);
  console.log(`[Server] AIC API: http://localhost:${PORT}/aic/v0.1`);
  console.log(`[Server] API Docs: http://localhost:${PORT}/docs`);
  console.log(`[Server] Metrics: http://localhost:${PORT}/metrics`);

  setupGracefulShutdown(server);
});

function setupGracefulShutdown(server: Awaited<ReturnType<typeof listen>>): void {
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[Server] Received ${signal}, starting graceful shutdown...`);

    const shutdownTimeout = setTimeout(() => {
      console.error('[Server] Shutdown timeout exceeded, forcing exit');
      process.exit(1);
    }, 30000);

    try {
      await server.gracefullyShutdown(false);
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
