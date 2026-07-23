import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { corsOrigins } from './config/env.js';
import { requestId } from './common/middleware/requestId.js';
import { apiLimiter } from './common/middleware/rateLimit.js';
import { notFoundHandler, errorHandler } from './common/middleware/errorHandler.js';
import { logger } from './common/logging/logger.js';
import { apiRouter } from './routes/index.js';
import { healthRouter } from './modules/health/health.routes.js';
import { csrfOriginGuard } from './common/middleware/csrf.js';
import swaggerUi from 'swagger-ui-express';
import { openapiDocument } from './openapi.js';
import * as Sentry from '@sentry/node';
import { env } from './config/env.js';

if (env.SENTRY_DSN) {
  Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV, sendDefaultPii: false });
}

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // CORS — strict allowlist
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id'],
    })
  );

  // Trust proxy (Nginx sets X-Forwarded-For)
  app.set('trust proxy', 1);

  // Request parsing
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());
  app.use(csrfOriginGuard);

  // Request ID + structured logging
  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      customProps: (req, res) => ({ requestId: (res as any).locals?.requestId }),
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    })
  );

  // Global rate limit
  app.use('/api', apiLimiter);

  // Routes
  app.use('/', healthRouter);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDocument, { explorer: false }));
  app.use('/api/v1', apiRouter);

  // 404 + error handling
  app.use(notFoundHandler);
  if (env.SENTRY_DSN) Sentry.setupExpressErrorHandler(app);
  app.use(errorHandler);

  return app;
}
