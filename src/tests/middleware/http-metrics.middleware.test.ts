jest.mock('../../logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

import { Request, Response } from 'express';
import logger from '../../logger';
import {
  httpMetricsMiddleware,
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

const buildRes = (): Response => {
  const res = {
    statusCode: 200,
    end: jest.fn(),
    json: jest.fn(),
    set: jest.fn(),
    send: jest.fn(),
  };
  return res as unknown as Response;
};

describe('httpMetricsMiddleware', () => {
  beforeEach(() => {
    resetMetrics();
    jest.clearAllMocks();
  });

  test('calls next() synchronously', () => {
    const req = buildReq();
    const res = buildRes();
    const next = jest.fn();

    httpMetricsMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test('increments totalRequests and per-endpoint counts, and logs request start', () => {
    const req = buildReq();
    const res = buildRes();

    httpMetricsMiddleware(req, res, jest.fn());

    expect(getMetricsData().totalRequests).toBe(1);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', url: '/api/articles' }),
      '[HTTP_METRICS] Request started',
    );
  });

  test('records a successful completion (status < 400) without bumping errorCount', () => {
    const req = buildReq();
    const res = buildRes();

    httpMetricsMiddleware(req, res, jest.fn());
    res.statusCode = 200;
    (res.end as unknown as (...args: unknown[]) => void)();

    const data = getMetricsData();
    expect(data.errorCount).toBe(0);
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
    (res.end as unknown as (...args: unknown[]) => void)();

    const data = getMetricsData();
    expect(data.errorCount).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, errorCount: 1 }),
      '[HTTP_METRICS] Request completed',
    );
  });

  test('decrements active connections back to 0 once the response ends', () => {
    const req = buildReq();
    const res = buildRes();

    httpMetricsMiddleware(req, res, jest.fn());
    expect(getMetricsData().activeConnections).toBe(1);

    (res.end as unknown as (...args: unknown[]) => void)();
    expect(getMetricsData().activeConnections).toBe(0);
  });

  test('forwards chunk/encoding to the original res.end', () => {
    const req = buildReq();
    const res = buildRes();
    const originalEnd = res.end;

    httpMetricsMiddleware(req, res, jest.fn());
    (res.end as unknown as (...args: unknown[]) => void)('body', 'utf-8');

    expect(originalEnd).toHaveBeenCalledWith('body', 'utf-8');
  });
});

describe('getMetricsData', () => {
  beforeEach(() => {
    resetMetrics();
  });

  test('averageResponseTime is 0 when there have been no requests', () => {
    expect(getMetricsData().averageResponseTime).toBe(0);
  });

  test('averageResponseTime is computed from totalResponseTime / totalRequests', () => {
    const req = buildReq();
    const res = buildRes();

    httpMetricsMiddleware(req, res, jest.fn());
    (res.end as unknown as (...args: unknown[]) => void)();

    const data = getMetricsData();
    expect(data.totalRequests).toBe(1);
    expect(data.averageResponseTime).toBeGreaterThanOrEqual(0);
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

describe('metricsHandler', () => {
  beforeEach(() => {
    resetMetrics();
  });

  test('responds with a healthy metrics payload', async () => {
    httpMetricsMiddleware(buildReq(), buildRes(), jest.fn());
    const res = buildRes();

    await metricsHandler({} as Request, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'conduit-api',
        status: 'healthy',
        metrics: expect.objectContaining({
          totalRequests: 1,
        }),
      }),
    );
  });
});

describe('prometheusMetricsHandler', () => {
  beforeEach(() => {
    resetMetrics();
  });

  test('responds with Prometheus text exposition format', async () => {
    httpMetricsMiddleware(buildReq(), buildRes(), jest.fn());
    const res = buildRes();

    await prometheusMetricsHandler({} as Request, res);

    expect(res.set).toHaveBeenCalledWith('Content-Type', 'text/plain; version=0.0.4');
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('http_requests_total 1'));
  });
});
