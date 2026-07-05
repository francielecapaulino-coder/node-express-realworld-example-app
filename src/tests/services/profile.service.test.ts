jest.mock('../../prisma/prisma-client');

import prismaMock from '../prisma-mock';
import { followUser, getProfile, unfollowUser } from '../../app/routes/profile/profile.service';

describe('ProfileService', () => {
  describe('getProfile', () => {
    test('returns the mapped profile, with the exact Prisma query', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        username: 'RealWorld',
        bio: 'hi',
        image: 'pic.png',
        followedBy: [{ id: 123 }],
      } as any);

      const result = await getProfile('RealWorld', 123);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'RealWorld' },
        include: { followedBy: true },
      });
      expect(result).toEqual({ username: 'RealWorld', bio: 'hi', image: 'pic.png', following: true });
    });

    test('following is false when the current user does not follow the profile', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        username: 'RealWorld',
        bio: null,
        image: null,
        followedBy: [],
      } as any);

      const result = await getProfile('RealWorld', 123);

      expect(result).toHaveProperty('following', false);
    });

    test('following is false when no user id is given (unauthenticated request)', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        username: 'RealWorld',
        bio: null,
        image: null,
        followedBy: [{ id: 123 }],
      } as any);

      const result = await getProfile('RealWorld');

      expect(result).toHaveProperty('following', false);
    });

    test('throws a 404 when no profile is found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(getProfile('missing-user', 123)).rejects.toThrow();
    });
  });

  describe('followUser', () => {
    test('connects the current user and returns the mapped, followed profile', async () => {
      prismaMock.user.update.mockResolvedValue({
        username: 'AnotherUser',
        bio: null,
        image: null,
        followedBy: [{ id: 123 }],
      } as any);

      const result = await followUser('AnotherUser', 123);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { username: 'AnotherUser' },
        data: { followedBy: { connect: { id: 123 } } },
        include: { followedBy: true },
      });
      expect(result).toEqual({ username: 'AnotherUser', bio: null, image: null, following: true });
    });
  });

  describe('unfollowUser', () => {
    test('disconnects the current user and returns the mapped, unfollowed profile', async () => {
      prismaMock.user.update.mockResolvedValue({
        username: 'AnotherUser',
        bio: null,
        image: null,
        followedBy: [],
      } as any);

      const result = await unfollowUser('AnotherUser', 123);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { username: 'AnotherUser' },
        data: { followedBy: { disconnect: { id: 123 } } },
        include: { followedBy: true },
      });
      expect(result).toEqual({ username: 'AnotherUser', bio: null, image: null, following: false });
    });
  });
});
