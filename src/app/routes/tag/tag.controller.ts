import { Request, Response, Router } from 'express';
import { asyncHandler } from '../../middleware/error-handler.middleware';
import auth from '../auth/auth';
import getTags from './tag.service';

const router = Router();

/**
 * @swagger
 * /tags:
 *   get:
 *     tags:
 *       - Tags
 *     summary: Get popular tags
 *     description: Returns the list of most popular tag names
 *     responses:
 *       200:
 *         description: List of tags
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagsResponse'
 */
router.get('/tags', auth.optional, asyncHandler(async (req: Request, res: Response) => {
  const tags = await getTags(req.auth?.user?.id);
  res.json({ tags });
}));

export default router;
