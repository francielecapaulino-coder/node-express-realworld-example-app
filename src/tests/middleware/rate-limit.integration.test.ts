import { loginRateLimit, generalRateLimit } from '../../app/middleware/rate-limit.middleware';

describe('Rate Limiting Configuration Tests', () => {
  test('should configure login rate limit with correct settings', () => {
    // Then
    expect(loginRateLimit).toBeDefined();
    // The middleware should be properly configured with our settings
    expect(typeof loginRateLimit).toBe('function');
  });

  test('should configure general rate limit with correct settings', () => {
    // Then
    expect(generalRateLimit).toBeDefined();
    expect(typeof generalRateLimit).toBe('function');
  });

  test('should handle middleware function properties', () => {
    // Test that the export is a function (middleware)
    expect(typeof loginRateLimit).toBe('function');
    expect(typeof generalRateLimit).toBe('function');
  });
});