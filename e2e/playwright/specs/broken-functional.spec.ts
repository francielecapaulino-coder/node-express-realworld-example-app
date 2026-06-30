import { test, expect } from '@playwright/test';

/**
 * BROKEN FUNCTIONAL TESTS BRANCH
 * 
 * This file contains intentionally broken tests to demonstrate
 * the difference between failing and working tests.
 * 
 * When fixed, these should be moved to the working branch.
 */

test.describe('Broken Functional Tests', () => {
  test('should fail - invalid authentication test', async ({ request }) => {
    // This test intentionally has wrong expectations
    
    const loginData = {
      user: {
        email: 'nonexistent@test.com',
        password: 'wrongpassword'
      }
    };

    // ❌ BROKEN: Expecting 200 but should get 400/401
    const response = await request.post('http://localhost:3000/api/users/login', {
      data: loginData
    });

    expect(response.status()).toBe(200); // This WILL FAIL!
    
    const user = await response.json();
    expect(user.user.email).toBe('nonexistent@test.com'); // This WILL FAIL!
  });

  test('should fail - invalid article creation', async ({ request }) => {
    // ❌ BROKEN: Missing required auth header
    
    const article = {
      article: {
        title: 'Broken Test Article',
        description: 'This test is broken',
        body: 'Content should fail',
        tagList: ['broken', 'test']
      }
    };

    const response = await request.post('http://localhost:3000/api/articles', {
      data: article
      // ❌ MISSING: Authorization header
    });

    // ❌ BROKEN: Should get 401 but expecting 201
    expect(response.status()).toBe(201);
    
    const created = await response.json();
    expect(created.article.title).toBe('Broken Test Article');
  });

  test('should fail - wrong API endpoint', async ({ request }) => {
    // ❌ BROKEN: Non-existent endpoint
    
    const response = await request.get('http://localhost:3000/api/nonexistent-endpoint');
    
    // ❌ BROKEN: Expecting 200 but should get 404
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.message).toBe('success'); // Property doesn't exist
  });

  test('should fail - invalid bookmark test', async ({ request }) => {
    // ❌ BROKEN: No authentication for protected endpoint
    
    const invalidToken = 'this-is-not-a-valid-token';
    
    const response = await request.post('http://localhost:3000/api/articles/test-slug/bookmark', {
      headers: {
        'Authorization': `Token ${invalidToken}`
      }
    });

    // ❌ BROKEN: Should get 401 but expecting 200
    expect(response.status()).toBe(200);
    
    const result = await response.json();
    expect(result.article.bookmarked).toBe(true); // Unauthenticated!
  });

  test('should fail - rate limit unrealistic expectations', async ({ request }) => {
    // ❌ BROKEN: Testing rate limiting with wrong expectations
    
    // Make 10 rapid login attempts
    const promises = Array(10).fill(null).map(() =>
      request.post('http://localhost:3000/api/users/login', {
        data: {
          user: { email: 'test@test.com', password: 'test' }
        }
      })
    );

    const responses = await Promise.all(promises);
    
    // ❌ BROKEN: Rate limiting limit is 5, but expecting all to succeed
    responses.forEach(response => {
      expect(response.status()).toBe(200); // Most should fail!
    });
  });

  test('should fail - JSON response structure mismatch', async ({ request }) => {
    // ❌ BROKEN: Expecting wrong response structure
    
    const response = await request.get('http://localhost:3000/api/tags');
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    
    // ❌ BROKEN: Tags endpoint returns {tags: [...]} but expecting wrong structure
    expect(data.tagsList).toBeDefined(); // Should be 'tags'
    expect(data.tagsList).toContain('javascript'); // Non-existent tag
  });

  test.describe('Edge Cases That Are Broken', () => {
    test('should fail - malformed JSON input', async ({ request }) => {
      // ❌ BROKEN: Server should handle malformed JSON gracefully
      
      const response = await request.post('http://localhost:3000/api/users', {
        headers: {
          'Content-Type': 'application/json'
        },
        data: 'invalid-json{'
      });

      // ❌ BROKEN: Should get 400 but expecting 201
      expect(response.status()).toBe(201);
    });

    test('should fail - SQL injection attempt (should be blocked)', async ({ request }) => {
      // ❌ BROKEN: This test assumes SQL injection is possible
      
      const maliciousLogin = {
        user: {
          email: "'; DROP TABLE users; --'@test.com",
          password: "'; DROP TABLE users; --"
        }
      };

      const response = await request.post('http://localhost:3000/api/users/login', {
        data: maliciousLogin
      });

      // ❌ BROKEN: Expecting successful DB deletion (bad security)
      expect(response.status()).toBe(404); // Database deleted?? This is wrong!
    });
  });
});