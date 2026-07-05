import { Request, Response, NextFunction } from 'express';
import HttpException from '../models/http-exception.model';
import logger from '../../logger';

/**
 * Centralized async error handling middleware
 * Replaces try/catch blocks in route handlers
 */
type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler = (fn: AsyncRequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error handler middleware
 * Processes all errors and returns consistent error responses
 */
export const globalErrorHandler = (
  error: Error | HttpException,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error({
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  }, 'Request failed');

  // Handle known HTTP exceptions
  if (error instanceof HttpException) {
    res.status(error.errorCode).json(error.message);
    return;
  }

  // Handle JWT authentication errors
  if (error.name === 'UnauthorizedError') {
    res.status(401).json({
      errors: {
        authorization: ['missing or invalid authorization credentials']
      }
    });
    return;
  }

  // Handle Prisma validation errors
  if (error.name === 'PrismaClientKnownRequestError') {
    res.status(400).json({
      errors: {
        database: ['invalid data provided']
      }
    });
    return;
  }

  // Handle Prisma connection errors
  if (error.name === 'PrismaClientInitializationError') {
    res.status(503).json({
      errors: {
        database: ['service unavailable']
      }
    });
    return;
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    res.status(422).json({
      errors: {
        validation: [error.message]
      }
    });
    return;
  }

  // Handle rate limit errors
  if (error.message && error.message.includes('Too many requests')) {
    res.status(429).json({
      errors: {
        'rate-limit': [error.message]
      }
    });
    return;
  }

  // Default error handler
  res.status(500).json({
    errors: {
      server: ['internal server error']
    }
  });
};

/**
 * Not found middleware for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    errors: {
      route: [`Route ${req.method} ${req.path} not found`]
    }
  });
};