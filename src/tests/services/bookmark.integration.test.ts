import { bookmarkArticle, unbookmarkArticle, getArticle } from '../../app/routes/article/article.service';
import prismaMock, { mockReset } from '../prisma-mock';

describe('Bookmark Integration Tests', () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  describe('Bookmark Article Feature', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedPassword',
      bio: null,
      image: null,
    };

    const mockArticle = {
      id: 42,
      slug: 'test-article-slug',
      title: 'Test Article',
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

    test('should bookmark an article successfully', async () => {
      // Given
      const expectedResponse = {
        ...mockArticle,
        bookmarkedBy: [mockUser],
        bookmarked: true,
        bookmarksCount: 1,
        favorited: false,
        favoritesCount: 0,
        tagList: [],
        author: {
          ...mockArticle.author,
          following: false,
        },
        _count: {
          bookmarkedBy: 1,
          favoritedBy: 0,
        },
      };

      // @ts-ignore
      prismaMock.article.update.mockResolvedValue(expectedResponse);

      // When
      const result = await bookmarkArticle('test-article-slug', 1);

      // Then
      expect(prismaMock.article.update).toHaveBeenCalledWith({
        where: { slug: 'test-article-slug' },
        data: {
          bookmarkedBy: {
            connect: { id: 1 },
          },
        },
        include: expect.objectContaining({
          tagList: { select: { name: true } },
          author: expect.any(Object),
          bookmarkedBy: true,
          _count: { select: { bookmarkedBy: true } },
        }),
      });

      expect(result).toEqual(expect.objectContaining({
        slug: 'test-article-slug',
        bookmarked: true,
        bookmarksCount: 1,
      }));
    });

    test('should handle bookmarking non-existent article', async () => {
      // Given
      // @ts-ignore
      prismaMock.article.update.mockRejectedValue(new Error('Article not found'));

      // When & Then
      await expect(bookmarkArticle('non-existent-slug', 1))
        .rejects.toThrow('Article not found');
    });

    test('should unbookmark an article successfully', async () => {
      // Given
      const expectedResponse = {
        ...mockArticle,
        bookmarkedBy: [],
        bookmarked: false,
        bookmarksCount: 0,
        favorited: false,
        favoritesCount: 0,
        tagList: [],
        author: {
          ...mockArticle.author,
          following: false,
        },
        _count: {
          bookmarkedBy: 0,
          favoritedBy: 0,
        },
      };

      // @ts-ignore
      prismaMock.article.update.mockResolvedValue(expectedResponse);

      // When
      const result = await unbookmarkArticle('test-article-slug', 1);

      // Then
      expect(prismaMock.article.update).toHaveBeenCalledWith({
        where: { slug: 'test-article-slug' },
        data: {
          bookmarkedBy: {
            disconnect: { id: 1 },
          },
        },
        include: expect.objectContaining({
          tagList: { select: { name: true } },
          author: expect.any(Object),
          bookmarkedBy: true,
          _count: { select: { bookmarkedBy: true } },
        }),
      });

      expect(result).toEqual(expect.objectContaining({
        slug: 'test-article-slug',
        bookmarked: false,
        bookmarksCount: 0,
      }));
    });

    test('should handle unbookmarking non-bookmarked article', async () => {
      // Given
      // @ts-ignore
      prismaMock.article.update.mockRejectedValue(new Error('Article not bookmarked'));

      // When & Then
      await expect(unbookmarkArticle('test-article-slug', 1))
        .rejects.toThrow('Article not bookmarked');
    });
  });

  describe('Bookmark State Validation', () => {
    test('should correctly identify bookmarked status when user has bookmarked', async () => {
      // Given
      const mockBookmarkedArticle = {
        id: 42,
        slug: 'bookmarked-article',
        title: 'Bookmarked Article',
        bookmarkedBy: [{ id: 1 }], // Current user has bookmarked
      };

      // @ts-ignore
      prismaMock.article.findUnique.mockResolvedValue(mockBookmarkedArticle);

// When
      const result = await getArticle('bookmarked-article', 1) as any;

      // Then
      expect(result.bookmarked).toBe(true);
      expect(result.bookmarksCount).toBe(1);
    });

    test('should correctly identify not bookmarked status when user has not bookmarked', async () => {
      // Given
      const mockNotBookmarkedArticle = {
        id: 42,
        slug: 'not-bookmarked-article',
        title: 'Not Bookmarked Article',
        bookmarkedBy: [{ id: 2 }], // Different user bookmarked
      };

      // @ts-ignore
      prismaMock.article.findUnique.mockResolvedValue(mockNotBookmarkedArticle);

// When
      const result = await getArticle('not-bookmarked-article', 1) as any;

      // Then
      expect(result.bookmarked).toBe(false);
      expect(result.bookmarksCount).toBe(1);
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

      // @ts-ignore
      prismaMock.article.update.mockResolvedValue(expectedResponse);

      // When
      const result = await bookmarkArticle('shared-article', 1);

      // Then
      expect(result.bookmarked).toBe(true);
      expect(result.bookmarksCount).toBe(2);
    });
  });
});