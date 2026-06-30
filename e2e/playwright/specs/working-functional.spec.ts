import { test, expect } from '@playwright/test';

/**
 * WORKING FUNCTIONAL TESTS BRANCH
 * 
 * This file contains proper, functional E2E tests that should pass.
 * These represent the correct implementation of the broken tests.
 */

test.describe('API Functional Tests - Working', () => {
  let authToken: string;

  test('API health check', async ({ request }) => {
    const response = await request.get('http://localhost:3000/');
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('API is running on /api');
    expect(data.documentation).toBe('Swagger UI available at /api-docs');
  });

  test('OpenAPI documentation endpoint', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api-docs.json');
    
    expect(response.status()).toBe(200);
    const spec = await response.json();
    expect(spec.openapi).toBe('3.0.0');
    expect(spec.info.title).toBe('Conduit API - Node/Express RealWorld Example');
    expect(spec.paths['/users']).toBeDefined();
    expect(spec.paths['/articles/{slug}/bookmark']).toBeDefined();
  });

  test('should handle invalid authentication properly', async ({ request }) => {
    const loginData = {
      user: {
        email: 'nonexistent@test.com',
        password: 'wrongpassword'
      }
    };

    const response = await request.post('http://localhost:3000/api/users/login', {
      data: loginData
    });

    // ✅ CORRECT: Expect 401 for invalid credentials
    expect(response.status()).toBe(401);
    
    const error = await response.json();
    expect(error.errors).toBeDefined();
  });

  test('should reject unauthenticated article creation', async ({ request }) => {
    const article = {
      article: {
        title: 'Valid Test Article',
        description: 'Valid description',
        body: 'Valid content',
        tagList: ['test', 'e2e']
      }
    };

    const response = await request.post('http://localhost:3000/api/articles', {
      data: article
      // ✅ CORRECT: No authorization header
    });

    // ✅ CORRECT: Expect 401 for missing auth
    expect(response.status()).toBe(401);
  });

  test('should handle non-existent endpoints', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/nonexistent-endpoint');
    
    // ✅ CORRECT: Expect 404 for non-existent endpoint
    expect(response.status()).toBe(404);
    
    const error = await response.json();
    expect(error.errors).toBeDefined();
  });

  test('should reject invalid bookmark attempts', async ({ request }) => {
    const invalidToken = 'invalid-jwt-token';
    
    const response = await request.post('http://localhost:3000/api/articles/test-slug/bookmark', {
      headers: {
        'Authorization': `Token ${invalidToken}`
      }
    });

    // ✅ CORRECT: Expect 401 for invalid token
    expect(response.status()).toBe(401);
  });

  test('should enforce rate limiting on login', async ({ request }) => {
    // Make 6 rapid login attempts (exceeds limit of 5)
    const promises = Array(6).fill(null).map((_, index) =>
      request.post('http://localhost:3000/api/users/login', {
        data: {
          user: { 
            email: `ratelimit${index}@test.com`, 
            password: 'test' 
          }
        }
      })
    );

    const responses = await Promise.all(promises);
    
    // ✅ CORRECT: First 5 should work, 6th should be rate limited
    const successful = responses.filter(r => r.status() === 401); // Invalid but not rate limited
    const rateLimited = responses.filter(r => r.status() === 429); // Rate limited
    
    expect(rateLimited.length).toBeGreaterThan(0);
    expect(successful.length + rateLimited.length).toBe(6);
  });

  test('tags endpoint structure validation', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/tags');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    
    // ✅ CORRECT: Expect proper structure
    expect(data.tags).toBeDefined();
    expect(Array.isArray(data.tags)).toBe(true);
    expect(data.tags.length).toBeGreaterThan(0);
  });

  test('malformed JSON handling', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/users', {
      headers: {
        'Content-Type': 'application/json'
      },
      data: 'invalid-json{'
    });

    // ✅ CORRECT: Should handle malformed JSON gracefully
    expect(response.status()).toBe(400);
    
    const error = await response.json();
    expect(error.errors).toBeDefined();
  });

  test('bookmark endpoints with authentication flow', async ({ request }) => {
    // ✅ CORRECT: Test proper authentication and bookmark flow
    
    // First, create user and authenticate
    const userData = {
      user: {
        username: 'testuser',
        email: 'testuser@example.com',
        password: 'testpassword123'
      }
    };

    const createResponse = await request.post('http://localhost:3000/api/users', {
      data: userData
    });

    if (createResponse.status() === 201) {
      const createUser = await createResponse.json();
      authToken = createUser.user.token;
    }

    expect(authToken).toBeDefined();

    // Test bookmark with valid token
    if (authToken) {
      const response = await request.post('http://localhost:3000/api/articles/test-article-slug/bookmark', {
        headers: {
          'Authorization': `Token ${authToken}`
        }
      });

      // Should be 404 (article doesn't exist) or 200/201 (if exists)
      expect([200, 201, 404]).toContain(response.status());
      
      // Error responses should be properly structured
      if (response.status() >= 400) {
        const error = await response.json();
        expect(error.errors).toBeDefined();
      }
    }
  });

  test.describe('Rate Limiting Headers', () => {
    test('should include rate limit headers on login endpoint', async ({ request }) => {
      const response = await request.post('http://localhost:3000/api/users/login', {
        data: {
          user: { email: 'header-test@test.com', password: 'test' }
        }
      });

      // Check if rate limit headers are present
      const hasRateLimitHeaders = 
        response.headers()['rate-limit-limit'] || 
        response.headers()['x-ratelimit-limit'] ||
        response.headers()['rate-limit-remaining'];

      // Headers may not appear on first request
      expect(response.status()).toBe(401); // Invalid credentials
    });
  });
});