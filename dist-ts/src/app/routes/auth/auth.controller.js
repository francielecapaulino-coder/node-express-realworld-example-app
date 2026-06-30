"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const express_1 = require("express");
const auth_1 = tslib_1.__importDefault(require("./auth"));
const auth_service_1 = require("./auth.service");
const rate_limit_middleware_1 = require("../../middleware/rate-limit.middleware");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /users:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new user
 *     description: Create a new user account and return the user with JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user:
 *                 $ref: '#/components/schemas/User'
 *             required:
 *               - user
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: object
 *                   example:
 *                     username: ["has already been taken"]
 *                     email: ["has already been taken"]
 */
router.post('/users', async (req, res, next) => {
    try {
        const user = await (0, auth_service_1.createUser)({ ...req.body.user, demo: false });
        res.status(201).json({ user });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @swagger
 * /users/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Login user
 *     description: Authenticate user with email and password and return JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: string
 *                     format: email
 *                   password:
 *                     type: string
 *                 required:
 *                   - email
 *                   - password
 *             required:
 *               - user
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: object
 *                   example:
 *                     email or password: ["is invalid"]
 *       429:
 *         description: Too many login attempts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: object
 *                   example:
 *                     rate-limit: ["Too many login attempts from this IP, please try again after 15 minutes"]
 */
router.post('/users/login', rate_limit_middleware_1.loginRateLimit, async (req, res, next) => {
    try {
        const user = await (0, auth_service_1.login)(req.body.user);
        res.json({ user });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Get current user
 * @auth required
 * @route {GET} /user
 * @returns user User
 */
router.get('/user', auth_1.default.required, async (req, res, next) => {
    try {
        const user = await (0, auth_service_1.getCurrentUser)(req.auth?.user?.id);
        res.json({ user });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Update user
 * @auth required
 * @route {PUT} /user
 * @bodyparam user User
 * @returns user User
 */
router.put('/user', auth_1.default.required, async (req, res, next) => {
    try {
        const user = await (0, auth_service_1.updateUser)(req.body.user, req.auth?.user?.id);
        res.json({ user });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=auth.controller.js.map