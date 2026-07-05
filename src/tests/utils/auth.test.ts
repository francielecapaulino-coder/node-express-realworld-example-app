import * as jwt from 'jsonwebtoken';
import auth, { getTokenFromHeaders } from '../../app/routes/auth/auth';

const buildReq = (authorization?: string) => ({ headers: { authorization } } as any);

describe('getTokenFromHeaders', () => {
  test('extracts the token from a "Token <jwt>" header', () => {
    expect(getTokenFromHeaders(buildReq('Token abc.def.ghi'))).toBe('abc.def.ghi');
  });

  test('extracts the token from a "Bearer <jwt>" header', () => {
    expect(getTokenFromHeaders(buildReq('Bearer abc.def.ghi'))).toBe('abc.def.ghi');
  });

  test('returns null when the scheme is neither Token nor Bearer', () => {
    expect(getTokenFromHeaders(buildReq('Basic abc.def.ghi'))).toBeNull();
  });

  test('returns null when there is no authorization header', () => {
    expect(getTokenFromHeaders(buildReq(undefined))).toBeNull();
  });
});

describe('auth middleware', () => {
  const secret = process.env.JWT_SECRET || 'superSecret';
  const validToken = jwt.sign({ user: { id: 123 } }, secret, { expiresIn: '60d' });

  test('auth.required attaches req.auth and calls next() with a valid token', (done) => {
    const req = buildReq(`Token ${validToken}`);
    const res = {} as any;

    auth.required(req, res, (err?: unknown) => {
      expect(err).toBeUndefined();
      expect(req.auth.user.id).toBe(123);
      done();
    });
  });

  test('auth.required calls next(err) when there is no token', (done) => {
    const req = buildReq(undefined);
    const res = {} as any;

    auth.required(req, res, (err?: unknown) => {
      expect(err).toBeDefined();
      done();
    });
  });

  test('auth.optional calls next() without a token and without setting req.auth', (done) => {
    const req = buildReq(undefined);
    const res = {} as any;

    auth.optional(req, res, (err?: unknown) => {
      expect(err).toBeUndefined();
      expect(req.auth).toBeUndefined();
      done();
    });
  });

  test('auth.optional attaches req.auth when a valid token is present', (done) => {
    const req = buildReq(`Bearer ${validToken}`);
    const res = {} as any;

    auth.optional(req, res, (err?: unknown) => {
      expect(err).toBeUndefined();
      expect(req.auth.user.id).toBe(123);
      done();
    });
  });
});
