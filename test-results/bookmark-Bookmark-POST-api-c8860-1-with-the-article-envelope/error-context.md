# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: bookmark.spec.ts >> Bookmark (POST /api/articles/:slug/bookmark) >> bookmarks an article and returns 201 with the article envelope
- Location: e2e/playwright/specs/bookmark.spec.ts:22:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 201
Received: 401
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { generateUserCredentials, registerUser } from '../support/api-helpers';
  3  | 
  4  | /**
  5  |  * Bookmark feature — POST /api/articles/:slug/bookmark
  6  |  *
  7  |  * ⚠️  THIS TEST IS EXPECTED TO FAIL on branch `e2e/failing`.
  8  |  *
  9  |  * The bookmark endpoint has NOT been implemented yet (Phase 4 — §4.5 of the
  10 |  * refactoring guide). The server returns 404 because no route matches
  11 |  * POST /api/articles/:slug/bookmark.
  12 |  *
  13 |  * This spec documents the intended contract so that:
  14 |  *   1. The failing branch (`e2e/failing`) has a reproducible, honest failure.
  15 |  *   2. When the endpoint is implemented (Phase 4), this spec becomes the
  16 |  *      acceptance test that must pass before the feature is closed.
  17 |  *
  18 |  * Do NOT implement the endpoint just to make this test pass — see §14 of the
  19 |  * refactoring guide for the permission protocol.
  20 |  */
  21 | test.describe('Bookmark (POST /api/articles/:slug/bookmark)', () => {
  22 |   test('bookmarks an article and returns 201 with the article envelope', async ({
  23 |     request,
  24 |   }) => {
  25 |     const credentials = generateUserCredentials();
  26 |     const token = await registerUser(request, credentials);
  27 | 
  28 |     // This request will return 404 until the endpoint is implemented.
  29 |     const response = await request.post('/api/articles/some-article-slug/bookmark', {
  30 |       headers: { Authorization: `Token ${token}` },
  31 |     });
  32 | 
  33 |     // Expected contract once the feature is implemented:
> 34 |     expect(response.status()).toBe(201);
     |                               ^ Error: expect(received).toBe(expected) // Object.is equality
  35 | 
  36 |     const body = await response.json();
  37 |     expect(body).toHaveProperty('article');
  38 |     expect(body.article).toHaveProperty('slug', 'some-article-slug');
  39 |   });
  40 | });
  41 | 
```