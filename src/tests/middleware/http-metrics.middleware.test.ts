jest.mock('../../logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// The middleware creates its OTel instruments once at module load time via
// meter.createCounter/createHistogram/createUpDownCounter. Mock the meter so
// every counter/histogram is a distinct jest.fn() we can assert call args on
// — the real @opentelemetry/api meter (no SDK configured in tests) is a
// no-op that swallows arguments, which is why every `.add()`/`.record()`
// call site previously had zero coverage.
const mockInstruments: Record<string, { add?: jest.Mock; record?: jest.Mock }> = {};
jest.mock('@opentelemetry/api', () => ({
  metrics: {
    getMeter: () => ({
      createCounter: (name: string) => {
        mockInstruments[name] = { add: jest.fn() };
        return mockInstruments[name];
      },
      createHistogram: (name: string) => {
        mockInstruments[name] = { record: jest.fn() };
        return mockInstruments[name];
      },
      createUpDownCounter: (name: string) => {
        mockInstruments[name] = { add: jest.fn() };
        return mockInstruments[name];
      },
    }),
  },
}));

import { Request, Response } from 'express';
import logger from '../../logger';
import {
  httpMetricsMiddleware,
  metricsAuthMiddleware,
  getMetricsData,
  resetMetrics,
  metricsHandler,
  prometheusMetricsHandler,
} from '../../app/middleware/http-metrics.middleware';

const buildReq = (overrides: Partial<Request> = {}): Request =>
  ({
    method: 'GET',
    url: '/api/articles',
    path: '/api/articles',
    route: { path: '/api/articles' },
    get: jest.fn().mockReturnValue('jest-agent'),
    ip: '127.0.0.1',
    headers: {},
    ...overrides,
  } as unknown as Request);

// Mimics just enough of Response's EventEmitter surface (on/emit) for
// httpMetricsMiddleware's res.on('finish'|'close') listeners.
const buildRes = (): Response => {
  const listeners: Record<string, Array<() => void>> = {};
  const res: any = {
    statusCode: 200,
    on: jest.fn((event: string, cb: () => void) => {
      (listeners[event] ||= []).push(cb);
      return res;
    }),
    emit: (event: string) => {
      (listeners[event] || []).forEach((cb) => cb());
    },
    json: jest.fn(),
    set: jest.fn(),
    send: jest.fn(),
  };
  res.status = jest.fn().mockReturnValue(res);
  return res as unknown as Response;
};

const finish = (res: Response) => (res as any).emit('finish');
const close = (res: Response) => (res as any).emit('close');

describe('httpMetricsMiddleware', () => {
  beforeEach(() => {
    resetMetrics();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('calls next() synchronously', () => {
    const req = buildReq();
    const res = buildRes();
    const next = jest.fn();

    httpMetricsMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test('increments totalRequests and logs request start', () => {
    const req = buildReq();
    const res = buildRes();

    httpMetricsMiddleware(req, res, jest.fn());

    expect(getMetricsData().totalRequests).toBe(1);
    expect(req.get).toHaveBeenCalledWith('User-Agent');
    expect(logger.info).toHaveBeenCalledWith(
      {
        method: 'GET',
        url: '/api/articles',
        userAgent: 'jest-agent',
        ip: '127.0.0.1',
        requestId: undefined,
      },
      '[HTTP_METRICS] Request started',
    );
  });

  test('picks up the x-request-id header and threads it through the start and completion logs', () => {
    const req = buildReq({ headers: { 'x-request-id': 'req-abc-123' } });
    const res = buildRes();

    httpMetricsMiddleware(req, res, jest.fn());

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'req-abc-123' }),
      '[HTTP_METRICS] Request started',
    );

    finish(res);

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'req-abc-123' }),
      '[HTTP_METRICS] Request completed',
    );
  });

  test('increments the same endpoint key across repeated requests instead of resetting it', () => {
    const res1 = buildRes();
    const res2 = buildRes();
    httpMetricsMiddleware(buildReq(), res1, jest.fn());
    finish(res1);
    httpMetricsMiddleware(buildReq(), res2, jest.fn());
    finish(res2);

    expect(getMetricsData().endpointCounts.get('GET /api/articles')).toBe(2);
  });

  test('falls back to a fixed "unmatched" label when req.route is not set (e.g. unmatched routes), instead of the raw path', () => {
    const req = buildReq({ route: undefined, path: '/some-random-probed-path' });
    const res = buildRes();

    httpMetricsMiddleware(req, res, jest.fn());
    finish(res);

    expect(getMetricsData().endpointCounts.get('GET unmatched')).toBe(1);
    expect(getMetricsData().endpointCounts.get('GET /some-random-probed-path')).toBeUndefined();
  });

  test('increments activeGauge on start and decrements it once on finish', () => {
    const req = buildReq();
    const res = buildRes();

    httpMetricsMiddleware(req, res, jest.fn());
    expect(mockInstruments['http_active_connections'].add).toHaveBeenCalledWith(1);

    finish(res);
    expect(mockInstruments['http_active_connections'].add).toHaveBeenCalledWith(-1);
    expect(mockInstruments['http_active_connections'].add).toHaveBeenCalledTimes(2);
  });

  test('decrements activeGauge on close even if finish never fires (aborted connection)', () => {
    const req = buildReq();
    const res = buildRes();

    httpMetricsMiddleware(req, res, jest.fn());
    close(res);

    expect(mockInstruments['http_active_connections'].add).toHaveBeenLastCalledWith(-1);
    expect(getMetricsData().activeConnections).toBe(0);
  });

  test('does not double-decrement activeConnections when close fires after finish', () => {
    const req = buildReq();
    const res = buildRes();

    httpMetricsMiddleware(req, res, jest.fn());
    finish(res);
    close(res);

    expect(mockInstruments['http_active_connections'].add).toHaveBeenCalledTimes(2);
    expect(getMetricsData().activeConnections).toBe(0);
  });

  test('does not record request/duration/endpoint counters at request start (only on completion)', () => {
    const req = buildReq();
    const res = buildRes();

    httpMetricsMiddleware(req, res, jest.fn());

    expect(mockInstruments['http_requests_total'].add).not.toHaveBeenCalled();
    expect(mockInstruments['http_requests_endpoint_total'].add).not.toHaveBeenCalled();
  });

  test('records the request counter and endpoint counter exactly once, with the real status code', () => {
    const req = buildReq();
    const res = buildRes();

    httpMetricsMiddleware(req, res, jest.fn());
    res.statusCode = 201;
    finish(res);

    expect(mockInstruments['http_requests_total'].add).toHaveBeenCalledTimes(1);
    expect(mockInstruments['http_requests_total'].add).toHaveBeenCalledWith(1, {
      method: 'GET',
      route: 'GET /api/articles',
      status_code: '201',
    });
    expect(mockInstruments['http_requests_endpoint_total'].add).toHaveBeenCalledTimes(1);
    expect(mockInstruments['http_requests_endpoint_total'].add).toHaveBeenCalledWith(1, {
      method: 'GET',
      endpoint: 'GET /api/articles',
    });
  });

  test('computes duration from Date.now() deltas and records it on the histogram', () => {
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(1_000).mockReturnValueOnce(1_500);

    const req = buildReq();
    const res = buildRes();

    httpMetricsMiddleware(req, res, jest.fn());
    finish(res);

    expect(getMetricsData().totalResponseTime).toBe(0.5);
    expect(mockInstruments['http_request_duration_seconds'].record).toHaveBeenCalledWith(0.5, {
      method: 'GET',
      route: 'GET /api/articles',
      status_code: '200',
    });
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ duration: '0.500s' }),
      '[HTTP_METRICS] Request completed',
    );
  });

  test('falls back to the "unmatched" label for the error/duration/final-counter metrics when req.route is not set', () => {
    const req = buildReq({ route: undefined, path: '/unmatched' });
    const res = buildRes();

    httpMetricsMiddleware(req, res, jest.fn());
    res.statusCode = 500;
    finish(res);

    expect(mockInstruments['http_requests_errors_total'].add).toHaveBeenCalledWith(1, {
      method: 'GET',
      route: 'GET unmatched',
      status_code: 500,
    });
    expect(mockInstruments['http_request_duration_seconds'].record).toHaveBeenCalledWith(expect.any(Number), {
      method: 'GET',
      route: 'GET unmatched',
      status_code: '500',
    });
    expect(mockInstruments['http_requests_total'].add).toHaveBeenLastCalledWith(1, {
      method: 'GET',
      route: 'GET unmatched',
      status_code: '500',
    });
  });

  test('records a successful completion (status < 400) without bumping errorCount', () => {
    const req = buildReq();
    const res = buildRes();

    httpMetricsMiddleware(req, res, jest.fn());
    res.statusCode = 200;
    finish(res);

    const data = getMetricsData();
    expect(data.errorCount).toBe(0);
    expect(mockInstruments['http_requests_errors_total'].add).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200 }),
      '[HTTP_METRICS] Request completed',
    );
  });

  test('records a failed completion (status >= 400) and bumps errorCount, logging at warn level', () => {
    const req = buildReq();
    const res = buildRes();

    httpMetricsMiddleware(req, res, jest.fn());
    res.statusCode = 404;
    finish(res);

    const data = getMetricsData();
    expect(data.errorCount).toBe(1);
    expect(mockInstruments['http_requests_errors_total'].add).toHaveBeenCalledWith(1, {
      method: 'GET',
      route: 'GET /api/articles',
      status_code: 404,
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, errorCount: 1 }),
      '[HTTP_METRICS] Request completed',
    );
  });

  test('a status of exactly 400 counts as an error (boundary is inclusive)', () => {
    const req = buildReq();
    const res = buildRes();

    httpMetricsMiddleware(req, res, jest.fn());
    res.statusCode = 400;
    finish(res);

    expect(getMetricsData().errorCount).toBe(1);
  });

  test('a status of 399 does not count as an error (boundary is exclusive below 400)', () => {
    const req = buildReq();
    const res = buildRes();

    httpMetricsMiddleware(req, res, jest.fn());
    res.statusCode = 399;
    finish(res);

    expect(getMetricsData().errorCount).toBe(0);
  });

  test('decrements active connections back to 0 once the response finishes', () => {
    const req = buildReq();
    const res = buildRes();

    httpMetricsMiddleware(req, res, jest.fn());
    expect(getMetricsData().activeConnections).toBe(1);

    finish(res);
    expect(getMetricsData().activeConnections).toBe(0);
  });
});

