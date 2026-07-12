jest.mock('../../prisma/prisma-client');

import prismaMock from '../prisma-mock';
import { mappedAuthor, mockedArticle } from '../fixtures/article.fixture';
import {
  createArticle,
  deleteArticle,
  getArticle,
  getArticles,
  getFeed,
  updateArticle,
} from '../../app/routes/article/article.service';

// Mirrors the `include` clause article.service.ts actually sends to Prisma for
// favorite-oriented queries (getArticles/getFeed/getArticle/createArticle/
// updateArticle). Asserting against this exactly (rather than
// expect.objectContaining) is what catches mutations inside the
// include/select object literals themselves.
const ARTICLE_INCLUDE = {
  tagList: { select: { name: true } },
  author: { select: { username: true, bio: true, image: true, followedBy: { select: { id: true } } } },
  favoritedBy: { select: { id: true } },
  _count: { select: { favoritedBy: true } },
};

describe('ArticleService', () => {
  describe('getArticles', () => {
    test('returns a mapped list of articles with the total count', async () => {
      prismaMock.article.count.mockResolvedValue(1);
      prismaMock.article.findMany.mockResolvedValue([mockedArticle]);

      const result = await getArticles({}, 1);

      expect(result.articlesCount).toBe(1);
      expect(result.articles).toEqual([
        {
          slug: mockedArticle.slug,
          title: mockedArticle.title,
          description: mockedArticle.description,
          body: mockedArticle.body,
          tagList: ['dragons'],
          createdAt: mockedArticle.createdAt,
          updatedAt: mockedArticle.updatedAt,
          favorited: false,
          favoritesCount: 0,
          author: mappedAuthor,
        },
      ]);
    });

    test('builds the exact Prisma where/order/pagination/include clause with all filters', async () => {
      prismaMock.article.count.mockResolvedValue(0);
      prismaMock.article.findMany.mockResolvedValue([]);

      await getArticles({ tag: 'dragons', author: 'RealWorld', favorited: 'RealWorld', offset: '5', limit: '2' }, 1);

      expect(prismaMock.article.count).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              author: {
                OR: [{ demo: { equals: true } }, { id: { equals: 1 } }],
                AND: [{ username: { equals: 'RealWorld' } }],
              },
            },
            { tagList: { some: { name: 'dragons' } } },
            { favoritedBy: { some: { username: { equals: 'RealWorld' } } } },
          ],
        },
      });
      expect(prismaMock.article.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              author: {
                OR: [{ demo: { equals: true } }, { id: { equals: 1 } }],
                AND: [{ username: { equals: 'RealWorld' } }],
              },
            },
            { tagList: { some: { name: 'dragons' } } },
            { favoritedBy: { some: { username: { equals: 'RealWorld' } } } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        skip: 5,
        take: 2,
        include: ARTICLE_INCLUDE,
      });
    });

    test('defaults to skip 0 / take 10 and only the demo OR clause when no filters or id are given', async () => {
      prismaMock.article.count.mockResolvedValue(0);
      prismaMock.article.findMany.mockResolvedValue([]);

      await getArticles({});

      expect(prismaMock.article.findMany).toHaveBeenCalledWith({
        where: { AND: [{ author: { OR: [{ demo: { equals: true } }], AND: [] } }] },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
        include: ARTICLE_INCLUDE,
      });
    });
  });

  describe('getFeed', () => {
    test('returns a mapped list of articles with the total count', async () => {
      prismaMock.article.count.mockResolvedValue(1);
      prismaMock.article.findMany.mockResolvedValue([mockedArticle]);

      const result = await getFeed(0, 10, 1);

      expect(result.articlesCount).toBe(1);
      expect(result.articles).toHaveLength(1);
      expect(result.articles[0]).toEqual(
        expect.objectContaining({ slug: mockedArticle.slug, tagList: ['dragons'] }),
      );
    });

    test('builds the exact Prisma where/order/pagination/include clause', async () => {
      prismaMock.article.count.mockResolvedValue(0);
      prismaMock.article.findMany.mockResolvedValue([]);

      await getFeed(3, 7, 1);

      const expectedWhere = { author: { followedBy: { some: { id: 1 } } } };
      expect(prismaMock.article.count).toHaveBeenCalledWith({ where: expectedWhere });
      expect(prismaMock.article.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        orderBy: { createdAt: 'desc' },
        skip: 3,
        take: 7,
        include: ARTICLE_INCLUDE,
      });
    });

    test('defaults to skip 0 / take 10 when offset/limit are falsy', async () => {
      prismaMock.article.count.mockResolvedValue(0);
      prismaMock.article.findMany.mockResolvedValue([]);

      await getFeed(0, 0, 1);

      expect(prismaMock.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });
  });

  describe('createArticle', () => {
    const validArticle = { title: 'How to train your dragon', description: 'desc', body: 'body', tagList: ['dragons'] };

    test('creates and returns the mapped article with the exact Prisma create payload', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);
      prismaMock.article.create.mockResolvedValue(mockedArticle);

      const result = await createArticle(validArticle, 456);

      expect(prismaMock.article.findUnique).toHaveBeenCalledWith({
        where: { slug: 'How-to-train-your-dragon-456' },
        select: { slug: true },
      });
      expect(prismaMock.article.create).toHaveBeenCalledWith({
        data: {
          title: 'How to train your dragon',
          description: 'desc',
          body: 'body',
          slug: 'How-to-train-your-dragon-456',
          tagList: {
            connectOrCreate: [{ create: { name: 'dragons' }, where: { name: 'dragons' } }],
          },
          author: { connect: { id: 456 } },
        },
        include: ARTICLE_INCLUDE,
      });
      expect(result).toEqual({
        slug: mockedArticle.slug,
        title: mockedArticle.title,
        description: mockedArticle.description,
        body: mockedArticle.body,
        tagList: ['dragons'],
        createdAt: mockedArticle.createdAt,
        updatedAt: mockedArticle.updatedAt,
        favorited: false,
        favoritesCount: 0,
        author: mappedAuthor,
      });
    });

    test('defaults tagList to an empty array when it is not an array', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);
      prismaMock.article.create.mockResolvedValue(mockedArticle);

      await createArticle({ ...validArticle, tagList: 'not-an-array' }, 456);

      expect(prismaMock.article.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tagList: { connectOrCreate: [] } }) }),
      );
    });

    test('throws when title is missing', async () => {
      await expect(createArticle({ ...validArticle, title: undefined }, 456)).rejects.toMatchObject({
        errorCode: 422,
        message: { errors: { title: ["can't be blank"] } },
      });
    });

    test('throws when description is missing', async () => {
      await expect(createArticle({ ...validArticle, description: undefined }, 456)).rejects.toMatchObject({
        errorCode: 422,
        message: { errors: { description: ["can't be blank"] } },
      });
    });

    test('throws when body is missing', async () => {
      await expect(createArticle({ ...validArticle, body: undefined }, 456)).rejects.toMatchObject({
        errorCode: 422,
        message: { errors: { body: ["can't be blank"] } },
      });
    });

    test('throws when the generated slug already exists', async () => {
      prismaMock.article.findUnique.mockResolvedValue({ slug: mockedArticle.slug } as any);

      await expect(createArticle(validArticle, 456)).rejects.toMatchObject({
        errorCode: 422,
        message: { errors: { title: ['must be unique'] } },
      });
      expect(prismaMock.article.create).not.toHaveBeenCalled();
    });
  });

  describe('getArticle', () => {
    test('returns the mapped article when found, with the exact Prisma query', async () => {
      prismaMock.article.findUnique.mockResolvedValue(mockedArticle);

      const result = await getArticle(mockedArticle.slug, 1);

      expect(prismaMock.article.findUnique).toHaveBeenCalledWith({
        where: { slug: mockedArticle.slug },
        include: ARTICLE_INCLUDE,
      });
      expect(result).toEqual({
        slug: mockedArticle.slug,
        title: mockedArticle.title,
        description: mockedArticle.description,
        body: mockedArticle.body,
        tagList: ['dragons'],
        createdAt: mockedArticle.createdAt,
        updatedAt: mockedArticle.updatedAt,
        favorited: false,
        favoritesCount: 0,
        author: mappedAuthor,
      });
    });

    test('throws a 404 when the article does not exist', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);

      await expect(getArticle('missing-slug')).rejects.toMatchObject({
        errorCode: 404,
        message: { errors: { article: ['not found'] } },
      });
    });
  });

  describe('updateArticle', () => {
    test('updates and returns the mapped article when the current user is the author', async () => {
      prismaMock.article.findFirst
        .mockResolvedValueOnce({ author: { id: 456, username: 'RealWorld' } } as any)
        .mockResolvedValueOnce(null);
      prismaMock.article.update.mockResolvedValue(mockedArticle);

      const result = await updateArticle(
        { title: 'A different title', body: 'new body', description: 'new desc', tagList: ['dragons', 'training'] },
        mockedArticle.slug,
        456,
      );

      expect(prismaMock.article.findFirst).toHaveBeenNthCalledWith(1, {
        where: { slug: mockedArticle.slug },
        select: { author: { select: { id: true, username: true } } },
      });
      expect(prismaMock.article.update).toHaveBeenCalledWith({
        where: { slug: mockedArticle.slug },
        data: {
          title: 'A different title',
          body: 'new body',
          description: 'new desc',
          slug: 'A-different-title-456',
          tagList: {
            connectOrCreate: [
              { create: { name: 'dragons' }, where: { name: 'dragons' } },
              { create: { name: 'training' }, where: { name: 'training' } },
            ],
          },
        },
        include: ARTICLE_INCLUDE,
      });
      expect(result).toEqual(
        expect.objectContaining({ slug: mockedArticle.slug, tagList: ['dragons'] }),
      );
    });

    test('disconnects existing tags before reconnecting the new ones, when tagList is provided', async () => {
      prismaMock.article.findFirst
        .mockResolvedValueOnce({ author: { id: 456, username: 'RealWorld' } } as any)
        .mockResolvedValueOnce(null);
      prismaMock.article.update.mockResolvedValue(mockedArticle);

      await updateArticle({ title: 'New title', tagList: ['newtag'] }, mockedArticle.slug, 456);

      expect(prismaMock.article.update).toHaveBeenNthCalledWith(1, {
        where: { slug: mockedArticle.slug },
        data: { tagList: { set: [] } },
      });
      expect(prismaMock.article.update).toHaveBeenNthCalledWith(2, {
        where: { slug: mockedArticle.slug },
        data: {
          title: 'New title',
          slug: 'New-title-456',
          tagList: { connectOrCreate: [{ create: { name: 'newtag' }, where: { name: 'newtag' } }] },
        },
        include: ARTICLE_INCLUDE,
      });
    });

    test('does not touch tags at all when tagList is not provided (regression: used to silently wipe them)', async () => {
      prismaMock.article.findFirst.mockResolvedValueOnce({ author: { id: 456, username: 'RealWorld' } } as any);
      prismaMock.article.update.mockResolvedValue(mockedArticle);

      await updateArticle({ body: 'only the body changes' }, mockedArticle.slug, 456);

      expect(prismaMock.article.update).toHaveBeenCalledTimes(1);
      expect(prismaMock.article.update).toHaveBeenCalledWith({
        where: { slug: mockedArticle.slug },
        data: {
          body: 'only the body changes',
        },
        include: ARTICLE_INCLUDE,
      });
    });

    test('throws a 404 when the article does not exist', async () => {
      prismaMock.article.findFirst.mockResolvedValue(null);

      await expect(updateArticle({}, 'missing-slug', 456)).rejects.toMatchObject({
        errorCode: 404,
        message: { errors: { article: ['not found'] } },
      });
      expect(prismaMock.article.update).not.toHaveBeenCalled();
    });

    test('throws a 403 when the current user is not the author', async () => {
      prismaMock.article.findFirst.mockResolvedValue({ author: { id: 999, username: 'someone-else' } } as any);

      await expect(updateArticle({}, mockedArticle.slug, 456)).rejects.toMatchObject({
        errorCode: 403,
        message: { errors: { authorization: ['You are not authorized to update this article'] } },
      });
      expect(prismaMock.article.update).not.toHaveBeenCalled();
    });

    test('throws when the new title slug collides with an existing article', async () => {
      prismaMock.article.findFirst
        .mockResolvedValueOnce({ author: { id: 456, username: 'RealWorld' } } as any)
        .mockResolvedValueOnce({ slug: 'a-different-title-456' } as any);

      await expect(
        updateArticle({ title: 'A different title' }, mockedArticle.slug, 456),
      ).rejects.toMatchObject({ errorCode: 422, message: { errors: { title: ['must be unique'] } } });
      expect(prismaMock.article.findFirst).toHaveBeenNthCalledWith(2, {
        where: { slug: 'A-different-title-456' },
        select: { slug: true },
      });
      expect(prismaMock.article.update).not.toHaveBeenCalled();
    });

    test('treats a non-array tagList with a truthy .length as no tags to connect', async () => {
      prismaMock.article.findFirst.mockResolvedValueOnce({ author: { id: 456, username: 'RealWorld' } } as any);
      prismaMock.article.update.mockResolvedValue(mockedArticle);

      await updateArticle({ tagList: 'dragons' }, mockedArticle.slug, 456);

      expect(prismaMock.article.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tagList: { connectOrCreate: [] } }) }),
      );
    });

    test('does not check for a slug collision when the title does not actually change the slug', async () => {
      // mockedArticle.slug is "how-to-train-your-dragon-1" — using id 1 here (instead of the
      // usual 456) makes the title-derived slug come out identical to the existing one.
      prismaMock.article.findFirst.mockResolvedValueOnce({ author: { id: 1, username: 'RealWorld' } } as any);
      prismaMock.article.update.mockResolvedValue(mockedArticle);

      await updateArticle({ title: 'how to train your dragon' }, mockedArticle.slug, 1);

      // findFirst should only have been called once (the authorization check), not for uniqueness
      expect(prismaMock.article.findFirst).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteArticle', () => {
    test('deletes the article when the current user is the author', async () => {
      prismaMock.article.findFirst.mockResolvedValue({ author: { id: 456, username: 'RealWorld' } } as any);

      await expect(deleteArticle(mockedArticle.slug, 456)).resolves.toBeUndefined();
      expect(prismaMock.article.findFirst).toHaveBeenCalledWith({
        where: { slug: mockedArticle.slug },
        select: { author: { select: { id: true, username: true } } },
      });
      expect(prismaMock.article.delete).toHaveBeenCalledWith({ where: { slug: mockedArticle.slug } });
    });

    test('throws a 404 when the article does not exist', async () => {
      prismaMock.article.findFirst.mockResolvedValue(null);

      await expect(deleteArticle('missing-slug', 456)).rejects.toMatchObject({
        errorCode: 404,
        message: { errors: { article: ['not found'] } },
      });
      expect(prismaMock.article.delete).not.toHaveBeenCalled();
    });

    test('throws a 403 when the current user is not the author', async () => {
      prismaMock.article.findFirst.mockResolvedValue({ author: { id: 999, username: 'someone-else' } } as any);

      await expect(deleteArticle(mockedArticle.slug, 456)).rejects.toMatchObject({
        errorCode: 403,
        message: { errors: { authorization: ['You are not authorized to delete this article'] } },
      });
      expect(prismaMock.article.delete).not.toHaveBeenCalled();
    });
  });
});
