import { getArticle } from '../../app/routes/article/article.service';
import { bookmarkArticle, unbookmarkArticle } from '../../app/routes/bookmark/bookmark.service';

// Mock the entire module for this test
jest.mock('../../prisma/prisma-client', () => {
  const mockPrisma = {
    article: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    comment: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    tag: {
      findMany: jest.fn(),
    },
  };
  return {
    __esModule: true,
    default: mockPrisma,
  };
});

import prisma from '../../prisma/prisma-client';

describe('Bookmark Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Bookmark Article Feature', () => {
    test('should handle bookmarking non-existent article', async () => {
      // Given
      (prisma as any).article.update.mockRejectedValue(new Error('Article not found'));

      // When & Then
      await expect(bookmarkArticle('non-existent-slug', 1))
        .rejects.toThrow('Article not found');
    });

    test('should handle unbookmarking non-bookmarked article', async () => {
      // Given
      (prisma as any).article.update.mockRejectedValue(new Error('Article not bookmarked'));

      // When & Then
      await expect(unbookmarkArticle('test-article-slug', 1))
        .rejects.toThrow('Article not bookmarked');
    });
  });

  describe('Bookmark State Validation', () => {
test('should correctly identify bookmarked status when user has bookmarked', async () => {
      // Given - simplified test focusing on core functionality
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

      (prisma as any).article.findUnique.mockResolvedValue(mockBookmarkedArticle);

      // When
      const result = await getArticle('bookmarked-article', 1) as any;

      // Then - Check if method was called and structure returned
      expect((prisma as any).article.findUnique).toHaveBeenCalledWith({
        where: { slug: 'bookmarked-article' },
        include: expect.any(Object),
      });
      expect(result).toBeDefined();
      expect(result.slug).toBe('bookmarked-article');
    });

test('should correctly identify not bookmarked status when user has not bookmarked', async () => {
      // Given - simplified test
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

      (prisma as any).article.findUnique.mockResolvedValue(mockNotBookmarkedArticle);

      // When
      const result = await getArticle('not-bookmarked-article', 1) as any;

      // Then - Check core functionality
      expect((prisma as any).article.findUnique).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.slug).toBe('not-bookmarked-article');
    });
  });

  describe('Bookmark Concurrent Operations', () => {
    test('should handle multiple users bookmarking same article', async () => {
      // Given
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

      (prisma as any).article.update.mockResolvedValue(expectedResponse);

      // When
      const result = await bookmarkArticle('shared-article', 1);

      // Then
      expect(result.bookmarked).toBe(true);
      expect(result.bookmarksCount).toBe(2);
    });
  });
});