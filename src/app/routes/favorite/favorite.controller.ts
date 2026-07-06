import { Request, Response, Router } from 'express';
import auth from '../auth/auth';
import { asyncHandler } from '../../middleware/error-handler.middleware';
import { favoriteArticle, unfavoriteArticle } from './favorite.service';

const router = Router();

/**
 * @swagger
 * /articles/{slug}/favorite:
 *   post:
 *     tags:
 *       - Articles
 *     summary: Favorite an article
 *     security:
 *       - TokenAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Article favorited
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ArticleResponse'
 *       401:
 *         description: Missing or invalid authorization credentials
 *       404:
 *         description: Article not found
 */
router.post(
  '/articles/:slug/favorite',
  auth.required,
  asyncHandler(async (req: Request, res: Response) => {
    const article = await favoriteArticle(String(req.params.slug), req.auth!.user.id);
    res.json({ article });
  }),
);

/**
 * @swagger
 * /articles/{slug}/favorite:
 *   delete:
 *     tags:
 *       - Articles
 *     summary: Unfavorite an article
 *     security:
 *       - TokenAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Article unfavorited
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ArticleResponse'
 *       401:
 *         description: Missing or invalid authorization credentials
 *       404:
 *         description: Article not found
 */
router.delete(
  '/articles/:slug/favorite',
  auth.required,
  asyncHandler(async (req: Request, res: Response) => {
    const article = await unfavoriteArticle(String(req.params.slug), req.auth!.user.id);
    res.json({ article });
  }),
);

export default router;
