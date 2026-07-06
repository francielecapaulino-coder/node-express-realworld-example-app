import articleMapper from '../../app/routes/article/article.mapper';

describe('articleMapper', () => {
  const article = {
    slug: 'how-to-train-your-dragon-1',
    title: 'How to train your dragon',
    description: 'desc',
    body: 'body',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    tagList: [{ name: 'dragons' }],
    favoritedBy: [{ id: 99 }, { id: 1 }],
    author: { username: 'RealWorld', bio: null, image: null, followedBy: [] },
  };

  test('favorited is true when the given id is in favoritedBy, even alongside other ids', () => {
    expect(articleMapper(article, 1).favorited).toBe(true);
    expect(articleMapper(article, 1).favoritesCount).toBe(2);
  });

  test('favorited is false when the given id is not in favoritedBy', () => {
    expect(articleMapper(article, 2).favorited).toBe(false);
  });
});
