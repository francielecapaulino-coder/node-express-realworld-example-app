import { Request, Response, NextFunction } from 'express';
import { metrics } from '@opentelemetry/api';
import logger from '../../logger';

/**
 * HTTP Metrics Middleware for LGTM Stack Integration
 *
 * This middleware tracks:
 *  - Request count per endpoint
 *  - Response time metrics
 *  - Error rate tracking
 *  - Active connections monitoring
 *
 * Metrics are exported to Prometheus via OpenTelemetry
 */

interface MetricsData {
  totalRequests: number;
  endpointCounts: Map<string, number>;
  errorCount: number;
  activeConnections: number;
  totalResponseTime: number;
}

const metricsData: MetricsData = {
  totalRequests: 0,
  endpointCounts: new Map(),
  errorCount: 0,
  activeConnections: 0,
  totalResponseTime: 0,
};

// Prometheus metrics using OpenTelemetry
const meter = metrics.getMeter('conduit-api-http');
const requestCounter = meter.createCounter('http_requests_total', {
  description: 'Total number of HTTP requests',
  unit: '1',
});

const requestDuration = meter.createHistogram('http_request_duration_seconds', {
  description: 'HTTP request duration in seconds',
  unit: 's',
});

const activeGauge = meter.createUpDownCounter('http_active_connections', {
  description: 'Number of active HTTP connections',
  unit: '1',
});

const errorCounter = meter.createCounter('http_requests_errors_total', {
  description: 'Total number of HTTP errors',
  unit: '1',
});

const endpointCounter = meter.createCounter('http_requests_endpoint_total', {
  description: 'Total number of requests per endpoint',
  unit: '1',
});

/**
 * Express middleware to track HTTP metrics.
 *
 * Uses res.on('finish'/'close') instead of monkey-patching res.end: 'finish'
 * fires once the response is fully sent (and by then req.route is populated,
 * since Express only sets it while dispatching to the matched route handler,
 * which runs before this middleware's own code executes); 'close' also fires
 * for aborted/timed-out connections that never reach 'finish', so
 * activeConnections can't leak on those. req.route is still unset for
 * genuinely unmatched routes (404s), which fall back to a fixed 'unmatched'
 * label instead of the raw path — collapsing an unbounded number of distinct
 * probed paths into one series instead of growing endpointCounts/label
 * cardinality without bound.
 */
export const httpMetricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  metricsData.activeConnections++;
  activeGauge.add(1);
  metricsData.totalRequests++;

  logger.info({
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    requestId: req.headers['x-request-id'],
  }, '[HTTP_METRICS] Request started');

  let connectionReleased = false;
  const releaseConnection = () => {
    if (connectionReleased) return;
    connectionReleased = true;
    metricsData.activeConnections--;
    activeGauge.add(-1);
  };

  res.on('finish', () => {
    releaseConnection();

    const duration = (Date.now() - startTime) / 1000;
    const endpoint = `${req.method} ${req.route?.path || 'unmatched'}`;
    const statusCode = res.statusCode;
    const isError = statusCode >= 400;

    metricsData.totalResponseTime += duration;
    metricsData.endpointCounts.set(endpoint, (metricsData.endpointCounts.get(endpoint) || 0) + 1);

    if (isError) {
      metricsData.errorCount++;
      errorCounter.add(1, {
        method: req.method,
        route: endpoint,
        status_code: statusCode,
      });
    }

    requestDuration.record(duration, {
      method: req.method,
      route: endpoint,
      status_code: statusCode.toString(),
    });

    requestCounter.add(1, {
      method: req.method,
      route: endpoint,
      status_code: statusCode.toString(),
    });

    endpointCounter.add(1, {
      method: req.method,
      endpoint,
    });

    const logLevel = isError ? 'warn' : 'info';
    logger[logLevel]({
      method: req.method,
      url: req.url,
      statusCode,
      duration: `${duration.toFixed(3)}s`,
      endpoint,
      requestId: req.headers['x-request-id'],
      errorCount: metricsData.errorCount,
      totalRequests: metricsData.totalRequests,
    }, '[HTTP_METRICS] Request completed');
  });

  res.on('close', releaseConnection);

  next();
};

