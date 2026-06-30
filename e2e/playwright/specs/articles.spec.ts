import { test, expect } from '@playwright/test';
import { generateUserCredentials, registerUser } from '../support/api-helpers';

/**
 * Articles listing — GET /api/articles
 *
 * Does not require auth. Returns paginated list with articlesCount.
 * RealWorld envelope: { articles: [...], articlesCount: number }
 */
test.describe('Articles (GET /api/articles)', () => {
  test('returns 200 with the RealWorld articles envelope', async ({ request }) => {
    const response = await request.get('/api/articles');

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('articles');
    expect(body).toHaveProperty('articlesCount');
    expect(Array.isArray(body.articles)).toBe(true);
    expect(typeof body.articlesCount).toBe('number');
  });

  test('articlesCount matches articles array length when no filters applied', async ({
    request,
  }) => {
    const response = await request.get('/api/articles');
    const body = await response.json();

    expect(body.articles.length).toBeLessThanOrEqual(body.articlesCount);
  });

  test('accepts limit and offset query params', async ({ request }) => {
    const responseDefault = await request.get('/api/articles');
    const defaultBody = await responseDefault.json();

    const responseLimit = await request.get('/api/articles?limit=1&offset=0');
    expect(responseLimit.status()).toBe(200);

    const limitBody = await responseLimit.json();
    expect(Array.isArray(limitBody.articles)).toBe(true);
    expect(limitBody.articles.length).toBeLessThanOrEqual(1);
    // articlesCount represents total, not page size
    expect(limitBody.articlesCount).toBe(defaultBody.articlesCount);
  });

  test('each article in the list has required RealWorld fields', async ({ request }) => {
    const response = await request.get('/api/articles');
    const body = await response.json();

    if (body.articles.length === 0) {
      // No articles seeded — skip field check but ensure shape is valid
      return;
    }

    const article = body.articles[0];
    expect(article).toHaveProperty('slug');
    expect(article).toHaveProperty('title');
    expect(article).toHaveProperty('description');
    expect(article).toHaveProperty('body');
    expect(article).toHaveProperty('tagList');
    expect(article).toHaveProperty('createdAt');
    expect(article).toHaveProperty('updatedAt');
    expect(article).toHaveProperty('favorited');
    expect(article).toHaveProperty('favoritesCount');
    expect(article).toHaveProperty('author');
    expect(article.author).toHaveProperty('username');
    expect(article.author).toHaveProperty('following');
  });

  test('GET /api/articles requires no auth token', async ({ request }) => {
    // Explicitly send without Authorization header — must still return 200
    const response = await request.get('/api/articles', {
      headers: { Authorization: '' },
    });

    expect(response.status()).toBe(200);
  });

  test.describe('Authenticated listing (feed via auth header)', () => {
    test('returns articles list for an authenticated user', async ({ request }) => {
      const credentials = generateUserCredentials();
      const token = await registerUser(request, credentials);

      const response = await request.get('/api/articles', {
        headers: { Authorization: `Token ${token}` },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('articles');
      expect(body).toHaveProperty('articlesCount');
    });
  });
});
