export const mockedArticle = {
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

export const mappedAuthor = { username: 'RealWorld', bio: null, image: null, following: false };
