import prisma from '../../../prisma/prisma-client';
import profileMapper from './profile.utils';
import HttpException from '../../models/http-exception.model';
import { AUTHOR_SELECT } from '../article/article-relation.util';

export const getProfile = async (usernamePayload: string, id?: number) => {
  const profile = await prisma.user.findUnique({
    where: {
      username: usernamePayload,
    },
    select: AUTHOR_SELECT,
  });

  if (!profile) {
    throw new HttpException(404, { errors: { profile: ['not found'] } });
  }

  return profileMapper(profile, id);
};

export const followUser = async (usernamePayload: string, id: number) => {
  const target = await prisma.user.findUnique({
    where: {
      username: usernamePayload,
    },
    select: {
      id: true,
    },
  });

  if (!target) {
    throw new HttpException(404, { errors: { profile: ['not found'] } });
  }

  if (target.id === id) {
    throw new HttpException(422, { errors: { follow: ["can't follow yourself"] } });
  }

  const profile = await prisma.user.update({
    where: {
      username: usernamePayload,
    },
    data: {
      followedBy: {
        connect: {
          id,
        },
      },
    },
    select: AUTHOR_SELECT,
  });

  return profileMapper(profile, id);
};

export const unfollowUser = async (usernamePayload: string, id: number) => {
  const target = await prisma.user.findUnique({
    where: {
      username: usernamePayload,
    },
    select: {
      id: true,
    },
  });

  if (!target) {
    throw new HttpException(404, { errors: { profile: ['not found'] } });
  }

  const profile = await prisma.user.update({
    where: {
      username: usernamePayload,
    },
    data: {
      followedBy: {
        disconnect: {
          id,
        },
      },
    },
    select: AUTHOR_SELECT,
  });

  return profileMapper(profile, id);
};
