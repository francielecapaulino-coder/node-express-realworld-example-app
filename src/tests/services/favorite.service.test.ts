jest.mock('../../prisma/prisma-client');

import prismaMock from '../prisma-mock';
import { mappedAuthor, mockedArticle } from '../fixtures/article.fixture';
import { favoriteArticle, unfavoriteArticle } from '../../app/routes/favorite/favorite.service';

const ARTICLE_INCLUDE = {
  tagList: { select: { name: true } },
  author: { select: { username: true, bio: true, image: true, followedBy: { select: { id: true } } } },
  favoritedBy: { select: { id: true } },
  _count: { select: { favoritedBy: true } },
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

describe('FavoriteService', () => {
  beforeEach(() => {
    prismaMock.article.findUnique.mockResolvedValue({ id: mockedArticle.id } as any);
  });

  describe('favoriteArticle', () => {
    test('throws a 404 when the article does not exist', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);

      await expect(favoriteArticle('missing-slug', 1)).rejects.toMatchObject({
        errorCode: 404,
        message: { errors: { article: ['not found'] } },
      });
      expect(prismaMock.article.update).not.toHaveBeenCalled();
    });

    test('connects the current user and returns the mapped, favorited article', async () => {
      prismaMock.article.update.mockResolvedValue(mockedArticle as any);

      const result = await favoriteArticle(mockedArticle.slug, 1);

      expect(prismaMock.article.findUnique).toHaveBeenCalledWith({
        where: { slug: mockedArticle.slug },
        select: { id: true },
      });
      expect(prismaMock.article.update).toHaveBeenCalledWith({
        where: { slug: mockedArticle.slug },
        data: { favoritedBy: { connect: { id: 1 } } },
        include: ARTICLE_INCLUDE,
      });
      expect(result).toEqual({
        ...mappedArticleFields,
        favorited: false,
        favoritesCount: 0,
      });
      expect(result).not.toHaveProperty('id');
      expect(result).not.toHaveProperty('authorId');
      expect(result).not.toHaveProperty('favoritedBy');
      expect(result).not.toHaveProperty('bookmarkedBy');
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
    test('throws a 404 when the article does not exist', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);

      await expect(unfavoriteArticle('missing-slug', 1)).rejects.toMatchObject({
        errorCode: 404,
        message: { errors: { article: ['not found'] } },
      });
      expect(prismaMock.article.update).not.toHaveBeenCalled();
    });

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
      expect(result).not.toHaveProperty('id');
      expect(result).not.toHaveProperty('authorId');
    });

    test('favorited is true if favoritedBy still includes the user id after disconnecting', async () => {
      prismaMock.article.update.mockResolvedValue({ ...mockedArticle, favoritedBy: [{ id: 1 }] } as any);

      const result = await unfavoriteArticle(mockedArticle.slug, 1);

      expect(result).toHaveProperty('favorited', true);
    });

    test('favorited is false when favoritedBy contains a different user id', async () => {
      prismaMock.article.update.mockResolvedValue({ ...mockedArticle, favoritedBy: [{ id: 999 }] } as any);

      const result = await unfavoriteArticle(mockedArticle.slug, 1);

      expect(result).toHaveProperty('favorited', false);
    });
  });
});
