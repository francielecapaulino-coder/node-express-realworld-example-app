import { test, expect } from '@playwright/test';

/**
 * Tags listing — GET /api/tags
 *
 * Does not require auth.
 * RealWorld envelope: { tags: string[] }
 */
test.describe('Tags (GET /api/tags)', () => {
  test('returns 200 with the RealWorld tags envelope', async ({ request }) => {
    const response = await request.get('/api/tags');

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('tags');
    expect(Array.isArray(body.tags)).toBe(true);
  });

  test('all tags are strings', async ({ request }) => {
    const response = await request.get('/api/tags');
    const body = await response.json();

    for (const tag of body.tags) {
      expect(typeof tag).toBe('string');
    }
  });

  test('GET /api/tags requires no auth token', async ({ request }) => {
    const response = await request.get('/api/tags', {
      headers: { Authorization: '' },
    });

    expect(response.status()).toBe(200);
  });
});
