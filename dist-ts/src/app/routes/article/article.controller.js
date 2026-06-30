"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const express_1 = require("express");
const auth_1 = tslib_1.__importDefault(require("../auth/auth"));
const error_handler_middleware_1 = require("../../middleware/error-handler.middleware");
const article_service_1 = require("./article.service");
const router = (0, express_1.Router)();
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
router.get('/articles', auth_1.default.optional, (0, error_handler_middleware_1.asyncHandler)(async (req, res) => {
    const result = await (0, article_service_1.getArticles)(req.query, req.auth?.user?.id);
    res.json(result);
}));
/**
 * Get paginated feed articles
 * @auth required
 * @route {GET} /articles/feed
 * @returns articles list of articles
 */
router.get('/articles/feed', auth_1.default.required, async (req, res, next) => {
    try {
        const result = await (0, article_service_1.getFeed)(Number(req.query.offset), Number(req.query.limit), req.auth?.user?.id);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Create article
 * @route {POST} /articles
 * @bodyparam  title
 * @bodyparam  description
 * @bodyparam  body
 * @bodyparam  tagList list of tags
 * @returns article created article
 */
router.post('/articles', auth_1.default.required, async (req, res, next) => {
    try {
        const article = await (0, article_service_1.createArticle)(req.body.article, req.auth?.user?.id);
        res.status(201).json({ article });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Get unique article
 * @auth optional
 * @route {GET} /article/:slug
 * @param slug slug of the article (based on the title)
 * @returns article
 */
router.get('/articles/:slug', auth_1.default.optional, async (req, res, next) => {
    try {
        const article = await (0, article_service_1.getArticle)(req.params.slug, req.auth?.user?.id);
        res.json({ article });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Update article
 * @auth required
 * @route {PUT} /articles/:slug
 * @param slug slug of the article (based on the title)
 * @bodyparam title new title
 * @bodyparam description new description
 * @bodyparam body new content
 * @returns article updated article
 */
router.put('/articles/:slug', auth_1.default.required, async (req, res, next) => {
    try {
        const article = await (0, article_service_1.updateArticle)(req.body.article, req.params.slug, req.auth?.user?.id);
        res.json({ article });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Delete article
 * @auth required
 * @route {DELETE} /article/:id
 * @param slug slug of the article
 */
router.delete('/articles/:slug', auth_1.default.required, async (req, res, next) => {
    try {
        await (0, article_service_1.deleteArticle)(req.params.slug, req.auth?.user.id);
        res.sendStatus(204);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Get comments from an article
 * @auth optional
 * @route {GET} /articles/:slug/comments
 * @param slug slug of the article (based on the title)
 * @returns comments list of comments
 */
router.get('/articles/:slug/comments', auth_1.default.optional, async (req, res, next) => {
    try {
        const comments = await (0, article_service_1.getCommentsByArticle)(req.params.slug, req.auth?.user?.id);
        res.json({ comments });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Add comment to article
 * @auth required
 * @route {POST} /articles/:slug/comments
 * @param slug slug of the article (based on the title)
 * @bodyparam body content of the comment
 * @returns comment created comment
 */
router.post('/articles/:slug/comments', auth_1.default.required, async (req, res, next) => {
    try {
        const comment = await (0, article_service_1.addComment)(req.body.comment.body, req.params.slug, req.auth?.user?.id);
        res.json({ comment });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Delete comment
 * @auth required
 * @route {DELETE} /articles/:slug/comments/:id
 * @param slug slug of the article (based on the title)
 * @param id id of the comment
 */
router.delete('/articles/:slug/comments/:id', auth_1.default.required, async (req, res, next) => {
    try {
        await (0, article_service_1.deleteComment)(Number(req.params.id), req.auth?.user?.id);
        res.status(200).json({});
    }
    catch (error) {
        next(error);
    }
});
/**
 * Favorite article
 * @auth required
 * @route {POST} /articles/:slug/favorite
 * @param slug slug of the article (based on the title)
 * @returns article favorited article
 */
router.post('/articles/:slug/favorite', auth_1.default.required, async (req, res, next) => {
    try {
        const article = await (0, article_service_1.favoriteArticle)(req.params.slug, req.auth?.user?.id);
        res.json({ article });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Unfavorite article
 * @auth required
 * @route {DELETE} /articles/:slug/favorite
 * @param slug slug of the article (based on the title)
 * @returns article unfavorited article
 */
router.delete('/articles/:slug/favorite', auth_1.default.required, async (req, res, next) => {
    try {
        const article = await (0, article_service_1.unfavoriteArticle)(req.params.slug, req.auth?.user?.id);
        res.json({ article });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @swagger
 * /articles/{slug}/bookmark:
 *   post:
 *     tags:
 *       - Articles
 *       - Bookmarks
 *     summary: Bookmark an article
 *     description: Add an article to the authenticated user's bookmarks collection
 *     security:
 *       - TokenAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: The slug of the article to bookmark
 *     responses:
 *       201:
 *         description: Article bookmarked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ArticleResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: object
 *                   example:
 *                     authorization: ["missing or invalid authorization credentials"]
 *       404:
 *         description: Article not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: object
 *                   example:
 *                     article: ["not found"]
 */
router.post('/articles/:slug/bookmark', auth_1.default.required, async (req, res, next) => {
    try {
        const article = await (0, article_service_1.bookmarkArticle)(req.params.slug, req.auth?.user?.id);
        res.status(201).json({ article });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Remove bookmark from article
 * @auth required
 * @route {DELETE} /articles/:slug/bookmark
 * @param slug slug of the article (based on the title)
 * @returns article unbookmarked article
 */
router.delete('/articles/:slug/bookmark', auth_1.default.required, async (req, res, next) => {
    try {
        const article = await (0, article_service_1.unbookmarkArticle)(req.params.slug, req.auth?.user?.id);
        res.json({ article });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=article.controller.js.map