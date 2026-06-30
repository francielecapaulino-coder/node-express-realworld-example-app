"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generalRateLimit = exports.loginRateLimit = void 0;
const tslib_1 = require("tslib");
const express_rate_limit_1 = tslib_1.__importDefault(require("express-rate-limit"));
/**
 * Rate limiting middleware for login endpoint
 * - 5 requests per 15 minutes per IP
 * - Includes custom headers for rate limit info
 */
exports.loginRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        errors: {
            'rate-limit': [
                'Too many login attempts from this IP, please try again after 15 minutes'
            ]
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
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
exports.generalRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 1 * 60 * 1000,
    max: 100,
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
//# sourceMappingURL=rate-limit.middleware.js.map