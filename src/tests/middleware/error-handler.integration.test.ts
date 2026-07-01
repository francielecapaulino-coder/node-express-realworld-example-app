import { Request, Response, NextFunction } from 'express';
import { asyncHandler, globalErrorHandler } from '../../app/middleware/error-handler.middleware';
import HttpException from '../../app/models/http-exception.model';

describe('Error Handler Integration Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      url: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  describe('Async Handler', () => {
    test('should handle successful async operations', async () => {
      // Given
      const successHandler = asyncHandler(async (req: Request, res: Response) => {
        res.json({ message: 'success' });
      });

      // When
      await successHandler(mockRequest as Request, mockResponse as Response, nextFunction);

      // Then
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'success' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    test('should catch and forward async errors', async () => {
      // Given
      const errorHandler = asyncHandler(async (req: Request, res: Response) => {
        throw new Error('Async error occurred');
      });

      // When
      await errorHandler(mockRequest as Request, mockResponse as Response, nextFunction);

      // Then
      expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Async error occurred',
        })
      );
    });
  });

  describe('Global Error Handler', () => {
test('should handle HttpException properly', () => {
      // Given
      const errorMessage = JSON.stringify({
        errors: {
          email: ['is invalid'],
        },
      });
      const httpError = new HttpException(400, errorMessage);

      // When
      globalErrorHandler(
        httpError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

// Then
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(errorMessage);
    });

    test('should handle JWT authentication errors', () => {
      // Given
      const jwtError = new Error('UnauthorizedError');
      jwtError.name = 'UnauthorizedError';

      // When
      globalErrorHandler(
        jwtError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Then
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        errors: {
          authorization: ['missing or invalid authorization credentials'],
        },
      });
    });

    test('should handle generic errors with 500 status', () => {
      // Given
      const genericError = new Error('Something went wrong');

      // When
      globalErrorHandler(
        genericError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Then
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        errors: {
          server: ['internal server error'],
        },
      });
    });

    test('should always return errors in RealWorld format', () => {
      // Test different error types to ensure consistent format
      const errorCases = [
{ error: new HttpException(400, JSON.stringify({ errors: { field: ['error'] } })), expectedCode: 400 },
        { error: new Error('UnauthorizedError'), expectedCode: 401 },
        { error: new Error('Generic error'), expectedCode: 500 },
      ];

errorCases.forEach(({ error, expectedCode }) => {
        Object.defineProperty(error, 'name', {
          value: error.message.includes('Error') ? error.message : error.constructor.name
        });

// Reset mock
        (mockResponse.status as jest.Mock).mockClear().mockReturnThis();
        (mockResponse.json as jest.Mock).mockClear().mockReturnThis();

        globalErrorHandler(
          error,
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(mockResponse.status).toHaveBeenCalledWith(expectedCode);
// For HttpException, expect the string message directly
        if (error instanceof HttpException) {
          expect(mockResponse.json).toHaveBeenCalledWith(error.message);
        } else {
          expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
              errors: expect.any(Object),
            })
          );
        }
      });
    });
  });

  describe('Security in Error Messages', () => {
    test('should not expose sensitive information in error responses', () => {
      // Given
      const sensitiveError = new Error('Database connection failed: password=secret123');
      sensitiveError.stack = 'Stack trace with sensitive information';

      // When
      globalErrorHandler(
        sensitiveError,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Then
      expect(mockResponse.json).toHaveBeenCalledWith({
        errors: {
          server: ['internal server error'],
        },
      });

// Sensitive details should not be in the response
      expect(mockResponse.json).toHaveBeenCalled();
      const responseData = (mockResponse.json as jest.Mock).mock.calls?.[0]?.[0] || {};
      expect(JSON.stringify(responseData)).not.toContain('secret123');
      expect(JSON.stringify(responseData)).not.toContain('Stack trace');
    });
  });
});