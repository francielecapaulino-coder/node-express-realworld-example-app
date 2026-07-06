jest.mock('../../app/routes/favorite/favorite.service');

import * as jwt from 'jsonwebtoken';
import express from 'express';
import request from 'supertest';
import favoriteController from '../../app/routes/favorite/favorite.controller';
import { globalErrorHandler, notFoundHandler } from '../../app/middleware/error-handler.middleware';
import * as favoriteService from '../../app/routes/favorite/favorite.service';

const token = jwt.sign({ user: { id: 456 } }, process.env.JWT_SECRET || 'superSecret', { expiresIn: '60d' });

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(favoriteController);
  app.use(notFoundHandler);
  app.use(globalErrorHandler);
  return app;
};

describe('favorite.controller', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  describe('POST /articles/:slug/favorite', () => {
    test('requires authentication', async () => {
      const res = await request(app).post('/articles/my-article/favorite');
      expect(res.status).toBe(401);
    });

    test('favorites the article and returns 200 with the { article } envelope', async () => {
      (favoriteService.favoriteArticle as jest.Mock).mockResolvedValue({ slug: 'my-article', favorited: true });

      const res = await request(app).post('/articles/my-article/favorite').set('Authorization', `Token ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ article: { slug: 'my-article', favorited: true } });
      expect(favoriteService.favoriteArticle).toHaveBeenCalledWith('my-article', 456);
    });
  });

  describe('DELETE /articles/:slug/favorite', () => {
    test('unfavorites the article and returns the { article } envelope', async () => {
      (favoriteService.unfavoriteArticle as jest.Mock).mockResolvedValue({ slug: 'my-article', favorited: false });

      const res = await request(app).delete('/articles/my-article/favorite').set('Authorization', `Token ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ article: { slug: 'my-article', favorited: false } });
      expect(favoriteService.unfavoriteArticle).toHaveBeenCalledWith('my-article', 456);
    });
  });
});
