import { defineServer, defineRoom, monitor, playground } from 'colyseus';
import cors from 'cors';
import { GameRoom } from './rooms/GameRoom.js';
import { aicRouter, requestIdMiddleware, errorHandler, notFoundHandler } from './aic/index.js';
import { getMetricsCollector } from './metrics/MetricsCollector.js';

const NODE_ENV = process.env.NODE_ENV ?? 'development';

const server = defineServer({
  rooms: {
    game: defineRoom(GameRoom),
  },

  express: app => {
    app.use(
      cors({
        origin: NODE_ENV === 'development' ? '*' : (process.env.ALLOWED_ORIGINS?.split(',') ?? '*'),
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
        exposedHeaders: [
          'X-Request-Id',
          'RateLimit-Limit',
          'RateLimit-Remaining',
          'RateLimit-Reset',
        ],
      })
    );

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

    if (NODE_ENV !== 'production') {
      app.use('/', playground());
    }

    app.use('/monitor', monitor());

    app.use(notFoundHandler);
    app.use(errorHandler);
  },
});

export default server;
