import { Request, Response, Router } from 'express';
import auth from '../auth/auth';
import { asyncHandler } from '../../middleware/error-handler.middleware';
import { bookmarkArticle, unbookmarkArticle } from './bookmark.service';

const router = Router();

/**
 * @swagger
 * /articles/{slug}/bookmark:
 *   post:
 *     tags:
 *       - Bookmarks
 *     summary: Bookmark an article
 *     description: Saves an article as a personal bookmark for the current user, independent of favoriting.
 *     security:
 *       - TokenAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Article bookmarked
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
  '/articles/:slug/bookmark',
  auth.required,
  asyncHandler(async (req: Request, res: Response) => {
    const article = await bookmarkArticle(String(req.params.slug), req.auth!.user.id);
    res.status(201).json({ article });
  }),
);

/**
 * @swagger
 * /articles/{slug}/bookmark:
 *   delete:
 *     tags:
 *       - Bookmarks
 *     summary: Remove a bookmark from an article
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
 *         description: Bookmark removed
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
  '/articles/:slug/bookmark',
  auth.required,
  asyncHandler(async (req: Request, res: Response) => {
    const article = await unbookmarkArticle(String(req.params.slug), req.auth!.user.id);
    res.json({ article });
  }),
);

export default router;
