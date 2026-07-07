import { Request, Response, Router } from 'express';
import auth from '../auth/auth';
import { asyncHandler } from '../../middleware/error-handler.middleware';
import { createArticle, deleteArticle, getArticle, getArticles, getFeed, updateArticle } from './article.service';

const router = Router();

/**
 * @swagger
 * /articles:
 *   get:
 *     tags:
 *       - Articles
 *     summary: List articles
 *     description: Returns the most recent articles globally, with optional filters. Auth is optional.
 *     parameters:
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Number of articles to skip from the first one
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of articles to return
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Filter articles by tag
 *       - in: query
 *         name: author
 *         schema:
 *           type: string
 *         description: Filter articles by author username
 *       - in: query
 *         name: favorited
 *         schema:
 *           type: string
 *         description: Filter articles favorited by the given username
 *     responses:
 *       200:
 *         description: List of articles
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ArticlesResponse'
 */
router.get('/articles', auth.optional, asyncHandler(async (req: Request, res: Response) => {
  const result = await getArticles(req.query, req.auth?.user?.id);
  res.json(result);
}));

/**
 * @swagger
 * /articles/feed:
 *   get:
 *     tags:
 *       - Articles
 *     summary: Get the current user's feed
 *     description: Returns the most recent articles from users the current user follows
 *     security:
 *       - TokenAuth: []
 *     parameters:
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Number of articles to skip from the first one
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of articles to return
 *     responses:
 *       200:
 *         description: List of articles
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ArticlesResponse'
 *       401:
 *         description: Missing or invalid authorization credentials
 */
router.get('/articles/feed', auth.required, asyncHandler(async (req: Request, res: Response) => {
  const result = await getFeed(
    Number(req.query.offset),
    Number(req.query.limit),
    req.auth!.user.id,
  );
  res.json(result);
}));

/**
 * @swagger
 * /articles:
 *   post:
 *     tags:
 *       - Articles
 *     summary: Create an article
 *     security:
 *       - TokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               article:
 *                 $ref: '#/components/schemas/Article'
 *             required:
 *               - article
 *     responses:
 *       201:
 *         description: Article created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ArticleResponse'
 *       401:
 *         description: Missing or invalid authorization credentials
 *       422:
 *         description: Validation error
 */
router.post('/articles', auth.required, asyncHandler(async (req: Request, res: Response) => {
  const article = await createArticle(req.body.article, req.auth!.user.id);
  res.status(201).json({ article });
}));

/**
 * @swagger
 * /articles/{slug}:
 *   get:
 *     tags:
 *       - Articles
 *     summary: Get a single article
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Article found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ArticleResponse'
 *       404:
 *         description: Article not found
 */
router.get('/articles/:slug', auth.optional, asyncHandler(async (req: Request, res: Response) => {
  const article = await getArticle(String(req.params.slug), req.auth?.user?.id);
  res.json({ article });
}));

/**
 * @swagger
 * /articles/{slug}:
 *   put:
 *     tags:
 *       - Articles
 *     summary: Update an article
 *     security:
 *       - TokenAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               article:
 *                 $ref: '#/components/schemas/Article'
 *             required:
 *               - article
 *     responses:
 *       200:
 *         description: Article updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ArticleResponse'
 *       401:
 *         description: Missing or invalid authorization credentials
 *       404:
 *         description: Article not found
 */
router.put('/articles/:slug', auth.required, asyncHandler(async (req: Request, res: Response) => {
  const article = await updateArticle(req.body.article, String(req.params.slug), req.auth!.user.id);
  res.json({ article });
}));

/**
 * @swagger
 * /articles/{slug}:
 *   delete:
 *     tags:
 *       - Articles
 *     summary: Delete an article
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
 *         description: Article deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Missing or invalid authorization credentials
 *       404:
 *         description: Article not found
 */
router.delete('/articles/:slug', auth.required, asyncHandler(async (req: Request, res: Response) => {
  await deleteArticle(String(req.params.slug), req.auth!.user.id);
  res.json({});
}));

export default router;
