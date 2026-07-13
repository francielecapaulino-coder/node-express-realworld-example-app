jest.mock('../../prisma/prisma-client');

import * as bcrypt from 'bcryptjs';
import { createUser, getCurrentUser, login, updateUser } from '../../app/routes/auth/auth.service';
import prismaMock from '../prisma-mock';

describe('AuthService', () => {
  describe('createUser', () => {
    test('creates the user with only the required fields and returns it with a token', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.create.mockResolvedValue({
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        bio: null,
        image: null,
      });

      const result = await createUser({ username: 'RealWorld', email: 'realworld@me', password: 'password123' });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { OR: [{ email: 'realworld@me' }, { username: 'RealWorld' }] },
        select: { email: true, username: true },
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
      expect(createData.password).not.toBe('password123');
      expect(await bcrypt.compare('password123', createData.password)).toBe(true);

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
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.create.mockResolvedValue({ id: 123, username: 'RealWorld', email: 'realworld@me' });

      await createUser({
        username: 'RealWorld',
        email: 'realworld@me',
        password: 'password123',
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
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.create.mockResolvedValue({ id: 123, username: 'RealWorld', email: 'realworld@me' });

      await createUser({ username: '  RealWorld  ', email: '  realworld@me  ', password: '  password123  ' });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { OR: [{ email: 'realworld@me' }, { username: 'RealWorld' }] } }),
      );
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ username: 'RealWorld', email: 'realworld@me' }) }),
      );
    });

    test('throws when creating a new user with an empty username', async () => {
      await expect(
        createUser({ id: 123, username: ' ', email: 'realworld@me', password: 'password123' } as any),
      ).rejects.toMatchObject({ errorCode: 422, message: { errors: { username: ["can't be blank"] } } });
    });

    test('throws when creating a new user with an empty email', async () => {
      await expect(
        createUser({ id: 123, username: 'RealWorld', email: '  ', password: 'password123' } as any),
      ).rejects.toMatchObject({ errorCode: 422, message: { errors: { email: ["can't be blank"] } } });
    });

    test('throws when creating a new user with an empty password', async () => {
      await expect(
        createUser({ id: 123, username: 'RealWorld', email: 'realworld@me', password: ' ' } as any),
      ).rejects.toMatchObject({ errorCode: 422, message: { errors: { password: ["can't be blank"] } } });
    });

    test('throws when creating a new user with a missing email field', async () => {
      await expect(
        createUser({ id: 123, username: 'RealWorld', password: 'password123' } as any),
      ).rejects.toMatchObject({ errorCode: 422, message: { errors: { email: ["can't be blank"] } } });
    });

    test('throws when creating a new user with a missing password field', async () => {
      await expect(
        createUser({ id: 123, username: 'RealWorld', email: 'realworld@me' } as any),
      ).rejects.toMatchObject({ errorCode: 422, message: { errors: { password: ["can't be blank"] } } });
    });

    test('throws a 422 when the password is shorter than 8 characters', async () => {
      await expect(
        createUser({ username: 'RealWorld', email: 'realworld@me', password: '1234567' }),
      ).rejects.toMatchObject({
        errorCode: 422,
        message: { errors: { password: ['is too short (minimum is 8 characters)'] } },
      });
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    test('throws a 422 with both fields when both email and username already exist', async () => {
      prismaMock.user.findMany.mockResolvedValue([{ email: 'realworld@me', username: 'RealWorld' }] as any);

      await expect(
        createUser({ username: 'RealWorld', email: 'realworld@me', password: 'password123' }),
      ).rejects.toMatchObject({
        errorCode: 422,
        message: { errors: { email: ['has already been taken'], username: ['has already been taken'] } },
      });
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    test('throws a 422 with only email when just the email already exists', async () => {
      prismaMock.user.findMany.mockResolvedValue([{ email: 'realworld@me', username: 'someone-else' }] as any);

      await expect(
        createUser({ username: 'RealWorld', email: 'realworld@me', password: 'password123' }),
      ).rejects.toMatchObject({ errorCode: 422, message: { errors: { email: ['has already been taken'] } } });
    });

    test('throws a 422 with only username when just the username already exists', async () => {
      prismaMock.user.findMany.mockResolvedValue([{ email: 'someone-else@me', username: 'RealWorld' }] as any);

      await expect(
        createUser({ username: 'RealWorld', email: 'realworld@me', password: 'password123' }),
      ).rejects.toMatchObject({ errorCode: 422, message: { errors: { username: ['has already been taken'] } } });
    });
  });

  describe('login', () => {
    test('returns a token when the email/password match, with the exact Prisma query', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        password: hashedPassword,
        bio: null,
        image: null,
      });

      const result = await login({ email: 'realworld@me', password: 'password123' });

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
      const hashedPassword = await bcrypt.hash('password123', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        password: hashedPassword,
      });

      await login({ email: '  realworld@me  ', password: '  password123  ' });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'realworld@me' } }),
      );
    });

    test('throws when the email is empty', async () => {
      await expect(login({ email: ' ', password: 'password123' })).rejects.toMatchObject({
        errorCode: 422,
        message: { errors: { email: ["can't be blank"] } },
      });
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    test('throws when the email field is missing', async () => {
      await expect(login({ password: 'password123' })).rejects.toMatchObject({
        errorCode: 422,
        message: { errors: { email: ["can't be blank"] } },
      });
    });

    test('throws when the password is empty', async () => {
      await expect(login({ email: 'realworld@me', password: ' ' })).rejects.toMatchObject({
        errorCode: 422,
        message: { errors: { password: ["can't be blank"] } },
      });
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    test('throws when the password field is missing', async () => {
      await expect(login({ email: 'realworld@me' })).rejects.toMatchObject({
        errorCode: 422,
        message: { errors: { password: ["can't be blank"] } },
      });
    });

    test('throws a 403 when no user is found for the email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(login({ email: 'realworld@me', password: 'password123' })).rejects.toMatchObject({
        errorCode: 403,
        message: { errors: { 'email or password': ['is invalid'] } },
      });
    });

    test('throws a 403 when the password does not match', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        password: hashedPassword,
      });

      await expect(login({ email: 'realworld@me', password: 'wrong-password' })).rejects.toMatchObject({
        errorCode: 403,
        message: { errors: { 'email or password': ['is invalid'] } },
      });
    });
  });

  describe('getCurrentUser', () => {
    test('returns the user with the exact Prisma query and the given token echoed back', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        bio: null,
        image: null,
      } as any);

      const result = await getCurrentUser(123, 'the-callers-existing-token');

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
        token: 'the-callers-existing-token',
      });
    });

    test('throws a 401 when the user backing a still-valid token no longer exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(getCurrentUser(123, 'some-token')).rejects.toMatchObject({
        errorCode: 401,
        message: { errors: { authorization: ['user no longer exists'] } },
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

      expect(prismaMock.user.findMany).not.toHaveBeenCalled();
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

    test('checks uniqueness, excluding the current user, when email or username is provided', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.update.mockResolvedValue({ id: 123, username: 'newname', email: 'realworld@me' } as any);

      await updateUser({ username: 'newname' }, 123);

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { OR: [{ username: 'newname' }], NOT: { id: 123 } },
        select: { email: true, username: true },
      });
    });

    test('throws a 422 when the new email is already taken by another user', async () => {
      prismaMock.user.findMany.mockResolvedValue([{ email: 'taken@me', username: 'someone-else' }] as any);

      await expect(updateUser({ email: 'taken@me' }, 123)).rejects.toMatchObject({
        errorCode: 422,
        message: { errors: { email: ['has already been taken'] } },
      });
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    test('does not treat resubmitting your own current email as a conflict', async () => {
      // findMany's NOT: {id: 123} means the mock naturally excludes the current
      // user's own row from the conflict set — simulated here by an empty result.
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.update.mockResolvedValue({ id: 123, username: 'RealWorld', email: 'realworld@me' } as any);

      await expect(updateUser({ email: 'realworld@me' }, 123)).resolves.toBeDefined();
      expect(prismaMock.user.update).toHaveBeenCalled();
    });

    test('hashes the new password when one is provided', async () => {
      prismaMock.user.update.mockResolvedValue({ id: 123, username: 'RealWorld', email: 'realworld@me' } as any);

      await updateUser({ password: 'new-password' }, 123);

      const updateData = (prismaMock.user.update as jest.Mock).mock.calls[0][0].data;
      expect(updateData.password).not.toBe('new-password');
      expect(await bcrypt.compare('new-password', updateData.password)).toBe(true);
    });

    test('throws a 422 when the new password is shorter than 8 characters', async () => {
      await expect(updateUser({ password: '1234567' }, 123)).rejects.toMatchObject({
        errorCode: 422,
        message: { errors: { password: ['is too short (minimum is 8 characters)'] } },
      });
      expect(prismaMock.user.update).not.toHaveBeenCalled();
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
      prismaMock.user.findMany.mockResolvedValue([]);
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
