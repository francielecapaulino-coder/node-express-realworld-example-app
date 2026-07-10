import prisma from '../../../prisma/prisma-client';
import HttpException from '../../models/http-exception.model';
import authorMapper from '../article/author.mapper';
import { AUTHOR_SELECT } from '../article/article-relation.util';

export const getCommentsByArticle = async (slug: string, id?: number) => {
  const queries = [];

  queries.push({
    author: {
      demo: true,
    },
  });

  if (id) {
    queries.push({
      author: {
        id,
      },
    });
  }

  const comments = await prisma.article.findUnique({
    where: {
      slug,
    },
    include: {
      comments: {
        where: {
          OR: queries,
        },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          body: true,
          author: {
            select: AUTHOR_SELECT,
          },
        },
      },
    },
  });

  if (!comments) {
    throw new HttpException(404, { errors: { article: ['not found'] } });
  }

  return comments.comments.map((comment) => ({
    ...comment,
    author: authorMapper(comment.author, id),
  }));
};

export const addComment = async (body: string, slug: string, id: number) => {
  if (!body) {
    throw new HttpException(422, { errors: { body: ["can't be blank"] } });
  }

  const article = await prisma.article.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
    },
  });

  if (!article) {
    throw new HttpException(404, { errors: { article: ['not found'] } });
  }

  const comment = await prisma.comment.create({
    data: {
      body,
      article: {
        connect: {
          id: article.id,
        },
      },
      author: {
        connect: {
          id: id,
        },
      },
    },
    include: {
      author: {
        select: AUTHOR_SELECT,
      },
    },
  });

  return {
    id: comment.id,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    body: comment.body,
    author: authorMapper(comment.author, id),
  };
};

export const deleteComment = async (id: number, userId: number) => {
  const comment = await prisma.comment.findFirst({
    where: {
      id,
      author: {
        id: userId,
      },
    },
    select: {
      author: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  if (!comment) {
    throw new HttpException(404, { errors: { comment: ['not found'] } });
  }

  if (comment.author.id !== userId) {
    throw new HttpException(403, {
      errors: { authorization: ['You are not authorized to delete this comment'] },
    });
  }

  await prisma.comment.delete({
    where: {
      id,
    },
  });
};
