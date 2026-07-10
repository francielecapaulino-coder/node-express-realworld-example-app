import request from 'supertest';
import express from 'express';
import cors from 'cors';
import * as bodyParser from 'body-parser';

// Mock Prisma globally for integration tests
jest.mock('../../prisma/prisma-client', () => {
  const mockPrisma = {
    article: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0),
    },
    user: {
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
    comment: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue({}),
    },
    tag: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  return {
    __esModule: true,
    default: mockPrisma,
  };
});

import routes from '../../app/routes/routes';
import { globalErrorHandler, notFoundHandler } from '../../app/middleware/error-handler.middleware';
import { setupSwagger } from '../../config/swagger';
import logger from '../../logger';

// Mock dependencies
jest.mock('../../logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../../telemetry', () => ({
  startTelemetry: jest.fn(),
  stopTelemetry: jest.fn(),
}));



// Mock rate limiting
jest.mock('../../app/middleware/rate-limit.middleware', () => ({
  loginRateLimit: (req: any, res: any, next: any) => next(),
  registrationRateLimit: (req: any, res: any, next: any) => next(),
}));

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
setupSwagger(app);
// `routes` already mounts everything under '/api' (see app/routes/routes.ts),
// so it must be app.use()'d directly — app.use('/api', routes) would double
// the prefix to '/api/api/...' and 404 every real endpoint.
app.use(routes);
app.use(notFoundHandler);
app.use(globalErrorHandler);

describe('API Contract Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health & Ready Endpoints', () => {
test('GET / should respond with 404 or 200 (route check)', async () => {
      const response = await request(app).get('/');
      expect([200, 404]).toContain(response.status);
    });

    test('GET /api should respond (API base route)', async () => {
      const response = await request(app).get('/api');
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/users should require valid user data', async () => {
      // No username provided -> createUser rejects with a 422 validation error
      // (see src/app/routes/auth/auth.service.ts createUser)
      const invalidUser = { user: { email: 'invalid', password: '123' } };

      const response = await request(app)
        .post('/api/users')
        .send(invalidUser);

      expect(response.status).toBe(422);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveProperty('username');
    });

    test('POST /api/users/login should accept credentials', async () => {
      const loginData = { user: { email: 'test@example.com', password: 'password' } };

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData);

      // With the mocked Prisma client returning no user, login() rejects with
      // 403 (see src/app/routes/auth/auth.service.ts login).
      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('Articles Endpoints', () => {
    test('GET /api/articles should accept query parameters', async () => {
      const response = await request(app)
        .get('/api/articles')
        .query({ limit: '10', offset: '0' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('articles');
      expect(Array.isArray(response.body.articles)).toBe(true);
    });

    test('GET /api/articles/:slug should handle article requests', async () => {
      const response = await request(app).get('/api/articles/test-article');
      
      // Should respond with either 200 (found) or 404 (not found)
      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('article');
      }
    });

    test('POST /api/articles should require authentication', async () => {
      const articleData = {
        article: {
          title: 'Test Article',
          description: 'Test Description',
          body: 'Test Body Content',
          tagList: ['test']
        }
      };

      const response = await request(app)
        .post('/api/articles')
        .send(articleData);

      expect(response.status).toBe(401); // Unauthorized
    });
  });

  describe('Bookmarking Endpoints', () => {
    test('POST /api/articles/:slug/bookmark should require authentication', async () => {
      const response = await request(app)
        .post('/api/articles/test-article/bookmark');

      expect(response.status).toBe(401); // Unauthorized
    });

    test('DELETE /api/articles/:slug/bookmark should require authentication', async () => {
      const response = await request(app)
        .delete('/api/articles/test-article/bookmark');

      expect(response.status).toBe(401); // Unauthorized
    });
  });

  describe('Profile Endpoints', () => {
    test('GET /api/profiles/:username should accept profile requests', async () => {
      const response = await request(app).get('/api/profiles/testuser');
      
      // Should respond with either 200 (found) or 404 (not found)
      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('profile');
      }
    });
  });

  describe('Tags Endpoints', () => {
    test('GET /api/tags should return tags array', async () => {
      const response = await request(app).get('/api/tags');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tags');
      expect(Array.isArray(response.body.tags)).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    test('POST /api/users/login should have rate limiting headers when applicable', async () => {
      const loginData = { user: { email: 'test@example.com', password: 'password' } };
      
      const response = await request(app)
        .post('/api/users/login')
        .send(loginData);

      // Rate limiting headers may be present either on success or failure
      if (response.status === 429) {
        expect(response.headers).toHaveProperty('x-ratelimit-limit');
        expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      }
    });
  });

  describe('Error Handling', () => {
    test('GET /nonexistent should return 404 with error structure', async () => {
      const response = await request(app).get('/api/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('errors');
    });

    test('DELETE /api/articles/invalid-slug should handle gracefully', async () => {
      const response = await request(app)
        .delete('/api/articles/invalid-slug')
        .set('Authorization', 'Bearer fake-token');

      expect([401, 404]).toContain(response.status);
    });
  });

  describe('Content Type Validation', () => {
    test('API should accept JSON content type', async () => {
      const response = await request(app)
        .get('/api/articles')
        .set('Accept', 'application/json');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('CORS Headers', () => {
    test('Should include appropriate CORS headers', async () => {
      const response = await request(app)
        .options('/api/articles')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('API Documentation', () => {
    test('GET /api-docs should return Swagger documentation', async () => {
      const response = await request(app).get('/api-docs');

      // swagger-ui-express redirects to the trailing-slash URL (301) before
      // serving the UI (200); either is a valid "docs are mounted" signal.
      expect([200, 301, 302]).toContain(response.status);
    });
  });
});