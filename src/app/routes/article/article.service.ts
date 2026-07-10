import slugify from 'slugify';
import { Request } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';
import HttpException from '../../models/http-exception.model';
import articleMapper from './article.mapper';
import { AUTHOR_SELECT } from './article-relation.util';

export interface ArticleInput {
  title?: string;
  description?: string;
  body?: string;
  tagList?: unknown;
}

type ArticleListQuery = Request['query'];

const buildFindAllQuery = (query: ArticleListQuery, id: number | undefined): Prisma.ArticleWhereInput[] => {
  const queries: Prisma.ArticleWhereInput[] = [];
  const orAuthorQuery: Prisma.UserWhereInput[] = [];
  const andAuthorQuery: Prisma.UserWhereInput[] = [];

  orAuthorQuery.push({
    demo: {
      equals: true,
    },
  });

  if (id) {
    orAuthorQuery.push({
      id: {
        equals: id,
      },
    });
  }

  if ('author' in query) {
    andAuthorQuery.push({
      username: {
        equals: String(query.author),
      },
    });
  }

  const authorQuery = {
    author: {
      OR: orAuthorQuery,
      AND: andAuthorQuery,
    },
  };

  queries.push(authorQuery);

  if ('tag' in query) {
    queries.push({
      tagList: {
        some: {
          name: String(query.tag),
        },
      },
    });
  }

  if ('favorited' in query) {
    queries.push({
      favoritedBy: {
        some: {
          username: {
            equals: String(query.favorited),
          },
        },
      },
    });
  }

  return queries;
};

export const getArticles = async (query: ArticleListQuery, id?: number) => {
  const andQueries = buildFindAllQuery(query, id);
  const articlesCount = await prisma.article.count({
    where: {
      AND: andQueries,
    },
  });

  const articles = await prisma.article.findMany({
    where: { AND: andQueries },
    orderBy: {
      createdAt: 'desc',
    },
    skip: Number(query.offset) || 0,
    take: Number(query.limit) || 10,
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
    articles: articles.map((article) => articleMapper(article, id)),
    articlesCount,
  };
};

export const getFeed = async (offset: number, limit: number, id: number) => {
  const articlesCount = await prisma.article.count({
    where: {
      author: {
        followedBy: { some: { id: id } },
      },
    },
  });

  const articles = await prisma.article.findMany({
    where: {
      author: {
        followedBy: { some: { id: id } },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    skip: offset || 0,
    take: limit || 10,
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
    articles: articles.map((article) => articleMapper(article, id)),
    articlesCount,
  };
};

export const createArticle = async (article: ArticleInput, id: number) => {
  const { title, description, body, tagList } = article;
  const tags = Array.isArray(tagList) ? tagList : [];

  if (!title) {
    throw new HttpException(422, { errors: { title: ["can't be blank"] } });
  }

  if (!description) {
    throw new HttpException(422, { errors: { description: ["can't be blank"] } });
  }

  if (!body) {
    throw new HttpException(422, { errors: { body: ["can't be blank"] } });
  }

  const slug = `${slugify(title)}-${id}`;

  const existingTitle = await prisma.article.findUnique({
    where: {
      slug,
    },
    select: {
      slug: true,
    },
  });

  if (existingTitle) {
    throw new HttpException(422, { errors: { title: ['must be unique'] } });
  }

  const {
    authorId,
    id: articleId,
    ...createdArticle
  } = await prisma.article.create({
    data: {
      title,
      description,
      body,
      slug,
      tagList: {
        connectOrCreate: tags.map((tag: string) => ({
          create: { name: tag },
          where: { name: tag },
        })),
      },
      author: {
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

  return articleMapper(createdArticle, id);
};

export const getArticle = async (slug: string, id?: number) => {
  const article = await prisma.article.findUnique({
    where: {
      slug,
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

  if (!article) {
    throw new HttpException(404, { errors: { article: ['not found'] } });
  }

  return articleMapper(article, id);
};

const disconnectArticlesTags = async (slug: string) => {
  await prisma.article.update({
    where: {
      slug,
    },
    data: {
      tagList: {
        set: [],
      },
    },
  });
};

export const updateArticle = async (article: ArticleInput, slug: string, id: number) => {
  let newSlug = null;

  const existingArticle = await await prisma.article.findFirst({
    where: {
      slug,
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

  if (!existingArticle) {
    throw new HttpException(404, { errors: { article: ['not found'] } });
  }

  if (existingArticle.author.id !== id) {
    throw new HttpException(403, {
      errors: { authorization: ['You are not authorized to update this article'] },
    });
  }

  if (article.title) {
    newSlug = `${slugify(article.title)}-${id}`;

    if (newSlug !== slug) {
      const existingTitle = await prisma.article.findFirst({
        where: {
          slug: newSlug,
        },
        select: {
          slug: true,
        },
      });

      if (existingTitle) {
        throw new HttpException(422, { errors: { title: ['must be unique'] } });
      }
    }
  }

  // Only touch tags when the request actually included a tagList — otherwise
  // an update that only changes e.g. the title would silently wipe them.
  const tagListProvided = 'tagList' in article;
  const tagList =
    Array.isArray(article.tagList) && article.tagList.length
      ? article.tagList.map((tag: string) => ({
          create: { name: tag },
          where: { name: tag },
        }))
      : [];

  if (tagListProvided) {
    await disconnectArticlesTags(slug);
  }

  const updatedArticle = await prisma.article.update({
    where: {
      slug,
    },
    data: {
      ...(article.title ? { title: article.title } : {}),
      ...(article.body ? { body: article.body } : {}),
      ...(article.description ? { description: article.description } : {}),
      ...(newSlug ? { slug: newSlug } : {}),
      updatedAt: new Date(),
      ...(tagListProvided ? { tagList: { connectOrCreate: tagList } } : {}),
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

  return articleMapper(updatedArticle, id);
};

export const deleteArticle = async (slug: string, id: number) => {
  const existingArticle = await await prisma.article.findFirst({
    where: {
      slug,
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

  if (!existingArticle) {
    throw new HttpException(404, { errors: { article: ['not found'] } });
  }

  if (existingArticle.author.id !== id) {
    throw new HttpException(403, {
      errors: { authorization: ['You are not authorized to delete this article'] },
    });
  }
  await prisma.article.delete({
    where: {
      slug,
    },
  });
};
