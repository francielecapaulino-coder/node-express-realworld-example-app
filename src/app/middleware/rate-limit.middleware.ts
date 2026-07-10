import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * express-rate-limit only reads `message` when no custom `handler` is supplied,
 * so a single `message` string feeds both — keeping the handler and the
 * documented response body from drifting apart.
 */
const buildRateLimit = (windowMs: number, max: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        errors: {
          'rate-limit': [message],
        },
      });
    },
  });

/**
 * Rate limiting middleware for the login endpoint: 5 requests per 15 minutes per IP.
 */
export const loginRateLimit = buildRateLimit(
  15 * 60 * 1000,
  5,
  'Too many login attempts from this IP, please try again after 15 minutes',
);

/**
 * Rate limiting middleware for registration: equally brute-forceable (account
 * enumeration via "already taken" errors, mass account creation), so it gets
 * the same abuse-prevention mechanism as login, with a higher ceiling since
 * legitimate signup traffic is bursty. 10 requests per 15 minutes per IP.
 */
export const registrationRateLimit = buildRateLimit(
  15 * 60 * 1000,
  10,
  'Too many registration attempts from this IP, please try again after 15 minutes',
);
