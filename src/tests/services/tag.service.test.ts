jest.mock('../../prisma/prisma-client');

import prismaMock from '../prisma-mock';
import getTags from '../../app/routes/tag/tag.service';

describe('TagService', () => {
  describe('getTags', () => {
    test('returns the top 10 tag names ordered by popularity, filtered to demo/own articles', async () => {
      prismaMock.tag.findMany.mockResolvedValue([{ name: 'dragons' }, { name: 'training' }] as any);

      const result = await getTags(456);

      expect(result).toEqual(['dragons', 'training']);
      expect(prismaMock.tag.findMany).toHaveBeenCalledWith({
        where: {
          articles: {
            some: {
              author: {
                OR: [{ demo: true }, { id: { equals: 456 } }],
              },
            },
          },
        },
        select: { name: true },
        orderBy: { articles: { _count: 'desc' } },
        take: 10,
      });
    });

    test('only filters by demo articles when no user id is provided', async () => {
      prismaMock.tag.findMany.mockResolvedValue([]);

      await getTags();

      expect(prismaMock.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            articles: {
              some: {
                author: {
                  OR: [{ demo: true }],
                },
              },
            },
          },
        }),
      );
    });

    test('returns an empty array when there are no tags', async () => {
      prismaMock.tag.findMany.mockResolvedValue([]);

      await expect(getTags()).resolves.toEqual([]);
    });
  });
});
