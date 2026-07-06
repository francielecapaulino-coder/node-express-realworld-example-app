import authorMapper from '../../app/routes/article/author.mapper';

describe('authorMapper', () => {
  const author = { username: 'RealWorld', bio: 'hi', image: 'pic.png', followedBy: [{ id: 99 }, { id: 1 }] };

  test('following is false when no id is given', () => {
    expect(authorMapper(author)).toEqual({
      username: 'RealWorld',
      bio: 'hi',
      image: 'pic.png',
      following: false,
    });
  });

  test('following is true when the given id is in followedBy, even alongside other ids', () => {
    expect(authorMapper(author, 1).following).toBe(true);
  });

  test('following is false when the given id is not in followedBy', () => {
    expect(authorMapper(author, 2).following).toBe(false);
  });
});
