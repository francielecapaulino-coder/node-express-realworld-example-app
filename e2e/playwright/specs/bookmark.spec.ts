import { test, expect } from '@playwright/test';
import { generateUserCredentials, registerUser } from '../support/api-helpers';

/**
 * Bookmark feature — POST /api/articles/:slug/bookmark
 *
 * ⚠️  THIS TEST IS EXPECTED TO FAIL on branch `e2e/failing`.
 *
 * The bookmark endpoint has NOT been implemented yet (Phase 4 — §4.5 of the
 * refactoring guide). The server returns 404 because no route matches
 * POST /api/articles/:slug/bookmark.
 *
 * This spec documents the intended contract so that:
 *   1. The failing branch (`e2e/failing`) has a reproducible, honest failure.
 *   2. When the endpoint is implemented (Phase 4), this spec becomes the
 *      acceptance test that must pass before the feature is closed.
 *
 * Do NOT implement the endpoint just to make this test pass — see §14 of the
 * refactoring guide for the permission protocol.
 */
test.describe('Bookmark (POST /api/articles/:slug/bookmark)', () => {
  test('bookmarks an article and returns 201 with the article envelope', async ({
    request,
  }) => {
    const credentials = generateUserCredentials();
    const token = await registerUser(request, credentials);

    // This request will return 404 until the endpoint is implemented.
    const response = await request.post('/api/articles/some-article-slug/bookmark', {
      headers: { Authorization: `Token ${token}` },
    });

    // Expected contract once the feature is implemented:
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body).toHaveProperty('article');
    expect(body.article).toHaveProperty('slug', 'some-article-slug');
  });
});
