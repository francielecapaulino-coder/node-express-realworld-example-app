jest.mock('../../app/routes/comment/comment.service');

import * as jwt from 'jsonwebtoken';
import express from 'express';
import request from 'supertest';
import commentController from '../../app/routes/comment/comment.controller';
import { globalErrorHandler, notFoundHandler } from '../../app/middleware/error-handler.middleware';
import * as commentService from '../../app/routes/comment/comment.service';

const token = jwt.sign({ user: { id: 456 } }, process.env.JWT_SECRET || 'superSecret', { expiresIn: '60d' });

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(commentController);
  app.use(notFoundHandler);
  app.use(globalErrorHandler);
  return app;
};

describe('comment.controller', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  describe('POST /articles/:slug/comments', () => {
    test('requires authentication', async () => {
      const res = await request(app).post('/articles/my-article/comments').send({ comment: { body: 'nice' } });
      expect(res.status).toBe(401);
    });

    test('adds the comment and returns the { comment } envelope', async () => {
      (commentService.addComment as jest.Mock).mockResolvedValue({ id: 1, body: 'nice' });

      const res = await request(app)
        .post('/articles/my-article/comments')
        .set('Authorization', `Token ${token}`)
        .send({ comment: { body: 'nice' } });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ comment: { id: 1, body: 'nice' } });
      expect(commentService.addComment).toHaveBeenCalledWith('nice', 'my-article', 456);
    });
  });

  describe('DELETE /articles/:slug/comments/:id', () => {
    test('requires authentication', async () => {
      const res = await request(app).delete('/articles/my-article/comments/1');
      expect(res.status).toBe(401);
    });

    test('converts the comment id to a number, deletes it, and returns an empty body (deleteComment resolves nothing)', async () => {
      (commentService.deleteComment as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app)
        .delete('/articles/my-article/comments/42')
        .set('Authorization', `Token ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
      expect(commentService.deleteComment).toHaveBeenCalledWith(42, 456);
    });
  });

  describe('GET /articles/:slug/comments', () => {
    test('returns the { comments } envelope without requiring authentication', async () => {
      (commentService.getCommentsByArticle as jest.Mock).mockResolvedValue([{ id: 1, body: 'nice' }]);

      const res = await request(app).get('/articles/my-article/comments');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ comments: [{ id: 1, body: 'nice' }] });
      expect(commentService.getCommentsByArticle).toHaveBeenCalledWith('my-article', undefined);
    });
  });
});
