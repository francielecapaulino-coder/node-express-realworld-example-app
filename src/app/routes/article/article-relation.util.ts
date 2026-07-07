import profileMapper from '../profile/profile.utils';
import { Tag } from '../tag/tag.model';
import { AuthorWithFollowers } from './author.mapper';

// Shared by every query (article/comment/favorite/bookmark) that includes the
// article's author, so the projection can't drift between endpoints.
export const AUTHOR_SELECT = {
  username: true,
  bio: true,
  image: true,
  followedBy: true,
} as const;

interface RelationArticleBase {
  tagList: Tag[];
  author: AuthorWithFollowers;
}

// Shared by favoriteArticle/unfavoriteArticle and bookmarkArticle/unbookmarkArticle:
// both connect/disconnect a personal M:N relation on an article and then map the
// author + tagList the same way, differing only in which relation/count field
// they read (favoritedBy/favoritesCount vs bookmarkedBy/bookmarksCount), which
// Prisma's generated types require to stay literal at each call site.
export const mapRelationArticle = <T extends RelationArticleBase>(article: T, id: number) => ({
  ...article,
  author: profileMapper(article.author, id),
  tagList: article.tagList.map((tag) => tag.name),
});
