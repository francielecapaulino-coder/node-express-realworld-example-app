import prisma from '../../../prisma/prisma-client';
import { AUTHOR_SELECT, mapRelationArticle } from '../article/article-relation.util';

export const favoriteArticle = async (slugPayload: string, id: number) => {
  const { _count, ...article } = await prisma.article.update({
    where: {
      slug: slugPayload,
    },
    data: {
      favoritedBy: {
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
      favoritedBy: {
        select: {
          id: true,
        },
      },
      _count: {
        select: {
          favoritedBy: true,
        },
      },
    },
  });

  return {
    ...mapRelationArticle(article, id),
    favorited: article.favoritedBy.some((favorited) => favorited.id === id),
    favoritesCount: _count.favoritedBy,
  };
};

export const unfavoriteArticle = async (slugPayload: string, id: number) => {
  const { _count, ...article } = await prisma.article.update({
    where: {
      slug: slugPayload,
    },
    data: {
      favoritedBy: {
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
      favoritedBy: {
        select: {
          id: true,
        },
      },
      _count: {
        select: {
          favoritedBy: true,
        },
      },
    },
  });

  return {
    ...mapRelationArticle(article, id),
    favorited: article.favoritedBy.some((favorited) => favorited.id === id),
    favoritesCount: _count.favoritedBy,
  };
};
