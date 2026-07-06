import { Request, Response, Router } from 'express';
import { asyncHandler } from '../../middleware/error-handler.middleware';
import auth from '../auth/auth';
import { followUser, getProfile, unfollowUser } from './profile.service';

const router = Router();

/**
 * @swagger
 * /profiles/{username}:
 *   get:
 *     tags:
 *       - Profile
 *     summary: Get a profile
 *     description: Get a user's profile by username. Auth is optional; when present, the response reflects whether the current user follows this profile.
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Profile found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProfileResponse'
 *       404:
 *         description: Profile not found
 */
router.get(
  '/profiles/:username',
  auth.optional,
  asyncHandler(async (req: Request, res: Response) => {
    const profile = await getProfile(String(req.params.username), req.auth?.user.id);
    res.json({ profile });
  }),
);

/**
 * @swagger
 * /profiles/{username}/follow:
 *   post:
 *     tags:
 *       - Profile
 *     summary: Follow a user
 *     security:
 *       - TokenAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Now following this profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProfileResponse'
 *       401:
 *         description: Missing or invalid authorization credentials
 *       404:
 *         description: Profile not found
 */
router.post(
  '/profiles/:username/follow',
  auth.required,
  asyncHandler(async (req: Request, res: Response) => {
    const profile = await followUser(String(req.params.username), req.auth!.user.id);
    res.json({ profile });
  }),
);

/**
 * @swagger
 * /profiles/{username}/follow:
 *   delete:
 *     tags:
 *       - Profile
 *     summary: Unfollow a user
 *     security:
 *       - TokenAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: No longer following this profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProfileResponse'
 *       401:
 *         description: Missing or invalid authorization credentials
 *       404:
 *         description: Profile not found
 */
router.delete(
  '/profiles/:username/follow',
  auth.required,
  asyncHandler(async (req: Request, res: Response) => {
    const profile = await unfollowUser(String(req.params.username), req.auth!.user.id);
    res.json({ profile });
  }),
);

export default router;
