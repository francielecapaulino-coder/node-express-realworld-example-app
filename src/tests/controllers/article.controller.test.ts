jest.mock('../../app/routes/article/article.service');

import * as jwt from 'jsonwebtoken';
import express from 'express';
import request from 'supertest';
import articleController from '../../app/routes/article/article.controller';
import { globalErrorHandler, notFoundHandler } from '../../app/middleware/error-handler.middleware';
import * as articleService from '../../app/routes/article/article.service';
import HttpException from '../../app/models/http-exception.model';

const token = jwt.sign({ user: { id: 456 } }, process.env.JWT_SECRET || 'superSecret', { expiresIn: '60d' });

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(articleController);
  app.use(notFoundHandler);
  app.use(globalErrorHandler);
  return app;
};

describe('article.controller', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  describe('GET /articles', () => {
    test('calls getArticles with the query and no user id when unauthenticated, returns 200', async () => {
      (articleService.getArticles as jest.Mock).mockResolvedValue({ articles: [], articlesCount: 0 });

      const res = await request(app).get('/articles').query({ tag: 'dragons' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ articles: [], articlesCount: 0 });
      expect(articleService.getArticles).toHaveBeenCalledWith(expect.objectContaining({ tag: 'dragons' }), undefined);
    });

    test('passes the authenticated user id when a valid token is present', async () => {
      (articleService.getArticles as jest.Mock).mockResolvedValue({ articles: [], articlesCount: 0 });

      await request(app).get('/articles').set('Authorization', `Token ${token}`);

      expect(articleService.getArticles).toHaveBeenCalledWith(expect.anything(), 456);
    });

    test('falls back to no user id (does not crash) when a validly-signed token has no user field', async () => {
      const shapelessToken = jwt.sign({ sub: 456 }, process.env.JWT_SECRET || 'superSecret', { expiresIn: '60d' });
      (articleService.getArticles as jest.Mock).mockResolvedValue({ articles: [], articlesCount: 0 });

      const res = await request(app).get('/articles').set('Authorization', `Token ${shapelessToken}`);

      expect(res.status).toBe(200);
      expect(articleService.getArticles).toHaveBeenCalledWith(expect.anything(), undefined);
    });
  });

  describe('GET /articles/feed', () => {
    test('requires authentication (401 without a token)', async () => {
      const res = await request(app).get('/articles/feed');
      expect(res.status).toBe(401);
      expect(articleService.getFeed).not.toHaveBeenCalled();
    });

    test('converts offset/limit query params to numbers and forwards the user id', async () => {
      (articleService.getFeed as jest.Mock).mockResolvedValue({ articles: [], articlesCount: 0 });

      await request(app)
        .get('/articles/feed')
        .query({ offset: '5', limit: '2' })
        .set('Authorization', `Bearer ${token}`);

      expect(articleService.getFeed).toHaveBeenCalledWith(5, 2, 456);
    });
  });

  describe('POST /articles', () => {
    test('requires authentication', async () => {
      const res = await request(app).post('/articles').send({ article: {} });
      expect(res.status).toBe(401);
    });

    test('creates the article and responds 201 with the { article } envelope', async () => {
      (articleService.createArticle as jest.Mock).mockResolvedValue({ slug: 'my-article' });

      const res = await request(app)
        .post('/articles')
        .set('Authorization', `Token ${token}`)
        .send({ article: { title: 'My article' } });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ article: { slug: 'my-article' } });
      expect(articleService.createArticle).toHaveBeenCalledWith({ title: 'My article' }, 456);
    });
  });

  describe('GET /articles/:slug', () => {
    test('returns the { article } envelope for an authenticated-optional request', async () => {
      (articleService.getArticle as jest.Mock).mockResolvedValue({ slug: 'my-article' });

      const res = await request(app).get('/articles/my-article');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ article: { slug: 'my-article' } });
      expect(articleService.getArticle).toHaveBeenCalledWith('my-article', undefined);
    });

    test('propagates a 404 when the service throws', async () => {
      (articleService.getArticle as jest.Mock).mockRejectedValue(
        new HttpException(404, { errors: { article: ['not found'] } }),
      );

      const res = await request(app).get('/articles/missing');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /articles/:slug', () => {
    test('requires authentication', async () => {
      const res = await request(app).put('/articles/my-article').send({ article: {} });
      expect(res.status).toBe(401);
    });

    test('updates the article and returns the { article } envelope', async () => {
      (articleService.updateArticle as jest.Mock).mockResolvedValue({ slug: 'my-article', title: 'Updated' });

      const res = await request(app)
        .put('/articles/my-article')
        .set('Authorization', `Token ${token}`)
        .send({ article: { title: 'Updated' } });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ article: { slug: 'my-article', title: 'Updated' } });
      expect(articleService.updateArticle).toHaveBeenCalledWith({ title: 'Updated' }, 'my-article', 456);
    });
  });

  describe('DELETE /articles/:slug', () => {
    test('requires authentication', async () => {
      const res = await request(app).delete('/articles/my-article');
      expect(res.status).toBe(401);
    });

    test('deletes the article and returns an empty body (deleteArticle resolves nothing)', async () => {
      (articleService.deleteArticle as jest.Mock).mockResolvedValue(undefined);

      const res = await request(app).delete('/articles/my-article').set('Authorization', `Token ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
      expect(articleService.deleteArticle).toHaveBeenCalledWith('my-article', 456);
    });
  });
});
