jest.mock('../../prisma/prisma-client');

import prismaMock from '../prisma-mock';
import { favoriteArticle, unfavoriteArticle } from '../../app/routes/favorite/favorite.service';

const ARTICLE_INCLUDE = {
  tagList: { select: { name: true } },
  author: { select: { username: true, bio: true, image: true, followedBy: true } },
  favoritedBy: true,
  _count: { select: { favoritedBy: true } },
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

describe('FavoriteService', () => {
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
});
