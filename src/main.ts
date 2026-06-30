/**
 * Application entry point.
 *
 * Import order is intentional:
 *   1. telemetry  — OTel SDK must patch libraries before they are imported.
 *   2. logger     — pino instance used everywhere below.
 *   3. Everything else.
 */

// 1. Bootstrap OpenTelemetry (must come first — patches express, http, prisma)
import { startTelemetry, stopTelemetry } from './telemetry';
startTelemetry();

// 2. Structured logger
import logger from './logger';

// 3. Application
import express from 'express';
import cors from 'cors';
import * as bodyParser from 'body-parser';
import routes from './app/routes/routes';
import HttpException from './app/models/http-exception.model';
import { httpMetricsMiddleware } from './app/middleware/http-metrics.middleware';

const app = express();

/**
 * App Configuration
 */

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Increment http_requests_total counter on every request
app.use(httpMetricsMiddleware);

app.use(routes);

// Serves images
app.use(express.static(__dirname + '/assets'));

app.get('/', (_req: express.Request, res: express.Response) => {
  res.json({ status: 'API is running on /api' });
});

/* eslint-disable */
app.use(
  (
    err: Error | HttpException,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    // @ts-ignore
    if (err && err.name === 'UnauthorizedError') {
      return res.status(401).json({
        status: 'error',
        message: 'missing authorization credentials',
      });
      // @ts-ignore
    } else if (err && err.errorCode) {
      // @ts-ignore
      res.status(err.errorCode).json(err.message);
    } else if (err) {
      res.status(500).json(err.message);
    }
  },
);
/* eslint-enable */

/**
 * Server activation
 */

const PORT = Number(process.env.PORT ?? 3000);

const server = app.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV ?? 'development' }, 'server started');
});

/**
 * Graceful shutdown — flush OTel signals before the process exits.
 * Logs the shutdown event so the last entry appears in Loki.
 */
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'server shutting down');

  server.close(async () => {
    await stopTelemetry();
    logger.info('shutdown complete');
    process.exit(0);
  });

  // Force exit if shutdown takes longer than 10 s
  setTimeout(() => {
    logger.warn('shutdown timed out — forcing exit');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
