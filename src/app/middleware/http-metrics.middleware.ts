import { NextFunction, Request, Response } from 'express';
import { metrics } from '@opentelemetry/api';

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

const meter = metrics.getMeter('conduit-api', process.env.OTEL_SERVICE_VERSION ?? '0.0.0');

const httpRequestsCounter = meter.createCounter('http_requests_total', {
  description: 'Total number of HTTP requests received, labelled by route, method and status code',
  unit: '{request}',
});

export function httpMetricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.on('finish', () => {
    const route = (req.route?.path as string | undefined) ?? req.path ?? 'unknown';
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
