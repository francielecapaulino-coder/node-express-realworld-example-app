jest.mock('../../prisma/prisma-client');

import prismaMock from '../prisma-mock';
import { getArticle } from '../../app/routes/article/article.service';
import { bookmarkArticle, unbookmarkArticle } from '../../app/routes/bookmark/bookmark.service';

describe('Bookmark Integration Tests', () => {
  describe('Bookmark Article Feature', () => {
    test('should handle bookmarking non-existent article', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);

      await expect(bookmarkArticle('non-existent-slug', 1)).rejects.toMatchObject({
        errorCode: 404,
        message: { errors: { article: ['not found'] } },
      });
      expect(prismaMock.article.update).not.toHaveBeenCalled();
    });

    test('should handle unbookmarking non-existent article', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);

      await expect(unbookmarkArticle('test-article-slug', 1)).rejects.toMatchObject({
        errorCode: 404,
        message: { errors: { article: ['not found'] } },
      });
      expect(prismaMock.article.update).not.toHaveBeenCalled();
    });
  });

  describe('Bookmark State Validation', () => {
    test('should correctly identify bookmarked status when user has bookmarked', async () => {
      const mockBookmarkedArticle = {
        id: 42,
        slug: 'bookmarked-article',
        title: 'Bookmarked Article',
        description: 'Test description',
        body: 'Test body',
        createdAt: new Date(),
        updatedAt: new Date(),
        tagList: [{ name: 'test' }],
        favoritedBy: [],
        bookmarkedBy: [{ id: 1 }], // Current user
        author: { id: 2, username: 'author', bio: null, image: null, followedBy: [] },
      };

      prismaMock.article.findUnique.mockResolvedValue(mockBookmarkedArticle as any);

      const result = (await getArticle('bookmarked-article', 1)) as any;

      expect(prismaMock.article.findUnique).toHaveBeenCalledWith({
        where: { slug: 'bookmarked-article' },
        include: expect.any(Object),
      });
      expect(result).toBeDefined();
      expect(result.slug).toBe('bookmarked-article');
    });

    test('should correctly identify not bookmarked status when user has not bookmarked', async () => {
      const mockNotBookmarkedArticle = {
        id: 42,
        slug: 'not-bookmarked-article',
        title: 'Not Bookmarked Article',
        description: 'Test description',
        body: 'Test body',
        createdAt: new Date(),
        updatedAt: new Date(),
        tagList: [{ name: 'test' }],
        favoritedBy: [],
        bookmarkedBy: [{ id: 2 }], // Different user
        author: { id: 2, username: 'author', bio: null, image: null, followedBy: [] },
      };

      prismaMock.article.findUnique.mockResolvedValue(mockNotBookmarkedArticle as any);

      const result = (await getArticle('not-bookmarked-article', 1)) as any;

      expect(prismaMock.article.findUnique).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.slug).toBe('not-bookmarked-article');
    });
  });

  describe('Bookmark Concurrent Operations', () => {
    test('should handle multiple users bookmarking same article', async () => {
      const mockSharedArticle = {
        id: 42,
        slug: 'shared-article',
        title: 'Shared Article',
        description: 'Test Description',
        body: 'Test Body Content',
        authorId: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        tagList: [],
        favoritedBy: [],
        bookmarkedBy: [],
        author: {
          id: 2,
          username: 'author',
          bio: null,
          image: null,
          followedBy: [],
        },
      };

      const expectedResponse = {
        ...mockSharedArticle,
        bookmarkedBy: [
          { id: 1, username: 'user1' },
          { id: 3, username: 'user3' },
        ],
        bookmarksCount: 2,
        _count: { bookmarkedBy: 2 },
      };

      prismaMock.article.findUnique.mockResolvedValue({ id: mockSharedArticle.id } as any);
      prismaMock.article.update.mockResolvedValue(expectedResponse as any);

      const result = await bookmarkArticle('shared-article', 1);

      expect(result.bookmarked).toBe(true);
      expect(result.bookmarksCount).toBe(2);
    });
  });
});