describe('getMetricsData', () => {
  beforeEach(() => {
    resetMetrics();
  });

  test('averageResponseTime is 0 when there have been no requests', () => {
    expect(getMetricsData().averageResponseTime).toBe(0);
  });

  test('averageResponseTime is totalResponseTime divided by totalRequests', () => {
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(0).mockReturnValueOnce(1000); // request 1: 1s
    const res1 = buildRes();
    httpMetricsMiddleware(buildReq(), res1, jest.fn());
    finish(res1);
    nowSpy.mockRestore();

    const nowSpy2 = jest.spyOn(Date, 'now');
    nowSpy2.mockReturnValueOnce(2000).mockReturnValueOnce(2500); // request 2: 0.5s
    const res2 = buildRes();
    httpMetricsMiddleware(buildReq(), res2, jest.fn());
    finish(res2);
    nowSpy2.mockRestore();

    const data = getMetricsData();
    expect(data.totalRequests).toBe(2);
    expect(data.averageResponseTime).toBeCloseTo((1 + 0.5) / 2, 5);
  });
});

describe('resetMetrics', () => {
  test('clears counters and the endpoint map back to their initial state', () => {
    httpMetricsMiddleware(buildReq(), buildRes(), jest.fn());
    expect(getMetricsData().totalRequests).toBeGreaterThan(0);

    resetMetrics();

    const data = getMetricsData();
    expect(data.totalRequests).toBe(0);
    expect(data.errorCount).toBe(0);
    expect(data.activeConnections).toBe(0);
    expect(data.endpointCounts.size).toBe(0);
  });
});

