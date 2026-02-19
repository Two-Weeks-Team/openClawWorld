import { defineServer, defineRoom, monitor, playground } from 'colyseus';
import cors from 'cors';
import express from 'express';
import { apiReference } from '@scalar/express-api-reference';
import { GameRoom } from './rooms/GameRoom.js';
import { MeetingRoom } from './rooms/MeetingRoom.js';
import { aicRouter, requestIdMiddleware, errorHandler, notFoundHandler } from './aic/index.js';
import { getMetricsCollector } from './metrics/MetricsCollector.js';
import { openApiSpec } from './openapi.js';

const NODE_ENV = process.env.NODE_ENV ?? 'development';

const LOCALHOST_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:2567',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:2567',
];

function getCorsOrigin(): string[] | false {
  if (NODE_ENV === 'development') {
    return LOCALHOST_ORIGINS;
  }
  const allowedOrigins = process.env.ALLOWED_ORIGINS;
  if (!allowedOrigins || allowedOrigins.trim() === '') {
    console.warn(
      '[SECURITY] ALLOWED_ORIGINS not set in production. CORS will reject all cross-origin requests.'
    );
    return false;
  }
  return allowedOrigins
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);
}

const server = defineServer({
  rooms: {
    game: defineRoom(GameRoom).filterBy(['roomId']),
    meeting: defineRoom(MeetingRoom),
  },

  express: app => {
    app.use(
      cors({
        origin: getCorsOrigin(),
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

    app.get('/openapi.json', (_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.json(openApiSpec);
    });

    app.use(
      '/docs',
      apiReference({
        url: '/openapi.json',
        theme: 'default',
        layout: 'modern',
        darkMode: true,
        metaData: {
          title: 'OpenClawWorld API Documentation',
          description: 'Interactive API documentation for the AIC (Agent Interface Contract) API',
        },
      })
    );

    const metricsCollector = getMetricsCollector();
    app.use('/aic/v0.1', (_req, _res, next) => {
      metricsCollector.recordAicRequest();
      next();
    });
    app.use('/aic/v0.1', aicRouter);

    if (NODE_ENV !== 'production') {
      app.use('/', playground());
      app.use('/monitor', monitor());
    }

    app.use(notFoundHandler);
    app.use(errorHandler);
  },
});

export default server;