/**
 * Get current metrics for health endpoints
 */
export const getMetricsData = (): MetricsData & { averageResponseTime: number } => {
  const averageResponseTime = metricsData.totalRequests > 0
    ? metricsData.totalResponseTime / metricsData.totalRequests
    : 0;

  return {
    ...metricsData,
    averageResponseTime,
  };
};

/**
 * Reset metrics (useful for testing)
 */
export const resetMetrics = (): void => {
  metricsData.totalRequests = 0;
  metricsData.endpointCounts.clear();
  metricsData.errorCount = 0;
  metricsData.activeConnections = 0;
  metricsData.totalResponseTime = 0;
};

/**
 * Guards the /metrics and /api/metrics scrape endpoints with a shared secret,
 * since they're queried by infra tooling (not a logged-in user) and would
 * otherwise be public and unauthenticated, exposing process memory/uptime
 * and per-route request counts to anyone.
 */
export const metricsAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const expectedToken = process.env.METRICS_TOKEN || 'dev-metrics-token';

  if (req.headers['x-metrics-token'] !== expectedToken) {
    res.status(401).json({
      errors: {
        authorization: ['missing or invalid metrics token'],
      },
    });
    return;
  }

  next();
};

/**
 * Metrics health check endpoint handler
 */
export const metricsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = getMetricsData();

    // Convert Map to object for JSON serialization
    const endpointCounts: Record<string, number> = {};
    data.endpointCounts.forEach((count, endpoint) => {
      endpointCounts[endpoint] = count;
    });

    const healthMetrics = {
      timestamp: new Date().toISOString(),
      service: 'conduit-api',
      metrics: {
        totalRequests: data.totalRequests,
        errorCount: data.errorCount,
        activeConnections: data.activeConnections,
        averageResponseTime: `${data.averageResponseTime.toFixed(3)}s`,
        errorRate: data.totalRequests > 0 ? (data.errorCount / data.totalRequests * 100).toFixed(2) + '%' : '0%',
        endpointCounts,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      },
      status: 'healthy',
    };

    res.json(healthMetrics);

    logger.info('[METRICS] Health metrics served');
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      timestamp: new Date().toISOString(),
    });

    logger.error({ error }, '[METRICS] Failed to serve metrics');
  }
};

/**
 * Prometheus metrics endpoint (scrape ready)
 */
export const prometheusMetricsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    // This would contain Prometheus format metrics
    // For now, serve OpenTelemetry equivalent
    const data = getMetricsData();

    const prometheusFormat = [
      '# HELP http_requests_total Total number of HTTP requests',
      '# TYPE http_requests_total counter',
      `http_requests_total ${data.totalRequests}`,
      '',
      '# HELP http_requests_errors_total Total number of HTTP errors',
      '# TYPE http_requests_errors_total counter',
      `http_requests_errors_total ${data.errorCount}`,
      '',
      '# HELP http_active_connections Number of active HTTP connections',
      '# TYPE http_active_connections gauge',
      `http_active_connections ${data.activeConnections}`,
      '',
      '# HELP http_request_duration_seconds HTTP request duration in seconds',
      '# TYPE http_request_duration_seconds histogram',
      `http_request_duration_seconds_sum ${data.totalResponseTime}`,
      `http_request_duration_seconds_count ${data.totalRequests}`,
    ].join('\n');

    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(prometheusFormat);

    logger.info('[METRICS] Prometheus metrics served');
  } catch (error) {
    res.status(500).send('# Error generating metrics\n');
    logger.error({ error }, '[METRICS] Failed to serve Prometheus metrics');
  }
};
