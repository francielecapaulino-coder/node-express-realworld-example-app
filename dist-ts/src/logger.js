"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const pino_1 = tslib_1.__importDefault(require("pino"));
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
const logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL ?? 'info',
    ...(process.env.NODE_ENV !== 'production' && {
        transport: {
            target: 'pino-pretty',
            options: { colorize: true },
        },
    }),
});
exports.default = logger;
//# sourceMappingURL=logger.js.map