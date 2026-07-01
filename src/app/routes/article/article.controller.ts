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
 * Get paginated articles
 * @auth optional
 * @route {GET} /articles
 * @queryparam offset number of articles dismissed from the first one
 * @queryparam limit number of articles returned
 * @queryparam tag
 * @queryparam author
 * @queryparam favorited
 * @returns articles: list of articles
 */
router.get('/articles', auth.optional, asyncHandler(async (req: Request, res: Response) => {
const result = await getArticles(req.query, req.auth?.user?.id);
  res.json(result);
}));

/**
 * Get user feed
 * @auth required
 * @route {GET} /articles/feed
 * @queryparam offset number of articles dismissed from the first one
 * @queryparam limit number of articles returned
 * @returns articles: list of articles
 */
router.get('/articles/feed', auth.required, asyncHandler(async (req: Request, res: Response) => {
  const result = await getFeed(
    Number(req.query.offset),
    Number(req.query.limit),
    req.auth?.user?.id,
  );
  res.json(result);
}));

/**
 * Create article
 * @route {POST} /articles
 * @bodyparam  title
 * @bodyparam  description
 * @bodyparam  body
 * @bodyparam  tagList list of tags
 * @returns article created article
 */
router.post('/articles', auth.required, asyncHandler(async (req: Request, res: Response) => {
  const article = await createArticle(req.body.article, req.auth?.user?.id);
  res.status(201).json({ article });
}));

/**
 * Get single article
 * @auth optional
 * @route {GET} /articles/:slug
 * @param slug slug of the article (based on the title)
 * @returns article single article
 */
router.get('/articles/:slug', auth.optional, asyncHandler(async (req: Request, res: Response) => {
  const article = await getArticle(req.params.slug, req.auth?.user?.id);
  res.json({ article });
}));

/**
 * Update article
 * @auth required
 * @route {PUT} /articles/:slug
 * @param slug slug of the article (based on the title)
 * @bodyparam article (title, description, body)
 * @returns article updated article
 */
router.put('/articles/:slug', auth.required, asyncHandler(async (req: Request, res: Response) => {
  const article = await updateArticle(req.body.article, req.params.slug, req.auth?.user?.id);
  res.json({ article });
}));

/**
 * Delete article
 * @auth required
 * @route {DELETE} /articles/:slug
 * @param slug slug of the article (based on the title)
 * @returns article deleted article
 */
router.delete('/articles/:slug', auth.required, asyncHandler(async (req: Request, res: Response) => {
  const article = await deleteArticle(req.params.slug, req.auth?.user?.id);
  res.json({ article });
}));

/**
 * Favorite article
 * @auth required
 * @route {POST} /articles/:slug/favorite
 * @param slug slug of the article (based on the title)
 * @returns article favorited article
 */
router.post(
  '/articles/:slug/favorite',
  auth.required,
  asyncHandler(async (req: Request, res: Response) => {
    const article = await favoriteArticle(req.params.slug, req.auth?.user?.id);
    res.json({ article });
  }),
);

/**
 * Unfavorite article
 * @auth required
 * @route {DELETE} /articles/:slug/favorite
 * @param slug slug of the article (based on the title)
 * @returns article unfavorited article
 */
router.delete(
  '/articles/:slug/favorite',
  auth.required,
  asyncHandler(async (req: Request, res: Response) => {
    const article = await unfavoriteArticle(req.params.slug, req.auth?.user?.id);
    res.json({ article });
  }),
);

/**
 * Add comment to article
 * @auth required
 * @route {POST} /articles/:slug/comments
 * @bodyparam comment
 * @returns comment added comment
 */
router.post(
  '/articles/:slug/comments',
  auth.required,
  asyncHandler(async (req: Request, res: Response) => {
    const comment = await addComment(req.body.comment.body, req.params.slug, req.auth?.user?.id);
    res.json({ comment });
  }),
);

/**
 * Delete comment
 * @auth required
 * @route {DELETE} /articles/:slug/comments/:id
 * @param slug slug of the article (based on the title)
 * @param id id of the comment
 * @returns comment deleted comment
 */
router.delete(
  '/articles/:slug/comments/:id',
  auth.required,
  asyncHandler(async (req: Request, res: Response) => {
const comment = await deleteComment(
      Number(req.params.id),
      req.auth?.user?.id,
    );
    res.json({ comment });
  }),
);

/**
 * Get article comments
 * @auth optional
 * @route {GET} /articles/:slug/comments
 * @param slug slug of the article (based on the title)
 * @returns comments list of comments
 */
router.get(
  '/articles/:slug/comments',
  auth.optional,
  asyncHandler(async (req: Request, res: Response) => {
const comments = await getCommentsByArticle(req.params.slug, req.auth?.user?.id);
    res.json({ comments });
  }),
);

/**
 * Bookmark article
 * @auth required
 * @route {POST} /articles/:slug/bookmark
 * @param slug slug of the article (based on the title)
 * @returns article bookmarked article
 */
router.post(
  '/articles/:slug/bookmark',
  auth.required,
  asyncHandler(async (req: Request, res: Response) => {
    const article = await bookmarkArticle(req.params.slug, req.auth?.user?.id);
    res.status(201).json({ article });
  }),
);

/**
 * Remove bookmark from article
 * @auth required
 * @route {DELETE} /articles/:slug/bookmark
 * @param slug slug of the article (based on the title)
 * @returns article unbookmarked article
 */
router.delete(
  '/articles/:slug/bookmark',
  auth.required,
  asyncHandler(async (req: Request, res: Response) => {
    const article = await unbookmarkArticle(req.params.slug, req.auth?.user?.id);
    res.json({ article });
  }),
);

export default router;