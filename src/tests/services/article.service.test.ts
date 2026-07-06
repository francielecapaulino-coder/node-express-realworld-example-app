jest.mock('../../prisma/prisma-client');

import prismaMock from '../prisma-mock';
import {
  addComment,
  bookmarkArticle,
  createArticle,
  deleteArticle,
  deleteComment,
  favoriteArticle,
  getArticle,
  getArticles,
  getCommentsByArticle,
  getFeed,
  unbookmarkArticle,
  unfavoriteArticle,
  updateArticle,
} from '../../app/routes/article/article.service';

// Mirrors the `include` clause article.service.ts actually sends to Prisma for
// favorite-oriented queries (getArticles/getFeed/getArticle/createArticle/
// updateArticle/favoriteArticle/unfavoriteArticle). Asserting against this
// exactly (rather than expect.objectContaining) is what catches mutations
// inside the include/select object literals themselves.
const ARTICLE_INCLUDE = {
  tagList: { select: { name: true } },
  author: { select: { username: true, bio: true, image: true, followedBy: true } },
  favoritedBy: true,
  _count: { select: { favoritedBy: true } },
};

// bookmarkArticle/unbookmarkArticle use the same shape but for bookmarks.
const BOOKMARK_INCLUDE = {
  tagList: { select: { name: true } },
  author: { select: { username: true, bio: true, image: true, followedBy: true } },
  bookmarkedBy: true,
  _count: { select: { bookmarkedBy: true } },
};

const mockedArticle = {
  id: 123,
  slug: 'how-to-train-your-dragon-1',
  title: 'How to train your dragon',
  description: 'desc',
  body: 'body',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-02T00:00:00.000Z'),
  authorId: 456,
  tagList: [{ name: 'dragons' }],
  favoritedBy: [],
  bookmarkedBy: [],
  _count: { favoritedBy: 0, bookmarkedBy: 0 },
  author: {
    username: 'RealWorld',
    bio: null,
    image: null,
    followedBy: [],
  },
};

