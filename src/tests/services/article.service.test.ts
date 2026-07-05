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

const mockedArticle = {
  id: 123,
  slug: 'how-to-train-your-dragon-1',
  title: 'How to train your dragon',
  description: 'desc',
  body: 'body',
  createdAt: new Date(),
  updatedAt: new Date(),
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

describe('ArticleService', () => {
  describe('getArticles', () => {
    test('returns a mapped list of articles with the total count', async () => {
      // Given
      prismaMock.article.count.mockResolvedValue(1);
      prismaMock.article.findMany.mockResolvedValue([mockedArticle]);

      // When
      const result = await getArticles({}, 1);

      // Then
      expect(result.articlesCount).toBe(1);
      expect(result.articles).toHaveLength(1);
      expect(result.articles[0]).toHaveProperty('slug', mockedArticle.slug);
    });

    test('applies tag/author/favorited query filters without throwing', async () => {
      prismaMock.article.count.mockResolvedValue(0);
      prismaMock.article.findMany.mockResolvedValue([]);

      const result = await getArticles(
        { tag: 'dragons', author: 'RealWorld', favorited: 'RealWorld', offset: '5', limit: '2' },
        1,
      );

      expect(result.articlesCount).toBe(0);
      expect(result.articles).toEqual([]);
    });

    test('builds the exact Prisma where/order/pagination clause', async () => {
      prismaMock.article.count.mockResolvedValue(0);
      prismaMock.article.findMany.mockResolvedValue([]);

      await getArticles({ tag: 'dragons', author: 'RealWorld', favorited: 'RealWorld', offset: '5', limit: '2' }, 1);

      expect(prismaMock.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
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
        }),
      );
    });

    test('defaults to skip 0 / take 10 and only the demo OR clause when no filters or id are given', async () => {
      prismaMock.article.count.mockResolvedValue(0);
      prismaMock.article.findMany.mockResolvedValue([]);

      await getArticles({});

      expect(prismaMock.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ author: { OR: [{ demo: { equals: true } }], AND: [] } }] },
          skip: 0,
          take: 10,
        }),
      );
    });
  });

  describe('getFeed', () => {
    test('returns articles authored by users the current user follows', async () => {
      prismaMock.article.count.mockResolvedValue(1);
      prismaMock.article.findMany.mockResolvedValue([mockedArticle]);

      const result = await getFeed(0, 10, 1);

      expect(result.articlesCount).toBe(1);
      expect(result.articles).toHaveLength(1);
    });

    test('builds the exact Prisma where/order/pagination clause', async () => {
      prismaMock.article.count.mockResolvedValue(0);
      prismaMock.article.findMany.mockResolvedValue([]);

      await getFeed(3, 7, 1);

      const expectedWhere = { author: { followedBy: { some: { id: 1 } } } };
      expect(prismaMock.article.count).toHaveBeenCalledWith({ where: expectedWhere });
      expect(prismaMock.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expectedWhere,
          orderBy: { createdAt: 'desc' },
          skip: 3,
          take: 7,
        }),
      );
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

    test('creates and returns the mapped article', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);
      prismaMock.article.create.mockResolvedValue(mockedArticle);

      const result = await createArticle(validArticle, 456);

      expect(result).toHaveProperty('slug', mockedArticle.slug);
      expect(result).toHaveProperty('favoritesCount', 0);
    });

    test('throws when title is missing', async () => {
      await expect(createArticle({ ...validArticle, title: undefined }, 456)).rejects.toThrow();
    });

    test('throws when description is missing', async () => {
      await expect(createArticle({ ...validArticle, description: undefined }, 456)).rejects.toThrow();
    });

    test('throws when body is missing', async () => {
      await expect(createArticle({ ...validArticle, body: undefined }, 456)).rejects.toThrow();
    });

    test('throws when the generated slug already exists', async () => {
      prismaMock.article.findUnique.mockResolvedValue({ slug: mockedArticle.slug } as any);

      await expect(createArticle(validArticle, 456)).rejects.toThrow();
    });
  });

  describe('getArticle', () => {
    test('returns the mapped article when found', async () => {
      prismaMock.article.findUnique.mockResolvedValue(mockedArticle);

      const result = await getArticle(mockedArticle.slug, 1);

      expect(result).toHaveProperty('slug', mockedArticle.slug);
    });

    test('throws a 404 when the article does not exist', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);

      await expect(getArticle('missing-slug')).rejects.toThrow();
    });
  });

  describe('updateArticle', () => {
    test('updates and returns the mapped article when the current user is the author', async () => {
      prismaMock.article.findFirst
        .mockResolvedValueOnce({ author: { id: 456, username: 'RealWorld' } } as any)
        .mockResolvedValueOnce(null);
      prismaMock.article.update.mockResolvedValue(mockedArticle);

      const result = await updateArticle({ title: 'New title' }, mockedArticle.slug, 456);

      expect(result).toHaveProperty('slug', mockedArticle.slug);
    });

    test('throws a 404 when the article does not exist', async () => {
      prismaMock.article.findFirst.mockResolvedValue(null);

      await expect(updateArticle({}, 'missing-slug', 456)).rejects.toThrow();
    });

    test('throws a 403 when the current user is not the author', async () => {
      prismaMock.article.findFirst.mockResolvedValue({ author: { id: 999, username: 'someone-else' } } as any);

      await expect(updateArticle({}, mockedArticle.slug, 456)).rejects.toThrow();
    });

    test('throws when the new title slug collides with an existing article', async () => {
      prismaMock.article.findFirst
        .mockResolvedValueOnce({ author: { id: 456, username: 'RealWorld' } } as any)
        .mockResolvedValueOnce({ slug: 'a-different-title-456' } as any);

      await expect(
        updateArticle({ title: 'A different title' }, mockedArticle.slug, 456),
      ).rejects.toThrow();
    });
  });

  describe('deleteArticle', () => {
    test('deletes the article when the current user is the author', async () => {
      prismaMock.article.findFirst.mockResolvedValue({ author: { id: 456, username: 'RealWorld' } } as any);

      await expect(deleteArticle(mockedArticle.slug, 456)).resolves.toBeUndefined();
      expect(prismaMock.article.delete).toHaveBeenCalledWith({ where: { slug: mockedArticle.slug } });
    });

    test('throws a 404 when the article does not exist', async () => {
      prismaMock.article.findFirst.mockResolvedValue(null);

      await expect(deleteArticle('missing-slug', 456)).rejects.toThrow();
    });

    test('throws a 403 when the current user is not the author', async () => {
      prismaMock.article.findFirst.mockResolvedValue({ author: { id: 999, username: 'someone-else' } } as any);

      await expect(deleteArticle(mockedArticle.slug, 456)).rejects.toThrow();
    });
  });

  describe('getCommentsByArticle', () => {
    test('returns the mapped list of comments for an article', async () => {
      prismaMock.article.findUnique.mockResolvedValue({
        comments: [
          {
            id: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            body: 'nice article',
            author: { username: 'RealWorld', bio: null, image: null, followedBy: [] },
          },
        ],
      } as any);

      const result = await getCommentsByArticle(mockedArticle.slug, 1);

      expect(result).toHaveLength(1);
      expect(result![0]).toHaveProperty('body', 'nice article');
    });
  });

  describe('addComment', () => {
    test('creates and returns the mapped comment', async () => {
      prismaMock.article.findUnique.mockResolvedValue({ id: mockedArticle.id } as any);
      prismaMock.comment.create.mockResolvedValue({
        id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        body: 'nice article',
        author: { username: 'RealWorld', bio: null, image: null, followedBy: [] },
      } as any);

      const result = await addComment('nice article', mockedArticle.slug, 456);

      expect(result).toHaveProperty('body', 'nice article');
    });

    test('throws when the comment body is blank', async () => {
      await expect(addComment('', mockedArticle.slug, 456)).rejects.toThrow();
    });
  });

  describe('bookmarkArticle', () => {
    test('returns the bookmarked article', async () => {
      prismaMock.article.update.mockResolvedValue(mockedArticle as any);

      const result = await bookmarkArticle(mockedArticle.slug, 1);

      expect(result).toHaveProperty('bookmarksCount', 0);
      expect(result).toHaveProperty('bookmarked', false);
    });
  });

  describe('unbookmarkArticle', () => {
    test('returns the unbookmarked article', async () => {
      prismaMock.article.update.mockResolvedValue(mockedArticle as any);

      const result = await unbookmarkArticle(mockedArticle.slug, 1);

      expect(result).toHaveProperty('bookmarksCount', 0);
      expect(result).toHaveProperty('bookmarked', false);
    });
  });

  describe('deleteComment', () => {
    test('should throw an error ', () => {
      // Given
      const id = 123;
      const idUser = 456;

      // When
      prismaMock.comment.findFirst.mockResolvedValue(null);

      // Then
      expect(deleteComment(id, idUser)).rejects.toThrow();
    });
  });

  describe('favoriteArticle', () => {
    test('should return the favorited article', async () => {
      // Given
      const slug = 'How-to-train-your-dragon';
      const username = 'RealWorld';

      const mockedUserResponse = {
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        password: '1234',
        bio: null,
        image: null,
        token: '',
        demo: false,
      };

      const mockedArticleResponse = {
        id: 123,
        slug: 'How-to-train-your-dragon',
        title: 'How to train your dragon',
        description: '',
        body: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        authorId: 456,
        tagList: [],
        favoritedBy: [],
        author: {
          username: 'RealWorld',
          bio: null,
          image: null,
          followedBy: [],
        },
      };

      // When
      prismaMock.user.findUnique.mockResolvedValue(mockedUserResponse);
      prismaMock.article.update.mockResolvedValue(mockedArticleResponse);

      // Then
      await expect(favoriteArticle(slug, mockedUserResponse.id)).resolves.toHaveProperty(
        'favoritesCount',
      );
    });

    test('should throw an error if no user is found', async () => {
      // Given
      const id = 123;
      const slug = 'how-to-train-your-dragon';
      const username = 'RealWorld';

      // When
      prismaMock.user.findUnique.mockResolvedValue(null);

      // Then
      await expect(favoriteArticle(slug, id)).rejects.toThrow();
    });
  });
  describe('unfavoriteArticle', () => {
    test('should return the unfavorited article', async () => {
      // Given
      const slug = 'How-to-train-your-dragon';
      const username = 'RealWorld';

      const mockedUserResponse = {
        id: 123,
        username: 'RealWorld',
        email: 'realworld@me',
        password: '1234',
        bio: null,
        image: null,
        token: '',
        demo: false,
      };

      const mockedArticleResponse = {
        id: 123,
        slug: 'How-to-train-your-dragon',
        title: 'How to train your dragon',
        description: '',
        body: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        authorId: 456,
        tagList: [],
        favoritedBy: [],
        author: {
          username: 'RealWorld',
          bio: null,
          image: null,
          followedBy: [],
        },
      };

      // When
      prismaMock.user.findUnique.mockResolvedValue(mockedUserResponse);
      prismaMock.article.update.mockResolvedValue(mockedArticleResponse);

      // Then
      await expect(unfavoriteArticle(slug, mockedUserResponse.id)).resolves.toHaveProperty(
        'favoritesCount',
      );
    });

    test('should throw an error if no user is found', async () => {
      // Given
      const id = 123;
      const slug = 'how-to-train-your-dragon';
      const username = 'RealWorld';

      // When
      prismaMock.user.findUnique.mockResolvedValue(null);

      // Then
      await expect(unfavoriteArticle(slug, id)).rejects.toThrow();
    });
  });
});
