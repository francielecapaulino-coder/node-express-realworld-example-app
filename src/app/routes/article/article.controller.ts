import { Request, Response, Router } from 'express';
import auth from '../auth/auth';
import { asyncHandler } from '../../middleware/error-handler.middleware';
import {
  addComment,
  bookmarkArticle,
  createArticle,
  deleteArticle,
  deleteComment,
  favoriteArticle,
  getArticle,
  getArticles,
  getCommentsByArticle,
  getFeed,
  unbookmarkArticle,
  unfavoriteArticle,
  updateArticle,
} from './article.service';

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
const result = await getArticles(req.query, req.auth?.user.id);
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
  const article = await getArticle(String(req.params.slug), req.auth?.user.id);
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
 *               $ref: '#/components/schemas/ArticleResponse'
 *       401:
 *         description: Missing or invalid authorization credentials
 *       404:
 *         description: Article not found
 */
router.delete('/articles/:slug', auth.required, asyncHandler(async (req: Request, res: Response) => {
  const article = await deleteArticle(String(req.params.slug), req.auth!.user.id);
  res.json({ article });
}));

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

/**
 * @swagger
 * /articles/{slug}/comments:
 *   post:
 *     tags:
 *       - Comments
 *     summary: Add a comment to an article
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
 *               comment:
 *                 type: object
 *                 properties:
 *                   body:
 *                     type: string
 *                 required:
 *                   - body
 *             required:
 *               - comment
 *     responses:
 *       200:
 *         description: Comment added
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommentResponse'
 *       401:
 *         description: Missing or invalid authorization credentials
 *       404:
 *         description: Article not found
 */
router.post(
  '/articles/:slug/comments',
  auth.required,
  asyncHandler(async (req: Request, res: Response) => {
    const comment = await addComment(req.body.comment.body, String(req.params.slug), req.auth!.user.id);
    res.json({ comment });
  }),
);

/**
 * @swagger
 * /articles/{slug}/comments/{id}:
 *   delete:
 *     tags:
 *       - Comments
 *     summary: Delete a comment
 *     security:
 *       - TokenAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comment deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommentResponse'
 *       401:
 *         description: Missing or invalid authorization credentials
 *       404:
 *         description: Comment not found
 */
router.delete(
  '/articles/:slug/comments/:id',
  auth.required,
  asyncHandler(async (req: Request, res: Response) => {
const comment = await deleteComment(
      Number(req.params.id),
      req.auth!.user.id,
    );
    res.json({ comment });
  }),
);

/**
 * @swagger
 * /articles/{slug}/comments:
 *   get:
 *     tags:
 *       - Comments
 *     summary: Get comments for an article
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of comments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommentsResponse'
 *       404:
 *         description: Article not found
 */
router.get(
  '/articles/:slug/comments',
  auth.optional,
  asyncHandler(async (req: Request, res: Response) => {
const comments = await getCommentsByArticle(String(req.params.slug), req.auth?.user.id);
    res.json({ comments });
  }),
);

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