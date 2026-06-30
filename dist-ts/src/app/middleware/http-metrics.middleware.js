"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpMetricsMiddleware = void 0;
const api_1 = require("@opentelemetry/api");
/**
 * Express middleware that increments an `http_requests_total` counter by 1
 * on every completed HTTP request.
 *
 * Labels:
 *   http.route   — matched Express route pattern, e.g. /api/articles/:slug
 *   http.method  — HTTP verb in uppercase, e.g. GET
 *   http.status_code — response status code as string, e.g. "200"
 *
 * The counter is visible in Prometheus as:
 *   http_requests_total{http_route="...", http_method="...", http_status_code="..."}
 *
 * And in Grafana via the Prometheus datasource bundled in grafana/otel-lgtm.
 */
const meter = api_1.metrics.getMeter('conduit-api', process.env.OTEL_SERVICE_VERSION ?? '0.0.0');
const httpRequestsCounter = meter.createCounter('http_requests_total', {
    description: 'Total number of HTTP requests received, labelled by route, method and status code',
    unit: '{request}',
});
function httpMetricsMiddleware(req, res, next) {
    res.on('finish', () => {
        const route = req.route?.path ?? req.path ?? 'unknown';
        const method = req.method.toUpperCase();
        const statusCode = String(res.statusCode);
        httpRequestsCounter.add(1, {
            'http.route': route,
            'http.method': method,
            'http.status_code': statusCode,
        });
    });
    next();
}
exports.httpMetricsMiddleware = httpMetricsMiddleware;
//# sourceMappingURL=http-metrics.middleware.js.map