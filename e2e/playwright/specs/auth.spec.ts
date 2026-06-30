import { test, expect } from '@playwright/test';
import { generateUserCredentials } from '../support/api-helpers';

/**
 * Auth flows — register and login.
 *
 * Routes:
 *   POST /api/users       — register
 *   POST /api/users/login — login
 */
test.describe('Authentication', () => {
  test.describe('Register (POST /api/users)', () => {
    test('registers a new user and returns a token', async ({ request }) => {
      const credentials = generateUserCredentials();

      const response = await request.post('/api/users', {
        data: {
          user: {
            username: credentials.username,
            email: credentials.email,
            password: credentials.password,
          },
        },
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('user');
      expect(body.user).toHaveProperty('email', credentials.email);
      expect(body.user).toHaveProperty('username', credentials.username);
      expect(body.user).toHaveProperty('token');
      expect(typeof body.user.token).toBe('string');
      expect(body.user.token.length).toBeGreaterThan(0);
    });

    test('returns 422 when email is already taken', async ({ request }) => {
      const credentials = generateUserCredentials();

      // First registration succeeds
      await request.post('/api/users', {
        data: {
          user: {
            username: credentials.username,
            email: credentials.email,
            password: credentials.password,
          },
        },
      });

      // Second registration with same email must fail
      const response = await request.post('/api/users', {
        data: {
          user: {
            username: `other_${credentials.username}`,
            email: credentials.email,
            password: credentials.password,
          },
        },
      });

      expect(response.status()).toBe(422);

      const body = await response.json();
      expect(body).toHaveProperty('errors');
    });

    test('returns 422 when required fields are missing', async ({ request }) => {
      const response = await request.post('/api/users', {
        data: { user: {} },
      });

      expect(response.status()).toBe(422);
    });
  });

  test.describe('Login (POST /api/users/login)', () => {
    test('logs in an existing user and returns a fresh token', async ({ request }) => {
      const credentials = generateUserCredentials();

      // Register first
      await request.post('/api/users', {
        data: {
          user: {
            username: credentials.username,
            email: credentials.email,
            password: credentials.password,
          },
        },
      });

      // Then login
      const response = await request.post('/api/users/login', {
        data: {
          user: {
            email: credentials.email,
            password: credentials.password,
          },
        },
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('user');
      expect(body.user).toHaveProperty('email', credentials.email);
      expect(body.user).toHaveProperty('token');
      expect(typeof body.user.token).toBe('string');
      expect(body.user.token.length).toBeGreaterThan(0);
    });

    test('returns 403 for wrong password', async ({ request }) => {
      const credentials = generateUserCredentials();

      await request.post('/api/users', {
        data: {
          user: {
            username: credentials.username,
            email: credentials.email,
            password: credentials.password,
          },
        },
      });

      const response = await request.post('/api/users/login', {
        data: {
          user: {
            email: credentials.email,
            password: 'WrongPassword999!',
          },
        },
      });

      expect(response.status()).toBe(403);
    });

    test('returns 422 for unknown email', async ({ request }) => {
      const response = await request.post('/api/users/login', {
        data: {
          user: {
            email: 'nobody_ever_registered_this@example.com',
            password: 'SomePass123!',
          },
        },
      });

      expect(response.status()).toBe(422);
    });
  });
});
