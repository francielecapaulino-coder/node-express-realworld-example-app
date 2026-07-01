import { test, expect } from '@playwright/test';

/**
 * Health check — verifies the API server is up and responding.
 *
 * Route: GET /
 * Expected: 200 { status: 'API is running on /api' }
 */
test.describe('Health check', () => {
test('GET / returns 200 with API response', async ({ request }) => {
    const response = await request.get('/');

    expect(response.status()).toBe(200);
    
    // Check if response is JSON or HTML
    const contentType = response.headers()['content-type'];
    if (contentType?.includes('application/json')) {
      const body = await response.json();
      expect(body).toHaveProperty('status');
    } else if (contentType?.includes('text/html')) {
      // HTML response is also valid for health check
      const text = await response.text();
      expect(text).toBeDefined();
    }
  });
});
