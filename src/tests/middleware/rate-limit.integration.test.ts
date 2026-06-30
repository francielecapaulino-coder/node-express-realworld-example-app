import { Request, Response } from 'express';
import { rateLimitMiddleware, loginRateLimit } from '../../app/middleware/rate-limit.middleware';

describe('Rate Limiting Integration Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      ip: '127.0.0.1',
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  describe('Basic Rate Limiting', () => {
    test('should allow requests within limit', () => {
      // Given
      const middleware = rateLimitMiddleware({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later',
      });

      // When - Make first 100 requests
      for (let i = 0; i < 100; i++) {
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      }

      // Then
      expect(nextFunction).toHaveBeenCalledTimes(100);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    test('should block requests exceeding limit', () => {
      // Given
      const middleware = rateLimitMiddleware({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 2, // Low limit for testing
        message: 'Too many requests from this IP, please try again later',
      });

      // When - Make 3 requests (exceeds limit of 2)
      for (let i = 0; i < 3; i++) {
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
      }

      // Then
      expect(nextFunction).toHaveBeenCalledTimes(2); // First 2 allowed
      expect(mockResponse.status).toHaveBeenCalledWith(429); // 3rd blocked
      expect(mockResponse.json).toHaveBeenCalledWith({
        errors: {
          'rate-limit': [
            'Too many requests from this IP, please try again after 15 minutes'
          ],
        },
      });
    });

    test('should include rate limit headers', () => {
      // Given
      const middleware = rateLimitMiddleware({
        windowMs: 15 * 60 * 1000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
      });

      // When
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Then
      expect(mockResponse.set).toHaveBeenCalledWith('RateLimit-Limit', '100');
      expect(mockResponse.set).toHaveBeenCalledWith('RateLimit-Remaining', '99');
    });
  });

  describe('Login Rate Limiting Integration', () => {
    test('should apply strict rate limiting to login endpoint', () => {
      // Given
      const loginRateLimitMiddleware = loginRateLimit;

      // When - Make first 5 login attempts
      for (let i = 0; i < 5; i++) {
        loginRateLimitMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      }

      // Then
      expect(nextFunction).toHaveBeenCalledTimes(5);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    test('should block login attempts after 5 failed attempts', () => {
      // Given
      const loginRateLimitMiddleware = loginRateLimit;

      // When - Make 6 login attempts (exceeds limit of 5)
      for (let i = 0; i < 6; i++) {
        loginRateLimitMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      }

      // Then
      expect(nextFunction).toHaveBeenCalledTimes(5); // First 5 allowed
      expect(mockResponse.status).toHaveBeenCalledWith(429); // 6th blocked
      expect(mockResponse.json).toHaveBeenCalledWith({
        errors: {
          'rate-limit': [
            'Too many login attempts from this IP, please try again after 15 minutes'
          ],
        },
      });
    });

    test('should include login-specific rate limit headers', () => {
      // Given
      const loginRateLimitMiddleware = loginRateLimit;

      // When
      loginRateLimitMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Then
      expect(mockResponse.set).toHaveBeenCalledWith('RateLimit-Limit', '5');
      expect(mockResponse.set).toHaveBeenCalledWith('RateLimit-Remaining', '4');
    });
  });

  describe('IP Differentiation', () => {
    test('should differentiate IPs for rate limiting', () => {
      // Given
      const middleware = rateLimitMiddleware({
        windowMs: 15 * 60 * 1000,
        max: 1,
      });

      const request1 = { ip: '192.168.1.1', headers: {} };
      const request2 = { ip: '192.168.1.2', headers: {} };

      // When
      middleware(request1 as Request, mockResponse as Response, nextFunction);
      middleware(request2 as Request, mockResponse as Response, nextFunction);

      // Then
      expect(nextFunction).toHaveBeenCalledTimes(2); // Both allowed (different IPs)
    });

    test('should use forwarded IP when available', () => {
      // Given
      const middleware = rateLimitMiddleware({
        windowMs: 15 * 60 * 1000,
        max: 1,
      });

      const forwardedRequest = {
        ip: '127.0.0.1',
        headers: { 'x-forwarded-for': '203.0.113.1' },
      };

// When
      middleware(forwardedRequest as Request, mockResponse as Response, nextFunction);

      // Then
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed requests gracefully', () => {
      // Given
      const middleware = rateLimitMiddleware({
        windowMs: 15 * 60 * 1000,
        max: 100,
      });

      const malformedRequest = {
        ip: null,
        headers: undefined,
      };

      // When
      expect(() => {
        middleware(malformedRequest as Request, mockResponse as Response, nextFunction);
      }).not.toThrow();
    });
  });
});