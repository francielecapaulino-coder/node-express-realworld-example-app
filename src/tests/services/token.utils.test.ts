import * as jwt from 'jsonwebtoken';
import generateToken, { getJwtSecret } from '../../app/routes/auth/token.utils';

describe('generateToken', () => {
  test('signs a token containing only the user id, expiring in 60 days', () => {
    const token = generateToken(456);

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'superSecret') as jwt.JwtPayload;

    expect(decoded.user).toEqual({ id: 456 });
    expect(Object.keys(decoded).sort()).toEqual(['exp', 'iat', 'user']);

    const sixtyDaysInSeconds = 60 * 24 * 60 * 60;
    expect(decoded.exp! - decoded.iat!).toBe(sixtyDaysInSeconds);
  });
});

describe('getJwtSecret', () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
    process.env.NODE_ENV = originalEnv;
  });

  test('returns JWT_SECRET verbatim when it is set', () => {
    process.env.JWT_SECRET = 'my-explicit-secret';

    expect(getJwtSecret()).toBe('my-explicit-secret');
  });

  test('falls back to the dev default outside production when JWT_SECRET is unset', () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'test';

    expect(getJwtSecret()).toBe('superSecret');
  });

  test('throws instead of falling back when NODE_ENV=production and JWT_SECRET is unset', () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';

    expect(() => getJwtSecret()).toThrow(
      'JWT_SECRET must be set in production — refusing to sign/verify tokens with a guessable default.',
    );
  });
});
