import request from 'supertest';
import express from 'express';
import * as bodyParser from 'body-parser';

jest.mock('../../prisma/prisma-client', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 1,
        email: 'new@example.com',
        username: 'newuser',
        bio: null,
        image: null,
      }),
    },
  },
}));

jest.mock('../../logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

import authController from '../../app/routes/auth/auth.controller';
import { globalErrorHandler, notFoundHandler } from '../../app/middleware/error-handler.middleware';

describe('Rate limiting on POST /api/users/login', () => {
  const buildApp = () => {
    const app = express();
    app.use(bodyParser.json());
    app.use('/api', authController);
    app.use(notFoundHandler);
    app.use(globalErrorHandler);
    return app;
  };

  test('allows up to 5 requests per 15 minutes and blocks the 6th with 429', async () => {
    const app = buildApp();
    const credentials = { user: { email: 'someone@example.com', password: 'wrong-password' } };

    const responses = [];
    for (let i = 0; i < 6; i++) {
      responses.push(await request(app).post('/api/users/login').send(credentials));
    }

    const [first, second, third, fourth, fifth, sixth] = responses;

    // First 5 attempts are let through by the rate limiter (they fail auth with 403,
    // since the mocked user lookup always returns null — that's expected and unrelated
    // to rate limiting).
    for (const res of [first, second, third, fourth, fifth]) {
      expect(res.status).not.toBe(429);
    }

    // The 6th request within the same window must be rejected by the rate limiter.
    expect(sixth.status).toBe(429);
    expect(sixth.body).toEqual({
      errors: {
        'rate-limit': [
          'Too many login attempts from this IP, please try again after 15 minutes',
        ],
      },
    });
  });

  test('exposes standard RateLimit-* headers once the limit is exceeded', async () => {
    const app = buildApp();
    const credentials = { user: { email: 'someone-else@example.com', password: 'wrong-password' } };

    let last;
    for (let i = 0; i < 6; i++) {
      last = await request(app).post('/api/users/login').send(credentials);
    }

    expect(last!.status).toBe(429);
    expect(last!.headers).toHaveProperty('ratelimit-limit');
    expect(last!.headers).toHaveProperty('ratelimit-remaining', '0');
  });

  test('does not rate limit unrelated endpoints', async () => {
    const app = buildApp();

    for (let i = 0; i < 6; i++) {
      // eslint-disable-next-line no-await-in-loop
      await request(app).post('/api/users/login').send({ user: { email: 'x@x.com', password: 'x' } });
    }

    const registerResponse = await request(app)
      .post('/api/users')
      .send({ user: { email: 'new@example.com', username: 'newuser', password: 'password123' } });

    expect(registerResponse.status).not.toBe(429);
  });
});

describe('Rate limiting on POST /api/users', () => {
  const buildApp = () => {
    const app = express();
    app.use(bodyParser.json());
    app.use('/api', authController);
    app.use(notFoundHandler);
    app.use(globalErrorHandler);
    return app;
  };

  // Registration and login use two independent express-rate-limit instances
  // (registrationRateLimit/loginRateLimit), so their request counts don't
  // share a bucket even though both key off the same IP. This file's login
  // describe block above already exhausts loginRateLimit's budget for
  // 127.0.0.1 (the middleware is a module-level singleton, reused by every
  // app instance built via buildApp() within this file) — sending well past
  // registrationRateLimit's own limit here proves it blocks independently,
  // regardless of how many prior tests in this file already touched login.
  test('blocks registration attempts once its own limit is exceeded, independently of the login limiter', async () => {
    const app = buildApp();

    let last;
    for (let i = 0; i < 12; i++) {
      // eslint-disable-next-line no-await-in-loop
      last = await request(app)
        .post('/api/users')
        .send({ user: { email: `user${i}@example.com`, username: `user${i}`, password: 'password123' } });
    }

    expect(last!.status).toBe(429);
    expect(last!.body).toEqual({
      errors: {
        'rate-limit': [
          'Too many registration attempts from this IP, please try again after 15 minutes',
        ],
      },
    });
  });
});
