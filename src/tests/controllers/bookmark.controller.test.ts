jest.mock('../../app/routes/bookmark/bookmark.service');

import * as jwt from 'jsonwebtoken';
import express from 'express';
import request from 'supertest';
import bookmarkController from '../../app/routes/bookmark/bookmark.controller';
import { globalErrorHandler, notFoundHandler } from '../../app/middleware/error-handler.middleware';
import * as bookmarkService from '../../app/routes/bookmark/bookmark.service';

const token = jwt.sign({ user: { id: 456 } }, process.env.JWT_SECRET || 'superSecret', { expiresIn: '60d' });

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(bookmarkController);
  app.use(notFoundHandler);
  app.use(globalErrorHandler);
  return app;
};

describe('bookmark.controller', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  describe('POST /articles/:slug/bookmark', () => {
    test('requires authentication', async () => {
      const res = await request(app).post('/articles/my-article/bookmark');
      expect(res.status).toBe(401);
    });

    test('bookmarks the article and responds 201 with the { article } envelope', async () => {
      (bookmarkService.bookmarkArticle as jest.Mock).mockResolvedValue({ slug: 'my-article', bookmarked: true });

      const res = await request(app).post('/articles/my-article/bookmark').set('Authorization', `Token ${token}`);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ article: { slug: 'my-article', bookmarked: true } });
      expect(bookmarkService.bookmarkArticle).toHaveBeenCalledWith('my-article', 456);
    });
  });

  describe('DELETE /articles/:slug/bookmark', () => {
    test('removes the bookmark and returns 200 with the { article } envelope', async () => {
      (bookmarkService.unbookmarkArticle as jest.Mock).mockResolvedValue({ slug: 'my-article', bookmarked: false });

      const res = await request(app).delete('/articles/my-article/bookmark').set('Authorization', `Token ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ article: { slug: 'my-article', bookmarked: false } });
      expect(bookmarkService.unbookmarkArticle).toHaveBeenCalledWith('my-article', 456);
    });
  });
});
