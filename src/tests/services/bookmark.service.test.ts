jest.mock('../../prisma/prisma-client');

import prismaMock from '../prisma-mock';
import { mappedAuthor, mockedArticle } from '../fixtures/article.fixture';
import { bookmarkArticle, unbookmarkArticle } from '../../app/routes/bookmark/bookmark.service';

const BOOKMARK_INCLUDE = {
  tagList: { select: { name: true } },
  author: { select: { username: true, bio: true, image: true, followedBy: { select: { id: true } } } },
  bookmarkedBy: { select: { id: true } },
  _count: { select: { bookmarkedBy: true } },
};

const mappedArticleFields = {
  slug: mockedArticle.slug,
  title: mockedArticle.title,
  description: mockedArticle.description,
  body: mockedArticle.body,
  createdAt: mockedArticle.createdAt,
  updatedAt: mockedArticle.updatedAt,
  author: mappedAuthor,
  tagList: ['dragons'],
};

describe('BookmarkService', () => {
  beforeEach(() => {
    prismaMock.article.findUnique.mockResolvedValue({ id: mockedArticle.id } as any);
  });

  describe('bookmarkArticle', () => {
    test('throws a 404 when the article does not exist', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);

      await expect(bookmarkArticle('missing-slug', 1)).rejects.toMatchObject({
        errorCode: 404,
        message: { errors: { article: ['not found'] } },
      });
      expect(prismaMock.article.update).not.toHaveBeenCalled();
    });

    test('connects the current user and returns the mapped, bookmarked article', async () => {
      prismaMock.article.update.mockResolvedValue(mockedArticle as any);

      const result = await bookmarkArticle(mockedArticle.slug, 1);

      expect(prismaMock.article.findUnique).toHaveBeenCalledWith({
        where: { slug: mockedArticle.slug },
        select: { id: true },
      });
      expect(prismaMock.article.update).toHaveBeenCalledWith({
        where: { slug: mockedArticle.slug },
        data: { bookmarkedBy: { connect: { id: 1 } } },
        include: BOOKMARK_INCLUDE,
      });
      expect(result).toEqual({
        ...mappedArticleFields,
        bookmarked: false,
        bookmarksCount: 0,
      });
      expect(result).not.toHaveProperty('id');
      expect(result).not.toHaveProperty('authorId');
      expect(result).not.toHaveProperty('favoritedBy');
      expect(result).not.toHaveProperty('bookmarkedBy');
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
    test('throws a 404 when the article does not exist', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);

      await expect(unbookmarkArticle('missing-slug', 1)).rejects.toMatchObject({
        errorCode: 404,
        message: { errors: { article: ['not found'] } },
      });
      expect(prismaMock.article.update).not.toHaveBeenCalled();
    });

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
      expect(result).not.toHaveProperty('id');
      expect(result).not.toHaveProperty('authorId');
    });

    test('bookmarked is true if bookmarkedBy still includes the user id after disconnecting', async () => {
      prismaMock.article.update.mockResolvedValue({ ...mockedArticle, bookmarkedBy: [{ id: 1 }] } as any);

      const result = await unbookmarkArticle(mockedArticle.slug, 1);

      expect(result).toHaveProperty('bookmarked', true);
    });

    test('bookmarked is false when bookmarkedBy contains a different user id', async () => {
      prismaMock.article.update.mockResolvedValue({ ...mockedArticle, bookmarkedBy: [{ id: 999 }] } as any);

      const result = await unbookmarkArticle(mockedArticle.slug, 1);

      expect(result).toHaveProperty('bookmarked', false);
    });
  });
});
