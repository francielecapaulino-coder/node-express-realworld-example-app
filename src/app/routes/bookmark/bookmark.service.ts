import prisma from '../../../prisma/prisma-client';
import profileMapper from '../profile/profile.utils';
import { Tag } from '../tag/tag.model';

export const bookmarkArticle = async (slugPayload: string, id: number) => {
  const { _count, ...article } = await prisma.article.update({
    where: {
      slug: slugPayload,
    },
    data: {
      bookmarkedBy: {
        connect: {
          id: id,
        },
      },
    },
    include: {
      tagList: {
        select: {
          name: true,
        },
      },
      author: {
        select: {
          username: true,
          bio: true,
          image: true,
          followedBy: true,
        },
      },
      bookmarkedBy: true,
      _count: {
        select: {
          bookmarkedBy: true,
        },
      },
    },
  });

  const result = {
    ...article,
    author: profileMapper(article.author, id),
    tagList: article.tagList.map((tag: Tag) => tag.name),
    bookmarked: article.bookmarkedBy.some((bookmarked) => bookmarked.id === id),
    bookmarksCount: _count.bookmarkedBy,
  };

  return result;
};

export const unbookmarkArticle = async (slugPayload: string, id: number) => {
  const { _count, ...article } = await prisma.article.update({
    where: {
      slug: slugPayload,
    },
    data: {
      bookmarkedBy: {
        disconnect: {
          id: id,
        },
      },
    },
    include: {
      tagList: {
        select: {
          name: true,
        },
      },
      author: {
        select: {
          username: true,
          bio: true,
          image: true,
          followedBy: true,
        },
      },
      bookmarkedBy: true,
      _count: {
        select: {
          bookmarkedBy: true,
        },
      },
    },
  });

  const result = {
    ...article,
    author: profileMapper(article.author, id),
    tagList: article.tagList.map((tag: Tag) => tag.name),
    bookmarked: article.bookmarkedBy.some((bookmarked) => bookmarked.id === id),
    bookmarksCount: _count.bookmarkedBy,
  };

  return result;
};
