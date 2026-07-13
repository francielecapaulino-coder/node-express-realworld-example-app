import * as jwt from 'jsonwebtoken';

// Single source of truth for the JWT signing/verification secret — auth.ts
// (token verification) and this file (token signing) must agree on the
// exact same value, or tokens signed by one silently fail to verify with
// the other. Falls back to a well-known dev value outside production (kept
// so local dev/tests don't need JWT_SECRET set), but refuses to start in
// production rather than silently signing/verifying with a guessable
// default — the same fail-fast posture already used for METRICS_TOKEN.
export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production — refusing to sign/verify tokens with a guessable default.');
  }
  return 'superSecret';
};

const generateToken = (id: number): string =>
  jwt.sign({ user: { id } }, getJwtSecret(), {
    expiresIn: '60d',
  });

export default generateToken;
