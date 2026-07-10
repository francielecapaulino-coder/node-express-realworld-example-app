import authorMapper, { AuthorWithFollowers } from './author.mapper';
import { Tag } from '../tag/tag.model';

// Shared by every query (article/comment/favorite/bookmark) that includes the
// article's author, so the projection can't drift between endpoints. followedBy
// only needs `id` (authorMapper/profileMapper just check membership) — selecting
// full User rows here would leak password/email into responses that spread the
// author object without going through a mapper.
export const AUTHOR_SELECT = {
  username: true,
  bio: true,
  image: true,
  followedBy: {
    select: {
      id: true,
    },
  },
} as const;

interface RelationArticleBase {
  slug: string;
  title: string;
  description: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  tagList: Tag[];
  author: AuthorWithFollowers;
}

// Shared by favoriteArticle/unfavoriteArticle and bookmarkArticle/unbookmarkArticle:
// both connect/disconnect a personal M:N relation on an article and then map the
// article the same way articleMapper does for the plain CRUD endpoints, differing
// only in which relation/count field they read (favoritedBy/favoritesCount vs
// bookmarkedBy/bookmarksCount), which Prisma's generated types require to stay
// literal at each call site. Whitelists fields explicitly (mirroring
// article.mapper.ts) instead of spreading the raw Prisma result, which would leak
// internal fields (id, authorId) and the raw favoritedBy/bookmarkedBy id array of
// every other user who's toggled the relation.
export const mapRelationArticle = <T extends RelationArticleBase>(article: T, id: number) => ({
  slug: article.slug,
  title: article.title,
  description: article.description,
  body: article.body,
  createdAt: article.createdAt,
  updatedAt: article.updatedAt,
  tagList: article.tagList.map((tag) => tag.name),
  author: authorMapper(article.author, id),
});
