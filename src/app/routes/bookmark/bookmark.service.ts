import prisma from '../../../prisma/prisma-client';
import HttpException from '../../models/http-exception.model';
import { AUTHOR_SELECT, mapRelationArticle } from '../article/article-relation.util';

const assertArticleExists = async (slug: string) => {
  const existingArticle = await prisma.article.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!existingArticle) {
    throw new HttpException(404, { errors: { article: ['not found'] } });
  }
};

export const bookmarkArticle = async (slugPayload: string, id: number) => {
  await assertArticleExists(slugPayload);

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
      bookmarkedBy: {
        select: {
          id: true,
        },
      },
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
  await assertArticleExists(slugPayload);

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
      bookmarkedBy: {
        select: {
          id: true,
        },
      },
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