const mappedAuthor = { username: 'RealWorld', bio: null, image: null, following: false };

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
          updatedAt: expect.any(Date),
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

    test('disconnects existing tags before reconnecting the new ones', async () => {
      prismaMock.article.findFirst
        .mockResolvedValueOnce({ author: { id: 456, username: 'RealWorld' } } as any)
        .mockResolvedValueOnce(null);
      prismaMock.article.update.mockResolvedValue(mockedArticle);

      await updateArticle({ title: 'New title' }, mockedArticle.slug, 456);

      expect(prismaMock.article.update).toHaveBeenNthCalledWith(1, {
        where: { slug: mockedArticle.slug },
        data: { tagList: { set: [] } },
      });
    });

    test('does not touch the slug or tagList when neither title nor tagList are provided', async () => {
      prismaMock.article.findFirst.mockResolvedValueOnce({ author: { id: 456, username: 'RealWorld' } } as any);
      prismaMock.article.update.mockResolvedValue(mockedArticle);

      await updateArticle({ body: 'only the body changes' }, mockedArticle.slug, 456);

      expect(prismaMock.article.update).toHaveBeenNthCalledWith(2, {
        where: { slug: mockedArticle.slug },
        data: {
          body: 'only the body changes',
          updatedAt: expect.any(Date),
          tagList: { connectOrCreate: [] },
        },
        include: ARTICLE_INCLUDE,
      });
    });

    test('throws a 404 when the article does not exist', async () => {
      prismaMock.article.findFirst.mockResolvedValue(null);

      await expect(updateArticle({}, 'missing-slug', 456)).rejects.toMatchObject({ errorCode: 404 });
      expect(prismaMock.article.update).not.toHaveBeenCalled();
    });

    test('throws a 403 when the current user is not the author', async () => {
      prismaMock.article.findFirst.mockResolvedValue({ author: { id: 999, username: 'someone-else' } } as any);

      await expect(updateArticle({}, mockedArticle.slug, 456)).rejects.toMatchObject({
        errorCode: 403,
        message: { message: 'You are not authorized to update this article' },
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

      await expect(deleteArticle('missing-slug', 456)).rejects.toMatchObject({ errorCode: 404 });
      expect(prismaMock.article.delete).not.toHaveBeenCalled();
    });

    test('throws a 403 when the current user is not the author', async () => {
      prismaMock.article.findFirst.mockResolvedValue({ author: { id: 999, username: 'someone-else' } } as any);

      await expect(deleteArticle(mockedArticle.slug, 456)).rejects.toMatchObject({
        errorCode: 403,
        message: { message: 'You are not authorized to delete this article' },
      });
      expect(prismaMock.article.delete).not.toHaveBeenCalled();
    });
  });

  describe('getCommentsByArticle', () => {
    const commentFixture = {
      id: 1,
      createdAt: new Date('2024-01-03T00:00:00.000Z'),
      updatedAt: new Date('2024-01-04T00:00:00.000Z'),
      body: 'nice article',
      author: { username: 'RealWorld', bio: null, image: null, followedBy: [{ id: 1 }] },
    };

    test('returns the mapped list of comments, with the exact Prisma query, when a user id is given', async () => {
      prismaMock.article.findUnique.mockResolvedValue({ comments: [commentFixture] } as any);

      const result = await getCommentsByArticle(mockedArticle.slug, 1);

      expect(prismaMock.article.findUnique).toHaveBeenCalledWith({
        where: { slug: mockedArticle.slug },
        include: {
          comments: {
            where: { OR: [{ author: { demo: true } }, { author: { id: 1 } }] },
            select: {
              id: true,
              createdAt: true,
              updatedAt: true,
              body: true,
              author: { select: { username: true, bio: true, image: true, followedBy: true } },
            },
          },
        },
      });
      expect(result).toEqual([
        {
          id: 1,
          createdAt: commentFixture.createdAt,
          updatedAt: commentFixture.updatedAt,
          body: 'nice article',
          author: { username: 'RealWorld', bio: null, image: null, following: true },
        },
      ]);
    });

    test('only filters by demo authors when no user id is given', async () => {
      prismaMock.article.findUnique.mockResolvedValue({ comments: [] } as any);

      await getCommentsByArticle(mockedArticle.slug);

      expect(prismaMock.article.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            comments: expect.objectContaining({ where: { OR: [{ author: { demo: true } }] } }),
          }),
        }),
      );
    });

    test('returns undefined without throwing when the article does not exist', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);

      const result = await getCommentsByArticle('missing-slug');

      expect(result).toBeUndefined();
    });

    test('following is false when the current user is not in the comment author followedBy list', async () => {
      prismaMock.article.findUnique.mockResolvedValue({
        comments: [{ ...commentFixture, author: { ...commentFixture.author, followedBy: [{ id: 99 }] } }],
      } as any);

      const result = await getCommentsByArticle(mockedArticle.slug, 1);

      expect(result![0].author.following).toBe(false);
    });

    test('following is true via .some even when only one followedBy entry matches the given user id', async () => {
      prismaMock.article.findUnique.mockResolvedValue({
        comments: [{ ...commentFixture, author: { ...commentFixture.author, followedBy: [{ id: 99 }, { id: 1 }] } }],
      } as any);

      const result = await getCommentsByArticle(mockedArticle.slug, 1);

      expect(result![0].author.following).toBe(true);
    });
  });

  describe('addComment', () => {
    test('creates and returns the mapped comment, connecting the right article and author', async () => {
      prismaMock.article.findUnique.mockResolvedValue({ id: mockedArticle.id } as any);
      prismaMock.comment.create.mockResolvedValue({
        id: 1,
        createdAt: new Date('2024-01-03T00:00:00.000Z'),
        updatedAt: new Date('2024-01-04T00:00:00.000Z'),
        body: 'nice article',
        author: { username: 'RealWorld', bio: null, image: null, followedBy: [] },
      } as any);

      const result = await addComment('nice article', mockedArticle.slug, 456);

      expect(prismaMock.article.findUnique).toHaveBeenCalledWith({
        where: { slug: mockedArticle.slug },
        select: { id: true },
      });
      expect(prismaMock.comment.create).toHaveBeenCalledWith({
        data: {
          body: 'nice article',
          article: { connect: { id: mockedArticle.id } },
          author: { connect: { id: 456 } },
        },
        include: {
          author: { select: { username: true, bio: true, image: true, followedBy: true } },
        },
      });
      expect(result).toEqual({
        id: 1,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        body: 'nice article',
        author: { username: 'RealWorld', bio: null, image: null, following: false },
      });
    });

    test('throws when the comment body is blank', async () => {
      await expect(addComment('', mockedArticle.slug, 456)).rejects.toMatchObject({
        errorCode: 422,
        message: { errors: { body: ["can't be blank"] } },
      });
      expect(prismaMock.comment.create).not.toHaveBeenCalled();
    });

    test('connects the comment to an undefined article id when the article lookup returns nothing', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);
      prismaMock.comment.create.mockResolvedValue({
        id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        body: 'nice article',
        author: { username: 'RealWorld', bio: null, image: null, followedBy: [] },
      } as any);

      await addComment('nice article', 'missing-slug', 456);

      expect(prismaMock.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ article: { connect: { id: undefined } } }) }),
      );
    });

    test('marks following true when the current user is in the comment author followedBy list', async () => {
      prismaMock.article.findUnique.mockResolvedValue({ id: mockedArticle.id } as any);
      prismaMock.comment.create.mockResolvedValue({
        id: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        body: 'nice article',
        author: { username: 'RealWorld', bio: null, image: null, followedBy: [{ id: 456 }] },
      } as any);

      const result = await addComment('nice article', mockedArticle.slug, 456);

      expect(result.author.following).toBe(true);
    });
  });

  describe('deleteComment', () => {
    test('deletes the comment when the current user is the author', async () => {
      prismaMock.comment.findFirst.mockResolvedValue({ author: { id: 456, username: 'RealWorld' } } as any);

      await expect(deleteComment(1, 456)).resolves.toBeUndefined();
      expect(prismaMock.comment.findFirst).toHaveBeenCalledWith({
        where: { id: 1, author: { id: 456 } },
        select: { author: { select: { id: true, username: true } } },
      });
      expect(prismaMock.comment.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    test('throws a 404 when the comment does not exist', async () => {
      prismaMock.comment.findFirst.mockResolvedValue(null);

      await expect(deleteComment(123, 456)).rejects.toMatchObject({ errorCode: 404 });
      expect(prismaMock.comment.delete).not.toHaveBeenCalled();
    });

    test('throws a 403 when the current user is not the comment author', async () => {
      prismaMock.comment.findFirst.mockResolvedValue({ author: { id: 999, username: 'someone-else' } } as any);

      await expect(deleteComment(1, 456)).rejects.toMatchObject({
        errorCode: 403,
        message: { message: 'You are not authorized to delete this comment' },
      });
      expect(prismaMock.comment.delete).not.toHaveBeenCalled();
    });
  });

  describe('favoriteArticle', () => {
    test('connects the current user and returns the mapped, favorited article', async () => {
      prismaMock.article.update.mockResolvedValue(mockedArticle as any);

      const result = await favoriteArticle(mockedArticle.slug, 1);

      expect(prismaMock.article.update).toHaveBeenCalledWith({
        where: { slug: mockedArticle.slug },
        data: { favoritedBy: { connect: { id: 1 } } },
        include: ARTICLE_INCLUDE,
      });
      expect(result).toEqual({
        id: mockedArticle.id,
        slug: mockedArticle.slug,
        title: mockedArticle.title,
        description: mockedArticle.description,
        body: mockedArticle.body,
        createdAt: mockedArticle.createdAt,
        updatedAt: mockedArticle.updatedAt,
        authorId: mockedArticle.authorId,
        favoritedBy: [],
        bookmarkedBy: [],
        author: mappedAuthor,
        tagList: ['dragons'],
        favorited: false,
        favoritesCount: 0,
      });
    });

    test('favorited is true when the current user is already in favoritedBy', async () => {
      prismaMock.article.update.mockResolvedValue({ ...mockedArticle, favoritedBy: [{ id: 1 }] } as any);

      const result = await favoriteArticle(mockedArticle.slug, 1);

      expect(result).toHaveProperty('favorited', true);
    });

    test('favorited is false when the current user is not in favoritedBy', async () => {
      prismaMock.article.update.mockResolvedValue({ ...mockedArticle, favoritedBy: [{ id: 999 }] } as any);

      const result = await favoriteArticle(mockedArticle.slug, 1);

      expect(result).toHaveProperty('favorited', false);
    });
  });

  describe('unfavoriteArticle', () => {
    test('disconnects the current user and returns the mapped, unfavorited article', async () => {
      prismaMock.article.update.mockResolvedValue(mockedArticle as any);

      const result = await unfavoriteArticle(mockedArticle.slug, 1);

      expect(prismaMock.article.update).toHaveBeenCalledWith({
        where: { slug: mockedArticle.slug },
        data: { favoritedBy: { disconnect: { id: 1 } } },
        include: ARTICLE_INCLUDE,
      });
      expect(result).toHaveProperty('favorited', false);
      expect(result).toHaveProperty('favoritesCount', 0);
      expect(result).toHaveProperty('tagList', ['dragons']);
    });

    test('favorited is true if favoritedBy still includes the user id after disconnecting', async () => {
      prismaMock.article.update.mockResolvedValue({ ...mockedArticle, favoritedBy: [{ id: 1 }] } as any);

      const result = await unfavoriteArticle(mockedArticle.slug, 1);

      expect(result).toHaveProperty('favorited', true);
    });
  });

  describe('bookmarkArticle', () => {
    test('connects the current user and returns the mapped, bookmarked article', async () => {
      prismaMock.article.update.mockResolvedValue(mockedArticle as any);

      const result = await bookmarkArticle(mockedArticle.slug, 1);

      expect(prismaMock.article.update).toHaveBeenCalledWith({
        where: { slug: mockedArticle.slug },
        data: { bookmarkedBy: { connect: { id: 1 } } },
        include: BOOKMARK_INCLUDE,
      });
      expect(result).toEqual({
        id: mockedArticle.id,
        slug: mockedArticle.slug,
        title: mockedArticle.title,
        description: mockedArticle.description,
        body: mockedArticle.body,
        createdAt: mockedArticle.createdAt,
        updatedAt: mockedArticle.updatedAt,
        authorId: mockedArticle.authorId,
        favoritedBy: [],
        bookmarkedBy: [],
        author: mappedAuthor,
        tagList: ['dragons'],
        bookmarked: false,
        bookmarksCount: 0,
      });
    });

    test('bookmarked is true when the current user is already in bookmarkedBy', async () => {
      prismaMock.article.update.mockResolvedValue({ ...mockedArticle, bookmarkedBy: [{ id: 1 }] } as any);

      const result = await bookmarkArticle(mockedArticle.slug, 1);

      expect(result).toHaveProperty('bookmarked', true);
    });

    test('bookmarked is false when the current user is not in bookmarkedBy', async () => {
      prismaMock.article.update.mockResolvedValue({ ...mockedArticle, bookmarkedBy: [{ id: 999 }] } as any);

      const result = await bookmarkArticle(mockedArticle.slug, 1);

      expect(result).toHaveProperty('bookmarked', false);
    });
  });

  describe('unbookmarkArticle', () => {
    test('disconnects the current user and returns the mapped, unbookmarked article', async () => {
      prismaMock.article.update.mockResolvedValue(mockedArticle as any);

      const result = await unbookmarkArticle(mockedArticle.slug, 1);

      expect(prismaMock.article.update).toHaveBeenCalledWith({
        where: { slug: mockedArticle.slug },
        data: { bookmarkedBy: { disconnect: { id: 1 } } },
        include: BOOKMARK_INCLUDE,
      });
      expect(result).toHaveProperty('bookmarked', false);
      expect(result).toHaveProperty('bookmarksCount', 0);
      expect(result).toHaveProperty('tagList', ['dragons']);
    });

    test('bookmarked is true if bookmarkedBy still includes the user id after disconnecting', async () => {
      prismaMock.article.update.mockResolvedValue({ ...mockedArticle, bookmarkedBy: [{ id: 1 }] } as any);

      const result = await unbookmarkArticle(mockedArticle.slug, 1);

      expect(result).toHaveProperty('bookmarked', true);
    });
  });
});
