"use strict";
/**
 * Application entry point.
 *
 * Import order is intentional:
 *   1. telemetry  — OTel SDK must patch libraries before they are imported.
 *   2. logger     — pino instance used everywhere below.
 *   3. Everything else.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// 1. Bootstrap OpenTelemetry (must come first — patches express, http, prisma)
const telemetry_1 = require("./telemetry");
(0, telemetry_1.startTelemetry)();
// 2. Structured logger
const logger_1 = tslib_1.__importDefault(require("./logger"));
// 3. Application
const express_1 = tslib_1.__importDefault(require("express"));
const cors_1 = tslib_1.__importDefault(require("cors"));
const bodyParser = tslib_1.__importStar(require("body-parser"));
const routes_1 = tslib_1.__importDefault(require("./app/routes/routes"));
const http_metrics_middleware_1 = require("./app/middleware/http-metrics.middleware");
const error_handler_middleware_1 = require("./app/middleware/error-handler.middleware");
const swagger_1 = require("./config/swagger");
const app = (0, express_1.default)();
/**
 * App Configuration
 */
app.use((0, cors_1.default)());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Increment http_requests_total counter on every request
app.use(http_metrics_middleware_1.httpMetricsMiddleware);
// Setup Swagger documentation
(0, swagger_1.setupSwagger)(app);
app.use(routes_1.default);
// Serves images
app.use(express_1.default.static(__dirname + '/assets'));
app.get('/', (_req, res) => {
    res.json({
        status: 'API is running on /api',
        documentation: 'Swagger UI available at /api-docs',
        openapi: 'OpenAPI spec available at /api-docs.json'
    });
});
// Handle 404 for unmatched routes
app.use(error_handler_middleware_1.notFoundHandler);
// Global error handler (must be last)
app.use(error_handler_middleware_1.globalErrorHandler);
/**
 * Server activation
 */
const PORT = Number(process.env.PORT ?? 3000);
const server = app.listen(PORT, () => {
    logger_1.default.info({ port: PORT, env: process.env.NODE_ENV ?? 'development' }, 'server started');
});
/**
 * Graceful shutdown — flush OTel signals before the process exits.
 * Logs the shutdown event so the last entry appears in Loki.
 */
async function shutdown(signal) {
    logger_1.default.info({ signal }, 'server shutting down');
    server.close(async () => {
        await (0, telemetry_1.stopTelemetry)();
        logger_1.default.info('shutdown complete');
        process.exit(0);
    });
    // Force exit if shutdown takes longer than 10 s
    setTimeout(() => {
        logger_1.default.warn('shutdown timed out — forcing exit');
        process.exit(1);
    }, 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
//# sourceMappingURL=main.js.map