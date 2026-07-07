jest.mock('../../app/routes/tag/tag.service');

import * as jwt from 'jsonwebtoken';
import express from 'express';
import request from 'supertest';
import tagController from '../../app/routes/tag/tag.controller';
import { globalErrorHandler, notFoundHandler } from '../../app/middleware/error-handler.middleware';
import getTags from '../../app/routes/tag/tag.service';

const token = jwt.sign({ user: { id: 456 } }, process.env.JWT_SECRET || 'superSecret', { expiresIn: '60d' });

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(tagController);
  app.use(notFoundHandler);
  app.use(globalErrorHandler);
  return app;
};

describe('tag.controller', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  describe('GET /tags', () => {
    test('returns the { tags } envelope without requiring authentication', async () => {
      (getTags as jest.Mock).mockResolvedValue(['dragons']);

      const res = await request(app).get('/tags');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ tags: ['dragons'] });
      expect(getTags).toHaveBeenCalledWith(undefined);
    });

    test('passes the authenticated user id when a valid token is present', async () => {
      (getTags as jest.Mock).mockResolvedValue(['dragons']);

      await request(app).get('/tags').set('Authorization', `Token ${token}`);

      expect(getTags).toHaveBeenCalledWith(456);
    });

    test('falls back to no user id (does not crash) when a validly-signed token has no user field', async () => {
      const shapelessToken = jwt.sign({ sub: 456 }, process.env.JWT_SECRET || 'superSecret', { expiresIn: '60d' });
      (getTags as jest.Mock).mockResolvedValue([]);

      const res = await request(app).get('/tags').set('Authorization', `Token ${shapelessToken}`);

      expect(res.status).toBe(200);
      expect(getTags).toHaveBeenCalledWith(undefined);
    });
  });
});
