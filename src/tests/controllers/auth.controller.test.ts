jest.mock('../../app/routes/auth/auth.service');
jest.mock('../../app/middleware/rate-limit.middleware', () => ({
  loginRateLimit: (req: unknown, res: unknown, next: () => void) => next(),
  registrationRateLimit: (req: unknown, res: unknown, next: () => void) => next(),
}));

import * as jwt from 'jsonwebtoken';
import express from 'express';
import request from 'supertest';
import authController from '../../app/routes/auth/auth.controller';
import { globalErrorHandler, notFoundHandler } from '../../app/middleware/error-handler.middleware';
import * as authService from '../../app/routes/auth/auth.service';

const token = jwt.sign({ user: { id: 456 } }, process.env.JWT_SECRET || 'superSecret', { expiresIn: '60d' });

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(authController);
  app.use(notFoundHandler);
  app.use(globalErrorHandler);
  return app;
};

describe('auth.controller', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  describe('POST /users', () => {
    test('registers the user (forcing demo: false) and responds 201 with the { user } envelope', async () => {
      (authService.createUser as jest.Mock).mockResolvedValue({ username: 'jake', token: 'jwt-token' });

      const res = await request(app)
        .post('/users')
        .send({ user: { username: 'jake', email: 'jake@jake.jake', password: 'jakejake', demo: true } });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ user: { username: 'jake', token: 'jwt-token' } });
      expect(authService.createUser).toHaveBeenCalledWith({
        username: 'jake',
        email: 'jake@jake.jake',
        password: 'jakejake',
        demo: false,
      });
    });
  });

  describe('POST /users/login', () => {
    test('logs the user in and returns the { user } envelope', async () => {
      (authService.login as jest.Mock).mockResolvedValue({ username: 'jake', token: 'jwt-token' });

      const res = await request(app)
        .post('/users/login')
        .send({ user: { email: 'jake@jake.jake', password: 'jakejake' } });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ user: { username: 'jake', token: 'jwt-token' } });
      expect(authService.login).toHaveBeenCalledWith({ email: 'jake@jake.jake', password: 'jakejake' });
    });
  });

  describe('GET /user', () => {
    test('requires authentication', async () => {
      const res = await request(app).get('/user');
      expect(res.status).toBe(401);
      expect(authService.getCurrentUser).not.toHaveBeenCalled();
    });

    test('returns the current user for a valid token', async () => {
      (authService.getCurrentUser as jest.Mock).mockResolvedValue({ username: 'jake' });

      const res = await request(app).get('/user').set('Authorization', `Token ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ user: { username: 'jake' } });
      expect(authService.getCurrentUser).toHaveBeenCalledWith(456);
    });
  });

  describe('PUT /user', () => {
    test('requires authentication', async () => {
      const res = await request(app).put('/user').send({ user: { bio: 'hi' } });
      expect(res.status).toBe(401);
      expect(authService.updateUser).not.toHaveBeenCalled();
    });

    test('updates the current user and returns the { user } envelope', async () => {
      (authService.updateUser as jest.Mock).mockResolvedValue({ username: 'jake', bio: 'hi' });

      const res = await request(app)
        .put('/user')
        .set('Authorization', `Token ${token}`)
        .send({ user: { bio: 'hi' } });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ user: { username: 'jake', bio: 'hi' } });
      expect(authService.updateUser).toHaveBeenCalledWith({ bio: 'hi' }, 456);
    });
  });
});
