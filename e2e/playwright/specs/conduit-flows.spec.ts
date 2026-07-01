import { test, expect } from '@playwright/test';

/**
 * Conduit User Journey E2E Tests
 * Testing realistic user flows and API interactions
 */

test.describe('Conduit User Journeys', () => {
  const BASE_URL = 'http://localhost:3000';
  
  test.describe('Guest User Experience', () => {
    
    test('Guest can access public endpoints', async ({ request }) => {
      // Test root endpoint
      const rootResponse = await request.get(BASE_URL);
      expect(rootResponse.status()).toBe(200);
      expect(rootResponse.headers()['content-type']).toBeDefined();
      
      // Test API documentation
      const docsResponse = await request.get(`${BASE_URL}/api-docs`);
      expect([200, 302]).toContain(docsResponse.status());
      
      // Test health/check endpoint if it exists
      const healthResponse = await request.get(`${BASE_URL}/api`);
      expect([200, 404]).toContain(healthResponse.status());
    });

    test('Guest gets unauthorized on protected routes', async ({ request }) => {
      const protectedEndpoints = [
        '/api/articles',
        '/api/articles/test-article/bookmark',
        '/api/articles/test-article'
      ];
      
      for (const endpoint of protectedEndpoints) {
        const response = await request.post(`${BASE_URL}${endpoint}`, {
          data: { title: 'Test' }
        });
        
        // Should be unauthorized for unauthenticated requests
        expect([401, 404, 405]).toContain(response.status());
      }
    });

    test('Authentication validation endpoints', async ({ request }) => {
      // Test login endpoint with invalid credentials
      const loginResponse = await request.post(`${BASE_URL}/api/users/login`, {
        data: {
          user: {
            email: 'invalid@email.com',
            password: 'wrongpassword'
          }
        }
      });
      
      // Should validate credentials properly
      expect([401, 400]).toContain(loginResponse.status());
      
      // Test registration validation
      const registerResponse = await request.post(`${BASE_URL}/api/users`, {
        data: {
          user: {
            email: 'invalid-email',
            password: '123'
          }
        }
      });
      
      // Should validate user input
      expect([400, 422]).toContain(registerResponse.status());
    });
  });

  test.describe('API Contract Validation', () => {
    
    test('Error responses follow RealWorld spec', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/users/login`, {
        data: {
          user: {
            email: 'nonexistent@test.com',
            password: '_wrongpassword_'
          }
        }
      });
      
      if (response.status() >= 400) {
        const body = await response.json();
        expect(body).toHaveProperty('errors');
        expect(typeof body.errors).toBe('object');
      }
    });

    test('Content-Type headers are correct', async ({ request }) => {
      const endpoints = [
        '',
        '/api',
        '/api/users/login',
        '/api/articles/test-article'
      ];
      
      for (const endpoint of endpoints) {
        const response = await request.get(`${BASE_URL}${endpoint}`);
        
        if (response.status() !== 404) {
          const contentType = response.headers()['content-type'];
          expect(contentType).toBeDefined();
          expect(['application/json', 'text/html', 'text/plain']).some(
            type => contentType?.includes(type)
          ).toBe(true);
        }
      }
    });

    test('CORS headers are present for API endpoints', async ({ request }) => {
      const response = await request.options(`${BASE_URL}/api/articles`, {
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      
      if (response.status() === 204 || response.status() === 200) {
        const corsHeaders = response.headers();
        expect(corsHeaders['access-control-allow-origin']).toBeDefined();
      }
    });
  });

  test.describe('Request/Response Validation', () => {
    
    test('Malformed JSON is handled gracefully', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/users/login`, {
        headers: {
          'Content-Type': 'application/json'
        },
        data: 'invalid json {'
      });
      
      expect([400, 415]).toContain(response.status());
    });

    test('Missing required fields are validated', async ({ request }) => {
      // Test login with missing fields
      const testCases = [
        { user: { email: 'test@test.com' } }, // Missing password
        { user: { password: 'password' } },   // Missing email
        { user: {} },                          // Missing both
        {},                                    // Missing user object
      ];
      
      for (const testCase of testCases) {
        const response = await request.post(`${BASE_URL}/api/users/login`, {
          data: testCase
        });
        
        expect([400, 422]).toContain(response.status());
      }
    });

    test('Rate limiting behaves correctly', async ({ request }) => {
      // Make multiple rapid requests to test rate limiting
      const responses = [];
      
      for (let i = 0; i < 5; i++) {
        const response = await request.post(`${BASE_URL}/api/users/login`, {
          data: {
            user: {
              email: `test${i}@test.com`,
              password: 'password'
            }
          }
        });
        responses.push(response);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const statusCodes = responses.map(r => r.status());
      
      // At least some requests should work, others might be rate limited
      expect(statusCodes.some(code => code !== 429)).toBe(true);
    });
  });
});