describe('metricsAuthMiddleware', () => {
  const originalToken = process.env.METRICS_TOKEN;

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.METRICS_TOKEN;
    } else {
      process.env.METRICS_TOKEN = originalToken;
    }
  });

  test('fails closed with a 401 when METRICS_TOKEN is not configured, even with a header set', () => {
    delete process.env.METRICS_TOKEN;
    const req = { headers: { 'x-metrics-token': 'anything' } } as unknown as Request;
    const res = buildRes();
    const next = jest.fn();

    metricsAuthMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects requests with a 401 when the x-metrics-token header is missing', () => {
    process.env.METRICS_TOKEN = 'secret-token';
    const req = { headers: {} } as Request;
    const res = buildRes();
    const next = jest.fn();

    metricsAuthMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      errors: { authorization: ['missing or invalid metrics token'] },
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects requests with a mismatched x-metrics-token header', () => {
    process.env.METRICS_TOKEN = 'secret-token';
    const req = { headers: { 'x-metrics-token': 'wrong-token' } } as unknown as Request;
    const res = buildRes();
    const next = jest.fn();

    metricsAuthMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next() when the x-metrics-token header matches METRICS_TOKEN', () => {
    process.env.METRICS_TOKEN = 'secret-token';
    const req = { headers: { 'x-metrics-token': 'secret-token' } } as unknown as Request;
    const res = buildRes();
    const next = jest.fn();

    metricsAuthMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('metricsHandler', () => {
  beforeEach(() => {
    resetMetrics();
  });

  test('responds with a healthy metrics payload, errorRate 0% when there are no requests', async () => {
    const res = buildRes();

    await metricsHandler({} as Request, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'conduit-api',
        status: 'healthy',
        metrics: expect.objectContaining({ totalRequests: 0, errorRate: '0%' }),
      }),
    );
  });

  test('computes errorRate as a percentage when there have been requests and errors', async () => {
    const req = buildReq();
    const okRes = buildRes();
    httpMetricsMiddleware(req, okRes, jest.fn());
    finish(okRes);

    const errReq = buildReq();
    const errRes = buildRes();
    httpMetricsMiddleware(errReq, errRes, jest.fn());
    errRes.statusCode = 500;
    finish(errRes);

    const res = buildRes();
    await metricsHandler({} as Request, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        metrics: expect.objectContaining({
          totalRequests: 2,
          errorCount: 1,
          errorRate: '50.00%',
          endpointCounts: { 'GET /api/articles': 2 },
          averageResponseTime: expect.stringMatching(/^\d+\.\d{3}s$/),
        }),
      }),
    );
  });

  test('logs that health metrics were served', async () => {
    await metricsHandler({} as Request, buildRes());

    expect(logger.info).toHaveBeenCalledWith('[METRICS] Health metrics served');
  });

  test('responds with 500 and logs when building the response payload throws', async () => {
    const res = buildRes();
    const boom = new Error('boom');
    (res.json as jest.Mock).mockImplementationOnce(() => {
      throw boom;
    });

    await metricsHandler({} as Request, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenLastCalledWith({
      error: 'Failed to retrieve metrics',
      timestamp: expect.any(String),
    });
    expect(logger.error).toHaveBeenCalledWith({ error: boom }, '[METRICS] Failed to serve metrics');
  });
});

