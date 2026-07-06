import { Request, Response, Router } from 'express';
import { asyncHandler } from '../../middleware/error-handler.middleware';
import auth from './auth';
import { createUser, getCurrentUser, login, updateUser } from './auth.service';
import { loginRateLimit } from '../../middleware/rate-limit.middleware';

const router = Router();

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
router.post('/users', asyncHandler(async (req: Request, res: Response) => {
  const user = await createUser({ ...req.body.user, demo: false });
  res.status(201).json({ user });
}));

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
router.post('/users/login', loginRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const user = await login(req.body.user);
  res.json({ user });
}));

/**
 * @swagger
 * /user:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get the current user
 *     security:
 *       - TokenAuth: []
 *     responses:
 *       200:
 *         description: Current user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Missing or invalid authorization credentials
 */
router.get('/user', auth.required, asyncHandler(async (req: Request, res: Response) => {
  const user = await getCurrentUser(req.auth!.user.id);
  res.json({ user });
}));

/**
 * @swagger
 * /user:
 *   put:
 *     tags:
 *       - Authentication
 *     summary: Update the current user
 *     security:
 *       - TokenAuth: []
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
 *       200:
 *         description: User updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Missing or invalid authorization credentials
 *       422:
 *         description: Validation error
 */
router.put('/user', auth.required, asyncHandler(async (req: Request, res: Response) => {
  const user = await updateUser(req.body.user, req.auth!.user.id);
res.json({ user });
}));

export default router;
