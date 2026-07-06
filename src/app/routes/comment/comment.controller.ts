import { Request, Response, Router } from 'express';
import auth from '../auth/auth';
import { asyncHandler } from '../../middleware/error-handler.middleware';
import { addComment, deleteComment, getCommentsByArticle } from './comment.service';

const router = Router();

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
    const comment = await deleteComment(Number(req.params.id), req.auth!.user.id);
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
    const comments = await getCommentsByArticle(String(req.params.slug), req.auth?.user?.id);
    res.json({ comments });
  }),
);

export default router;