describe('prometheusMetricsHandler', () => {
  beforeEach(() => {
    resetMetrics();
  });

  test('responds with the exact Prometheus text exposition format', async () => {
    const res = buildRes();

    await prometheusMetricsHandler({} as Request, res);

    expect(res.set).toHaveBeenCalledWith('Content-Type', 'text/plain; version=0.0.4');
    expect(res.send).toHaveBeenCalledWith(
      [
        '# HELP http_requests_total Total number of HTTP requests',
        '# TYPE http_requests_total counter',
        'http_requests_total 0',
        '',
        '# HELP http_requests_errors_total Total number of HTTP errors',
        '# TYPE http_requests_errors_total counter',
        'http_requests_errors_total 0',
        '',
        '# HELP http_active_connections Number of active HTTP connections',
        '# TYPE http_active_connections gauge',
        'http_active_connections 0',
        '',
        '# HELP http_request_duration_seconds HTTP request duration in seconds',
        '# TYPE http_request_duration_seconds histogram',
        'http_request_duration_seconds_sum 0',
        'http_request_duration_seconds_count 0',
      ].join('\n'),
    );
  });

  test('logs that Prometheus metrics were served', async () => {
    await prometheusMetricsHandler({} as Request, buildRes());

    expect(logger.info).toHaveBeenCalledWith('[METRICS] Prometheus metrics served');
  });

  test('responds with 500 and logs when sending the Prometheus payload throws', async () => {
    const res = buildRes();
    const boom = new Error('boom');
    (res.send as jest.Mock).mockImplementationOnce(() => {
      throw boom;
    });

    await prometheusMetricsHandler({} as Request, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenLastCalledWith('# Error generating metrics\n');
    expect(logger.error).toHaveBeenCalledWith({ error: boom }, '[METRICS] Failed to serve Prometheus metrics');
  });
});
