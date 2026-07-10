import pino from 'pino';

/**
 * Shared structured logger.
 *
 * Outputs JSON in production (NODE_ENV=production) and pretty-prints in other
 * environments. JSON output is required for Loki log parsing in the LGTM stack.
 *
 * Usage:
 *   import logger from './logger';
 *   logger.info({ port: 3000 }, 'server started');
 *   logger.info('server shutting down');
 */
const VALID_LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'];

const resolveLogLevel = (): string => {
  const requested = process.env.LOG_LEVEL;
  if (!requested) {
    return 'info';
  }
  if (VALID_LOG_LEVELS.includes(requested)) {
    return requested;
  }
  // pino throws synchronously on an unrecognized level, which would crash
  // the process before it can even log why — fall back instead of taking
  // the whole app down over a typo'd env var.
  // eslint-disable-next-line no-console
  console.warn(`[logger] Invalid LOG_LEVEL "${requested}", falling back to "info". Valid levels: ${VALID_LOG_LEVELS.join(', ')}`);
  return 'info';
};

const logger = pino({
  level: resolveLogLevel(),
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  }),
});

export default logger;
