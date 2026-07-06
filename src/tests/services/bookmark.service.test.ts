jest.mock('../../prisma/prisma-client');

import prismaMock from '../prisma-mock';
import { bookmarkArticle, unbookmarkArticle } from '../../app/routes/bookmark/bookmark.service';

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

describe('BookmarkService', () => {
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
