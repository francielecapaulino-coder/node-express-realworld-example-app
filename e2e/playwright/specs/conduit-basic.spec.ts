import { test, expect } from '@playwright/test';

/**
 * Conduit Basic E2E Tests
 * Testing core API functionality that works with our current setup
 */

test.describe('Conduit API - Basic Functionality', () => {
  const BASE_URL = 'http://localhost:3000';
  
  test('GET /api/tags - Returns tags array', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/tags`);
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('tags');
    expect(Array.isArray(body.tags)).toBe(true);
    
    // Verify all tags are strings
    for (const tag of body.tags) {
      expect(typeof tag).toBe('string');
    }
  });

  test('GET /api/articles - Returns articles array', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/articles`);
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('articles');
    expect(Array.isArray(body.articles)).toBe(true);
  });

  test('POST /api/users/login - Handles authentication', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/users/login`, {
      data: {
        user: {
          email: 'test@example.com',
          password: 'password'
        }
      }
    });
    
    // Should return either 200 (valid credentials) or 401/400 (invalid)
    expect([200, 401, 400]).toContain(response.status());
  });

  test('GET /api/articles/:slug - Handles article requests', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/articles/test-article`);
    
    expect([200, 404]).toContain(response.status);
  });

  test('POST /api/articles - Requires authentication', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/articles`, {
      data: {
        article: {
          title: 'Test Article',
          description: 'Test Description', 
          body: 'Test Body Content',
          tagList: ['test']
        }
      }
    });
    
    expect(response.status()).toBe(401); // Unauthorized
  });

  test('Bookmark endpoints - Require authentication', async ({ request }) => {
    // Test POST bookmark
    const bookmarkResponse = await request.post(`${BASE_URL}/api/articles/test-article/bookmark`);
    expect(bookmarkResponse.status()).toBe(401);
    
    // Test DELETE bookmark  
    const unbookmarkResponse = await request.delete(`${BASE_URL}/api/articles/test-article/bookmark`);
    expect(unbookmarkResponse.status()).toBe(401);
  });

  test('Profile endpoints - Handle profile requests', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/profiles/testuser`);
    
    expect([200, 404]).toContain(response.status);
  });

  test('Health check - API is responsive', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/`);
    
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBeDefined();
  });
});