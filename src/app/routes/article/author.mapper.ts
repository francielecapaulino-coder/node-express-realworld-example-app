import { User } from '../auth/user.model';

export interface AuthorWithFollowers {
  username: string;
  bio: string | null;
  image: string | null;
  followedBy: Partial<User>[];
}

const authorMapper = (author: AuthorWithFollowers, id?: number) => ({
  username: author.username,
  bio: author.bio,
  image: author.image,
  following: id ? author.followedBy.some((followingUser) => followingUser.id === id) : false,
});

export default authorMapper;
