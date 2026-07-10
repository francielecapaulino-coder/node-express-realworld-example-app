jest.mock('../../prisma/prisma-client');

import prismaMock from '../prisma-mock';
import { addComment, deleteComment, getCommentsByArticle } from '../../app/routes/comment/comment.service';

const mockedArticle = {
  id: 123,
  slug: 'how-to-train-your-dragon-1',
};

describe('CommentService', () => {
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
              author: { select: { username: true, bio: true, image: true, followedBy: { select: { id: true } } } },
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

    test('throws a 404 when the article does not exist', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);

      await expect(getCommentsByArticle('missing-slug')).rejects.toMatchObject({
        errorCode: 404,
        message: { errors: { article: ['not found'] } },
      });
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
          author: { select: { username: true, bio: true, image: true, followedBy: { select: { id: true } } } },
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

    test('throws a 404 when the article does not exist', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);

      await expect(addComment('nice article', 'missing-slug', 456)).rejects.toMatchObject({
        errorCode: 404,
        message: { errors: { article: ['not found'] } },
      });
      expect(prismaMock.comment.create).not.toHaveBeenCalled();
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

      await expect(deleteComment(123, 456)).rejects.toMatchObject({
        errorCode: 404,
        message: { errors: { comment: ['not found'] } },
      });
      expect(prismaMock.comment.delete).not.toHaveBeenCalled();
    });

    test('throws a 403 when the current user is not the comment author', async () => {
      prismaMock.comment.findFirst.mockResolvedValue({ author: { id: 999, username: 'someone-else' } } as any);

      await expect(deleteComment(1, 456)).rejects.toMatchObject({
        errorCode: 403,
        message: { errors: { authorization: ['You are not authorized to delete this comment'] } },
      });
      expect(prismaMock.comment.delete).not.toHaveBeenCalled();
    });
  });
});
