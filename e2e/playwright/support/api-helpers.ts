import type { APIRequestContext } from '@playwright/test';

/**
 * Generates a unique username/email pair to avoid collisions across test runs.
 */
export function generateUserCredentials(): {
  username: string;
  email: string;
  password: string;
} {
  const uniqueSuffix = Date.now().toString(36);
  return {
    username: `testuser_${uniqueSuffix}`,
    email: `testuser_${uniqueSuffix}@example.com`,
    password: 'TestPass123!',
  };
}

/**
 * Registers a new user and returns the token from the response.
 */
export async function registerUser(
  request: APIRequestContext,
  credentials: ReturnType<typeof generateUserCredentials>,
): Promise<string> {
  const response = await request.post('/api/users', {
    data: {
      user: {
        username: credentials.username,
        email: credentials.email,
        password: credentials.password,
      },
    },
  });

  const body = await response.json();
  return body.user?.token ?? '';
}

/**
 * Logs in an existing user and returns the token.
 */
export async function loginUser(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<string> {
  const response = await request.post('/api/users/login', {
    data: { user: { email, password } },
  });

  const body = await response.json();
  return body.user?.token ?? '';
}
