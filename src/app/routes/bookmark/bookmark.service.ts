import prisma from '../../../prisma/prisma-client';
import { AUTHOR_SELECT, mapRelationArticle } from '../article/article-relation.util';

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
        select: AUTHOR_SELECT,
      },
      bookmarkedBy: true,
      _count: {
        select: {
          bookmarkedBy: true,
        },
      },
    },
  });

  return {
    ...mapRelationArticle(article, id),
    bookmarked: article.bookmarkedBy.some((bookmarked) => bookmarked.id === id),
    bookmarksCount: _count.bookmarkedBy,
  };
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
        select: AUTHOR_SELECT,
      },
      bookmarkedBy: true,
      _count: {
        select: {
          bookmarkedBy: true,
        },
      },
    },
  });

  return {
    ...mapRelationArticle(article, id),
    bookmarked: article.bookmarkedBy.some((bookmarked) => bookmarked.id === id),
    bookmarksCount: _count.bookmarkedBy,
  };
};
