import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate limiting middleware for login endpoint
 * - 5 requests per 15 minutes per IP
 * - Includes custom headers for rate limit info
 */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    errors: {
      'rate-limit': [
        'Too many login attempts from this IP, please try again after 15 minutes'
      ]
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      errors: {
        'rate-limit': [
          'Too many login attempts from this IP, please try again after 15 minutes'
        ]
      }
    });
  }
});

/**
 * General rate limiting for all API endpoints
 * - 100 requests per minute per IP
 */
export const generalRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    errors: {
      'rate-limit': [
        'Too many requests from this IP, please try again after a minute'
      ]
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});