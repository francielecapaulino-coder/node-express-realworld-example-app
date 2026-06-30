import { test, expect } from '@playwright/test';

/**
 * Health check — verifies the API server is up and responding.
 *
 * Route: GET /
 * Expected: 200 { status: 'API is running on /api' }
 */
test.describe('Health check', () => {
  test('GET / returns 200 with running status message', async ({ request }) => {
    const response = await request.get('/');

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('status', 'API is running on /api');
  });
});
