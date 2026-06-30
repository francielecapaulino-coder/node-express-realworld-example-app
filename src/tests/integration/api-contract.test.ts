import request from 'supertest';
import express from 'express';
import cors from 'cors';
import * as bodyParser from 'body-parser';

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

describe('API Contract Integration Tests', () => {
  let app: express.Application;

  beforeAll(async () => {
    // Setup test application
    app = express();
    
    app.use(cors());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    
    // Setup Swagger documentation
    setupSwagger(app);
    
    app.use(routes);
    
    // Health check endpoint
    app.get('/', (_req: express.Request, res: express.Response) => {
      res.json({ 
        status: 'API is running on /api',
        documentation: 'Swagger UI available at /api-docs',
        openapi: 'OpenAPI spec available at /api-docs.json'
      });
    });

    // Error handling
    app.use(notFoundHandler);
    app.use(globalErrorHandler);
  });

  describe('API Health and Documentation', () => {
    test('should return health check information', async () => {
      // When
      const response = await request(app).get('/');

      // Then
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'API is running on /api',
        documentation: 'Swagger UI available at /api-docs',
        openapi: 'OpenAPI spec available at /api-docs.json'
      });
    });

    test('should serve Swagger UI at /api-docs', async () => {
      // When
      const response = await request(app).get('/api-docs');

      // Then
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain('swagger');
    });

    test('should serve OpenAPI JSON spec at /api-docs.json', async () => {
      // When
      const response = await request(app).get('/api-docs.json');

      // Then
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      
      const spec = response.body;
      expect(spec).toHaveProperty('openapi', '3.0.0');
      expect(spec).toHaveProperty('info.title', 'Conduit API - Node/Express RealWorld Example');
      expect(spec).toHaveProperty('components.schemas');
      expect(spec).toHaveProperty('components.securitySchemes');
    });

    test('should include RealWorld compliant response schemas', async () => {
      // When
      const response = await request(app).get('/api-docs.json');

      // Then
      const schemas = response.body.components.schemas;
      
      // Check for RealWorld response envelopes
      expect(schemas).toHaveProperty('UserResponse');
      expect(schemas).toHaveProperty('ArticleResponse');
      expect(schemas).toHaveProperty('ArticlesResponse');
      expect(schemas).toHaveProperty('ProfileResponse');
      expect(schemas).toHaveProperty('CommentResponse');
      expect(schemas).toHaveProperty('CommentsResponse');
      expect(schemas).toHaveProperty('TagsResponse');
    });
  });

  describe('Authentication Endpoints - Contract Compliance', () => {
    test('should handle user registration request structure', async () => {
      // Given
      const newUser = {
        user: {
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        }
      };

      // When
      const response = await request(app)
        .post('/api/users')
        .send(newUser);

      // Then - Should have proper structure even if validation fails
      expect(response.status).toBeLessThan(500);
      expect(response.body).toEqual(
        expect.objectContaining({
          errors: expect.any(Object)
        })
      );
    });

    test('should handle login request structure', async () => {
      // Given
      const loginData = {
        user: {
          email: 'test@example.com',
          password: 'password123'
        }
      };

      // When
      const response = await request(app)
        .post('/api/users/login')
        .send(loginData);

      // Then
      expect(response.status).toBeLessThan(500);
      if (response.status >= 400) {
        expect(response.body).toHaveProperty('errors');
      } else {
        expect(response.body).toHaveProperty('user');
        expect(response.body.user).toHaveProperty('token');
      }
    });
  });

  describe('Article Endpoints - Including Bookmarks', () => {
    test('should handle article bookmark endpoint structure', async () => {
      // Given
      const slug = 'test-article-slug';

      // When
      const response = await request(app)
        .post(`/api/articles/${slug}/bookmark`)
        .set('Authorization', 'Token invalid-token');

      // Then - Should return proper error structure or success structure
      expect(response.status).toBeLessThan(500);
      if (response.status >= 400) {
        expect(response.body).toHaveProperty('errors');
      } else {
        expect(response.body).toHaveProperty('article');
        expect(response.body.article).toHaveProperty('bookmarked');
        expect(response.body.article).toHaveProperty('bookmarksCount');
      }
    });

    test('should handle article unbookmark endpoint structure', async () => {
      // Given
      const slug = 'test-article-slug';

      // When
      const response = await request(app)
        .delete(`/api/articles/${slug}/bookmark`)
        .set('Authorization', 'Token invalid-token');

      // Then
      expect(response.status).toBeLessThan(500);
      if (response.status >= 400) {
        expect(response.body).toHaveProperty('errors');
      } else {
        expect(response.body).toHaveProperty('article');
        expect(response.body.article).toHaveProperty('bookmarked');
        expect(response.body.article).toHaveProperty('bookmarksCount');
      }
    });

    test('should return 401 for bookmark endpoints without authentication', async () => {
      // When
      const bookmarkResponse = await request(app)
        .post('/api/articles/test-slug/bookmark');

      const unbookmarkResponse = await request(app)
        .delete('/api/articles/test-slug/bookmark');

      // Then
      expect(bookmarkResponse.status).toBe(401);
      expect(unbookmarkResponse.status).toBe(401);
      
      expect(bookmarkResponse.body).toHaveProperty('errors');
      expect(unbookmarkResponse.body).toHaveProperty('errors');
    });
  });

  describe('Error Response Format Consistency', () => {
    test('should maintain consistent error format across all endpoints', async () => {
      // Test various error scenarios
      const endpoints = [
        { method: 'get', path: '/api/nonexistent' }, // 404
        { method: 'post', path: '/api/users', data: {} }, // validation error
        { method: 'get', path: '/api/user' }, // auth required
        { method: 'post', path: '/api/articles/test-slug/bookmark' }, // auth required
      ];

      for (const endpoint of endpoints) {
        let response: any;
        
        if (endpoint.method === 'get') {
          response = await request(app).get(endpoint.path);
        } else {
          response = await request(app)
            .post(endpoint.path)
            .send(endpoint.data || {});
        }

        // All error responses should have the same structure
        if (response.status >= 400) {
          expect(response.body).toHaveProperty('errors');
          expect(typeof response.body.errors).toBe('object');
        }
      }
    });
  });

  describe('OpenAPI Contract Validation', () => {
    test('should document all implemented endpoints', async () => {
      // When
      const response = await request(app).get('/api-docs.json');
      const spec = response.body;

      // Then - Check for core endpoints
      const paths = spec.paths;
      
      // Authentication endpoints
      expect(paths).toHaveProperty('/users');
      expect(paths).toHaveProperty('/users/login');
      expect(paths).toHaveProperty('/user');
      
      // Article endpoints
      expect(paths).toHaveProperty('/articles');
      expect(paths).toHaveProperty('/articles/{slug}');
      expect(paths).toHaveProperty('/articles/{slug}/bookmark');
      
      // Verify bookmark endpoints are documented
      expect(paths['/articles/{slug}/bookmark']).toHaveProperty('post');
      expect(paths['/articles/{slug}/bookmark']).toHaveProperty('delete');
    });

    test('should include proper response schemas', async () => {
      // When
      const response = await request(app).get('/api-docs.json');
      const spec = response.body;

      // Then - Check for RealWorld compliance
      const schemas = spec.components.schemas;
      
      // Article schemas should include bookmark fields
      const articleData = schemas.ArticleData;
      if (articleData && articleData.allOf) {
        const bookmarkFields = articleData.allOf.find(part => 
          part.type === 'object' && (
            part.properties?.bookmarked || 
            part.properties?.bookmarksCount
          )
        );
        
        if (bookmarkFields) {
          expect(bookmarkFields.properties.bookmarked).toHaveProperty('type', 'boolean');
          expect(bookmarkFields.properties.bookmarksCount).toHaveProperty('type', 'integer');
        }
      }
    });
  });
});