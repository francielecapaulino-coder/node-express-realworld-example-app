jest.mock('../../app/routes/profile/profile.service');

import * as jwt from 'jsonwebtoken';
import express from 'express';
import request from 'supertest';
import profileController from '../../app/routes/profile/profile.controller';
import { globalErrorHandler, notFoundHandler } from '../../app/middleware/error-handler.middleware';
import * as profileService from '../../app/routes/profile/profile.service';

const token = jwt.sign({ user: { id: 456 } }, process.env.JWT_SECRET || 'superSecret', { expiresIn: '60d' });

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(profileController);
  app.use(notFoundHandler);
  app.use(globalErrorHandler);
  return app;
};

describe('profile.controller', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  describe('GET /profiles/:username', () => {
    test('returns the { profile } envelope without requiring authentication', async () => {
      (profileService.getProfile as jest.Mock).mockResolvedValue({ username: 'jake', following: false });

      const res = await request(app).get('/profiles/jake');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ profile: { username: 'jake', following: false } });
      expect(profileService.getProfile).toHaveBeenCalledWith('jake', undefined);
    });

    test('passes the authenticated user id when a valid token is present', async () => {
      (profileService.getProfile as jest.Mock).mockResolvedValue({ username: 'jake', following: true });

      await request(app).get('/profiles/jake').set('Authorization', `Token ${token}`);

      expect(profileService.getProfile).toHaveBeenCalledWith('jake', 456);
    });
  });

  describe('POST /profiles/:username/follow', () => {
    test('requires authentication', async () => {
      const res = await request(app).post('/profiles/jake/follow');
      expect(res.status).toBe(401);
      expect(profileService.followUser).not.toHaveBeenCalled();
    });

    test('follows the user and returns the { profile } envelope', async () => {
      (profileService.followUser as jest.Mock).mockResolvedValue({ username: 'jake', following: true });

      const res = await request(app).post('/profiles/jake/follow').set('Authorization', `Token ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ profile: { username: 'jake', following: true } });
      expect(profileService.followUser).toHaveBeenCalledWith('jake', 456);
    });
  });

  describe('DELETE /profiles/:username/follow', () => {
    test('requires authentication', async () => {
      const res = await request(app).delete('/profiles/jake/follow');
      expect(res.status).toBe(401);
      expect(profileService.unfollowUser).not.toHaveBeenCalled();
    });

    test('unfollows the user and returns the { profile } envelope', async () => {
      (profileService.unfollowUser as jest.Mock).mockResolvedValue({ username: 'jake', following: false });

      const res = await request(app).delete('/profiles/jake/follow').set('Authorization', `Token ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ profile: { username: 'jake', following: false } });
      expect(profileService.unfollowUser).toHaveBeenCalledWith('jake', 456);
    });
  });
});
