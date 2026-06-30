"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const author_mapper_1 = tslib_1.__importDefault(require("./author.mapper"));
const articleMapper = (article, id) => ({
    slug: article.slug,
    title: article.title,
    description: article.description,
    body: article.body,
    tagList: article.tagList.map((tag) => tag.name),
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    favorited: article.favoritedBy.some((item) => item.id === id),
    favoritesCount: article.favoritedBy.length,
    author: (0, author_mapper_1.default)(article.author, id),
});
exports.default = articleMapper;
//# sourceMappingURL=article.mapper.js.map