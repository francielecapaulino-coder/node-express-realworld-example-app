import authorMapper, { AuthorWithFollowers } from './author.mapper';

export interface ArticleWithRelations {
  slug: string;
  title: string;
  description: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  tagList: { name: string }[];
  favoritedBy: { id: number }[];
  author: AuthorWithFollowers;
}

const articleMapper = (article: ArticleWithRelations, id?: number) => ({
  slug: article.slug,
  title: article.title,
  description: article.description,
  body: article.body,
  tagList: article.tagList.map((tag) => tag.name),
  createdAt: article.createdAt,
  updatedAt: article.updatedAt,
  favorited: article.favoritedBy.some((item) => item.id === id),
  favoritesCount: article.favoritedBy.length,
  author: authorMapper(article.author, id),
});

export default articleMapper;
