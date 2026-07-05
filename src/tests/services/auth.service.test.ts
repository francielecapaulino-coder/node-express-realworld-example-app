jest.mock('../../prisma/prisma-client');

import * as bcrypt from 'bcryptjs';
import { createUser, getCurrentUser, login, updateUser } from '../../app/routes/auth/auth.service';
import prismaMock from '../prisma-mock';

describe('AuthService', () => {
  describe('createUser', () => {
    test('creates the user with only the required fields and returns it with a token', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        bio: null,
        image: null,
      });

      const result = await createUser({ username: 'RealWorld', email: 'realworld@me', password: '1234' });

      expect(prismaMock.user.findUnique).toHaveBeenNthCalledWith(1, {
        where: { email: 'realworld@me' },
        select: { id: true },
      });
      expect(prismaMock.user.findUnique).toHaveBeenNthCalledWith(2, {
        where: { username: 'RealWorld' },
        select: { id: true },
      });
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          username: 'RealWorld',
          email: 'realworld@me',
          password: expect.any(String),
        },
        select: { id: true, email: true, username: true, bio: true, image: true },
      });
      // Password must actually be hashed, never stored in plaintext
      const createData = (prismaMock.user.create as jest.Mock).mock.calls[0][0].data;
      expect(createData.password).not.toBe('1234');
      expect(await bcrypt.compare('1234', createData.password)).toBe(true);

      expect(result).toEqual({
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        bio: null,
        image: null,
        token: expect.any(String),
      });
    });

    test('includes image/bio/demo in the create payload only when they are provided', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({ id: 123, username: 'RealWorld', email: 'realworld@me' });

      await createUser({
        username: 'RealWorld',
        email: 'realworld@me',
        password: '1234',
        image: 'pic.png',
        bio: 'hi',
        demo: true,
      });

      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ image: 'pic.png', bio: 'hi', demo: true }),
        }),
      );
    });

    test('trims email/username/password before validating and persisting', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({ id: 123, username: 'RealWorld', email: 'realworld@me' });

      await createUser({ username: '  RealWorld  ', email: '  realworld@me  ', password: '  1234  ' });

      expect(prismaMock.user.findUnique).toHaveBeenNthCalledWith(1, {
        where: { email: 'realworld@me' },
        select: { id: true },
      });
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ username: 'RealWorld', email: 'realworld@me' }) }),
      );
    });

    test('throws when creating a new user with an empty username', async () => {
      const error = String({ errors: { username: ["can't be blank"] } });
      await expect(
        createUser({ id: 123, username: ' ', email: 'realworld@me', password: '1234' } as any),
      ).rejects.toThrow(error);
    });

    test('throws when creating a new user with an empty email', async () => {
      const error = String({ errors: { email: ["can't be blank"] } });
      await expect(
        createUser({ id: 123, username: 'RealWorld', email: '  ', password: '1234' } as any),
      ).rejects.toThrow(error);
    });

    test('throws when creating a new user with an empty password', async () => {
      const error = String({ errors: { password: ["can't be blank"] } });
      await expect(
        createUser({ id: 123, username: 'RealWorld', email: 'realworld@me', password: ' ' } as any),
      ).rejects.toThrow(error);
    });

    test('throws a 422 with both fields when both email and username already exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 999 } as any);

      const error = String({
        errors: { email: ['has already been taken'], username: ['has already been taken'] },
      });
      await expect(
        createUser({ username: 'RealWorld', email: 'realworld@me', password: '1234' }),
      ).rejects.toThrow(error);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    test('throws a 422 with only email when just the email already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: 999 } as any).mockResolvedValueOnce(null);

      const error = String({ errors: { email: ['has already been taken'] } });
      await expect(
        createUser({ username: 'RealWorld', email: 'realworld@me', password: '1234' }),
      ).rejects.toThrow(error);
    });

    test('throws a 422 with only username when just the username already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 999 } as any);

      const error = String({ errors: { username: ['has already been taken'] } });
      await expect(
        createUser({ username: 'RealWorld', email: 'realworld@me', password: '1234' }),
      ).rejects.toThrow(error);
    });
  });

  describe('login', () => {
    test('returns a token when the email/password match, with the exact Prisma query', async () => {
      const hashedPassword = await bcrypt.hash('1234', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        password: hashedPassword,
        bio: null,
        image: null,
      });

      const result = await login({ email: 'realworld@me', password: '1234' });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'realworld@me' },
        select: { id: true, email: true, username: true, password: true, bio: true, image: true },
      });
      expect(result).toEqual({
        email: 'realworld@me',
        username: 'RealWorld',
        bio: null,
        image: null,
        token: expect.any(String),
      });
    });

    test('trims email/password before looking the user up', async () => {
      const hashedPassword = await bcrypt.hash('1234', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        password: hashedPassword,
      });

      await login({ email: '  realworld@me  ', password: '  1234  ' });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'realworld@me' } }),
      );
    });

    test('throws when the email is empty', async () => {
      const error = String({ errors: { email: ["can't be blank"] } });
      await expect(login({ email: ' ', password: '1234' })).rejects.toThrow(error);
    });

    test('throws when the password is empty', async () => {
      const error = String({ errors: { password: ["can't be blank"] } });
      await expect(login({ email: 'realworld@me', password: ' ' })).rejects.toThrow(error);
    });

    test('throws a 403 when no user is found for the email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const error = String({ errors: { 'email or password': ['is invalid'] } });
      await expect(login({ email: 'realworld@me', password: '1234' })).rejects.toThrow(error);
    });

    test('throws a 403 when the password does not match', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        password: hashedPassword,
      });

      const error = String({ errors: { 'email or password': ['is invalid'] } });
      await expect(login({ email: 'realworld@me', password: 'wrong-password' })).rejects.toThrow(error);
    });
  });

  describe('getCurrentUser', () => {
    test('returns the user with the exact Prisma query and a token', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        bio: null,
        image: null,
      } as any);

      const result = await getCurrentUser(123);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 123 },
        select: { id: true, email: true, username: true, bio: true, image: true },
      });
      expect(result).toEqual({
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        bio: null,
        image: null,
        token: expect.any(String),
      });
    });
  });

  describe('updateUser', () => {
    test('updates only the provided fields, with the exact Prisma query', async () => {
      prismaMock.user.update.mockResolvedValue({
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        bio: 'new bio',
        image: null,
      } as any);

      const result = await updateUser({ bio: 'new bio' }, 123);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 123 },
        data: { bio: 'new bio' },
        select: { id: true, email: true, username: true, bio: true, image: true },
      });
      expect(result).toEqual({
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        bio: 'new bio',
        image: null,
        token: expect.any(String),
      });
    });

    test('hashes the new password when one is provided', async () => {
      prismaMock.user.update.mockResolvedValue({ id: 123, username: 'RealWorld', email: 'realworld@me' } as any);

      await updateUser({ password: 'new-password' }, 123);

      const updateData = (prismaMock.user.update as jest.Mock).mock.calls[0][0].data;
      expect(updateData.password).not.toBe('new-password');
      expect(await bcrypt.compare('new-password', updateData.password)).toBe(true);
    });

    test('sends an empty data payload when no fields are provided', async () => {
      prismaMock.user.update.mockResolvedValue({ id: 123, username: 'RealWorld', email: 'realworld@me' } as any);

      await updateUser({}, 123);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 123 },
        data: {},
        select: { id: true, email: true, username: true, bio: true, image: true },
      });
    });

    test('updates all fields at once when all are provided', async () => {
      prismaMock.user.update.mockResolvedValue({ id: 123, username: 'newname', email: 'new@me' } as any);

      await updateUser(
        { email: 'new@me', username: 'newname', password: 'new-password', image: 'new.png', bio: 'new bio' },
        123,
      );

      const updateData = (prismaMock.user.update as jest.Mock).mock.calls[0][0].data;
      expect(updateData).toEqual(
        expect.objectContaining({
          email: 'new@me',
          username: 'newname',
          image: 'new.png',
          bio: 'new bio',
          password: expect.any(String),
        }),
      );
    });
  });
});
