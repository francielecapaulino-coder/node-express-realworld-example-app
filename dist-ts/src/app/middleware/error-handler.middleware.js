"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.globalErrorHandler = exports.asyncHandler = void 0;
const tslib_1 = require("tslib");
const http_exception_model_1 = tslib_1.__importDefault(require("../models/http-exception.model"));
const logger_1 = tslib_1.__importDefault(require("../../logger"));
/**
 * Centralized async error handling middleware
 * Replaces try/catch blocks in route handlers
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
/**
 * Global error handler middleware
 * Processes all errors and returns consistent error responses
 */
const globalErrorHandler = (error, req, res, next) => {
    logger_1.default.error({
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
    }, 'Request failed');
    // Handle known HTTP exceptions
    if (error instanceof http_exception_model_1.default) {
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
exports.globalErrorHandler = globalErrorHandler;
/**
 * Not found middleware for unmatched routes
 */
const notFoundHandler = (req, res) => {
    res.status(404).json({
        errors: {
            route: [`Route ${req.method} ${req.path} not found`]
        }
    });
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=error-handler.middleware.js.map