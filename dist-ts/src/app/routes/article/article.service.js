"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unbookmarkArticle = exports.bookmarkArticle = exports.unfavoriteArticle = exports.favoriteArticle = exports.deleteComment = exports.addComment = exports.getCommentsByArticle = exports.deleteArticle = exports.updateArticle = exports.getArticle = exports.createArticle = exports.getFeed = exports.getArticles = void 0;
const tslib_1 = require("tslib");
const slugify_1 = tslib_1.__importDefault(require("slugify"));
const prisma_client_1 = tslib_1.__importDefault(require("../../../prisma/prisma-client"));
const http_exception_model_1 = tslib_1.__importDefault(require("../../models/http-exception.model"));
const profile_utils_1 = tslib_1.__importDefault(require("../profile/profile.utils"));
const article_mapper_1 = tslib_1.__importDefault(require("./article.mapper"));
const buildFindAllQuery = (query, id) => {
    const queries = [];
    const orAuthorQuery = [];
    const andAuthorQuery = [];
    orAuthorQuery.push({
        demo: {
            equals: true,
        },
    });
    if (id) {
        orAuthorQuery.push({
            id: {
                equals: id,
            },
        });
    }
    if ('author' in query) {
        andAuthorQuery.push({
            username: {
                equals: query.author,
            },
        });
    }
    const authorQuery = {
        author: {
            OR: orAuthorQuery,
            AND: andAuthorQuery,
        },
    };
    queries.push(authorQuery);
    if ('tag' in query) {
        queries.push({
            tagList: {
                some: {
                    name: query.tag,
                },
            },
        });
    }
    if ('favorited' in query) {
        queries.push({
            favoritedBy: {
                some: {
                    username: {
                        equals: query.favorited,
                    },
                },
            },
        });
    }
    return queries;
};
const getArticles = async (query, id) => {
    const andQueries = buildFindAllQuery(query, id);
    const articlesCount = await prisma_client_1.default.article.count({
        where: {
            AND: andQueries,
        },
    });
    const articles = await prisma_client_1.default.article.findMany({
        where: { AND: andQueries },
        orderBy: {
            createdAt: 'desc',
        },
        skip: Number(query.offset) || 0,
        take: Number(query.limit) || 10,
        include: {
            tagList: {
                select: {
                    name: true,
                },
            },
            author: {
                select: {
                    username: true,
                    bio: true,
                    image: true,
                    followedBy: true,
                },
            },
            favoritedBy: true,
            _count: {
                select: {
                    favoritedBy: true,
                },
            },
        },
    });
    return {
        articles: articles.map((article) => (0, article_mapper_1.default)(article, id)),
        articlesCount,
    };
};
exports.getArticles = getArticles;
const getFeed = async (offset, limit, id) => {
    const articlesCount = await prisma_client_1.default.article.count({
        where: {
            author: {
                followedBy: { some: { id: id } },
            },
        },
    });
    const articles = await prisma_client_1.default.article.findMany({
        where: {
            author: {
                followedBy: { some: { id: id } },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
        skip: offset || 0,
        take: limit || 10,
        include: {
            tagList: {
                select: {
                    name: true,
                },
            },
            author: {
                select: {
                    username: true,
                    bio: true,
                    image: true,
                    followedBy: true,
                },
            },
            favoritedBy: true,
            _count: {
                select: {
                    favoritedBy: true,
                },
            },
        },
    });
    return {
        articles: articles.map((article) => (0, article_mapper_1.default)(article, id)),
        articlesCount,
    };
};
exports.getFeed = getFeed;
const createArticle = async (article, id) => {
    const { title, description, body, tagList } = article;
    const tags = Array.isArray(tagList) ? tagList : [];
    if (!title) {
        throw new http_exception_model_1.default(422, { errors: { title: ["can't be blank"] } });
    }
    if (!description) {
        throw new http_exception_model_1.default(422, { errors: { description: ["can't be blank"] } });
    }
    if (!body) {
        throw new http_exception_model_1.default(422, { errors: { body: ["can't be blank"] } });
    }
    const slug = `${(0, slugify_1.default)(title)}-${id}`;
    const existingTitle = await prisma_client_1.default.article.findUnique({
        where: {
            slug,
        },
        select: {
            slug: true,
        },
    });
    if (existingTitle) {
        throw new http_exception_model_1.default(422, { errors: { title: ['must be unique'] } });
    }
    const { authorId, id: articleId, ...createdArticle } = await prisma_client_1.default.article.create({
        data: {
            title,
            description,
            body,
            slug,
            tagList: {
                connectOrCreate: tags.map((tag) => ({
                    create: { name: tag },
                    where: { name: tag },
                })),
            },
            author: {
                connect: {
                    id: id,
                },
            },
        },
        include: {
            tagList: {
                select: {
                    name: true,
                },
            },
            author: {
                select: {
                    username: true,
                    bio: true,
                    image: true,
                    followedBy: true,
                },
            },
            favoritedBy: true,
            _count: {
                select: {
                    favoritedBy: true,
                },
            },
        },
    });
    return (0, article_mapper_1.default)(createdArticle, id);
};
exports.createArticle = createArticle;
const getArticle = async (slug, id) => {
    const article = await prisma_client_1.default.article.findUnique({
        where: {
            slug,
        },
        include: {
            tagList: {
                select: {
                    name: true,
                },
            },
            author: {
                select: {
                    username: true,
                    bio: true,
                    image: true,
                    followedBy: true,
                },
            },
            favoritedBy: true,
            _count: {
                select: {
                    favoritedBy: true,
                },
            },
        },
    });
    if (!article) {
        throw new http_exception_model_1.default(404, { errors: { article: ['not found'] } });
    }
    return (0, article_mapper_1.default)(article, id);
};
exports.getArticle = getArticle;
const disconnectArticlesTags = async (slug) => {
    await prisma_client_1.default.article.update({
        where: {
            slug,
        },
        data: {
            tagList: {
                set: [],
            },
        },
    });
};
const updateArticle = async (article, slug, id) => {
    let newSlug = null;
    const existingArticle = await await prisma_client_1.default.article.findFirst({
        where: {
            slug,
        },
        select: {
            author: {
                select: {
                    id: true,
                    username: true,
                },
            },
        },
    });
    if (!existingArticle) {
        throw new http_exception_model_1.default(404, {});
    }
    if (existingArticle.author.id !== id) {
        throw new http_exception_model_1.default(403, {
            message: 'You are not authorized to update this article',
        });
    }
    if (article.title) {
        newSlug = `${(0, slugify_1.default)(article.title)}-${id}`;
        if (newSlug !== slug) {
            const existingTitle = await prisma_client_1.default.article.findFirst({
                where: {
                    slug: newSlug,
                },
                select: {
                    slug: true,
                },
            });
            if (existingTitle) {
                throw new http_exception_model_1.default(422, { errors: { title: ['must be unique'] } });
            }
        }
    }
    const tagList = Array.isArray(article.tagList) && article.tagList?.length
        ? article.tagList.map((tag) => ({
            create: { name: tag },
            where: { name: tag },
        }))
        : [];
    await disconnectArticlesTags(slug);
    const updatedArticle = await prisma_client_1.default.article.update({
        where: {
            slug,
        },
        data: {
            ...(article.title ? { title: article.title } : {}),
            ...(article.body ? { body: article.body } : {}),
            ...(article.description ? { description: article.description } : {}),
            ...(newSlug ? { slug: newSlug } : {}),
            updatedAt: new Date(),
            tagList: {
                connectOrCreate: tagList,
            },
        },
        include: {
            tagList: {
                select: {
                    name: true,
                },
            },
            author: {
                select: {
                    username: true,
                    bio: true,
                    image: true,
                    followedBy: true,
                },
            },
            favoritedBy: true,
            _count: {
                select: {
                    favoritedBy: true,
                },
            },
        },
    });
    return (0, article_mapper_1.default)(updatedArticle, id);
};
exports.updateArticle = updateArticle;
const deleteArticle = async (slug, id) => {
    const existingArticle = await await prisma_client_1.default.article.findFirst({
        where: {
            slug,
        },
        select: {
            author: {
                select: {
                    id: true,
                    username: true,
                },
            },
        },
    });
    if (!existingArticle) {
        throw new http_exception_model_1.default(404, {});
    }
    if (existingArticle.author.id !== id) {
        throw new http_exception_model_1.default(403, {
            message: 'You are not authorized to delete this article',
        });
    }
    await prisma_client_1.default.article.delete({
        where: {
            slug,
        },
    });
};
exports.deleteArticle = deleteArticle;
const getCommentsByArticle = async (slug, id) => {
    const queries = [];
    queries.push({
        author: {
            demo: true,
        },
    });
    if (id) {
        queries.push({
            author: {
                id,
            },
        });
    }
    const comments = await prisma_client_1.default.article.findUnique({
        where: {
            slug,
        },
        include: {
            comments: {
                where: {
                    OR: queries,
                },
                select: {
                    id: true,
                    createdAt: true,
                    updatedAt: true,
                    body: true,
                    author: {
                        select: {
                            username: true,
                            bio: true,
                            image: true,
                            followedBy: true,
                        },
                    },
                },
            },
        },
    });
    const result = comments?.comments.map((comment) => ({
        ...comment,
        author: {
            username: comment.author.username,
            bio: comment.author.bio,
            image: comment.author.image,
            following: comment.author.followedBy.some((follow) => follow.id === id),
        },
    }));
    return result;
};
exports.getCommentsByArticle = getCommentsByArticle;
const addComment = async (body, slug, id) => {
    if (!body) {
        throw new http_exception_model_1.default(422, { errors: { body: ["can't be blank"] } });
    }
    const article = await prisma_client_1.default.article.findUnique({
        where: {
            slug,
        },
        select: {
            id: true,
        },
    });
    const comment = await prisma_client_1.default.comment.create({
        data: {
            body,
            article: {
                connect: {
                    id: article?.id,
                },
            },
            author: {
                connect: {
                    id: id,
                },
            },
        },
        include: {
            author: {
                select: {
                    username: true,
                    bio: true,
                    image: true,
                    followedBy: true,
                },
            },
        },
    });
    return {
        id: comment.id,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        body: comment.body,
        author: {
            username: comment.author.username,
            bio: comment.author.bio,
            image: comment.author.image,
            following: comment.author.followedBy.some((follow) => follow.id === id),
        },
    };
};
exports.addComment = addComment;
const deleteComment = async (id, userId) => {
    const comment = await prisma_client_1.default.comment.findFirst({
        where: {
            id,
            author: {
                id: userId,
            },
        },
        select: {
            author: {
                select: {
                    id: true,
                    username: true,
                },
            },
        },
    });
    if (!comment) {
        throw new http_exception_model_1.default(404, {});
    }
    if (comment.author.id !== userId) {
        throw new http_exception_model_1.default(403, {
            message: 'You are not authorized to delete this comment',
        });
    }
    await prisma_client_1.default.comment.delete({
        where: {
            id,
        },
    });
};
exports.deleteComment = deleteComment;
const favoriteArticle = async (slugPayload, id) => {
    const { _count, ...article } = await prisma_client_1.default.article.update({
        where: {
            slug: slugPayload,
        },
        data: {
            favoritedBy: {
                connect: {
                    id: id,
                },
            },
        },
        include: {
            tagList: {
                select: {
                    name: true,
                },
            },
            author: {
                select: {
                    username: true,
                    bio: true,
                    image: true,
                    followedBy: true,
                },
            },
            favoritedBy: true,
            _count: {
                select: {
                    favoritedBy: true,
                },
            },
        },
    });
    const result = {
        ...article,
        author: (0, profile_utils_1.default)(article.author, id),
        tagList: article?.tagList.map((tag) => tag.name),
        favorited: article.favoritedBy.some((favorited) => favorited.id === id),
        favoritesCount: _count?.favoritedBy,
    };
    return result;
};
exports.favoriteArticle = favoriteArticle;
const unfavoriteArticle = async (slugPayload, id) => {
    const { _count, ...article } = await prisma_client_1.default.article.update({
        where: {
            slug: slugPayload,
        },
        data: {
            favoritedBy: {
                disconnect: {
                    id: id,
                },
            },
        },
        include: {
            tagList: {
                select: {
                    name: true,
                },
            },
            author: {
                select: {
                    username: true,
                    bio: true,
                    image: true,
                    followedBy: true,
                },
            },
            favoritedBy: true,
            _count: {
                select: {
                    favoritedBy: true,
                },
            },
        },
    });
    const result = {
        ...article,
        author: (0, profile_utils_1.default)(article.author, id),
        tagList: article?.tagList.map((tag) => tag.name),
        favorited: article.favoritedBy.some((favorited) => favorited.id === id),
        favoritesCount: _count?.favoritedBy,
    };
    return result;
};
exports.unfavoriteArticle = unfavoriteArticle;
const bookmarkArticle = async (slugPayload, id) => {
    const { _count, ...article } = await prisma_client_1.default.article.update({
        where: {
            slug: slugPayload,
        },
        data: {
            bookmarkedBy: {
                connect: {
                    id: id,
                },
            },
        },
        include: {
            tagList: {
                select: {
                    name: true,
                },
            },
            author: {
                select: {
                    username: true,
                    bio: true,
                    image: true,
                    followedBy: true,
                },
            },
            bookmarkedBy: true,
            _count: {
                select: {
                    bookmarkedBy: true,
                },
            },
        },
    });
    const result = {
        ...article,
        author: (0, profile_utils_1.default)(article.author, id),
        tagList: article?.tagList.map((tag) => tag.name),
        bookmarked: article.bookmarkedBy.some((bookmarked) => bookmarked.id === id),
        bookmarksCount: _count?.bookmarkedBy,
    };
    return result;
};
exports.bookmarkArticle = bookmarkArticle;
const unbookmarkArticle = async (slugPayload, id) => {
    const { _count, ...article } = await prisma_client_1.default.article.update({
        where: {
            slug: slugPayload,
        },
        data: {
            bookmarkedBy: {
                disconnect: {
                    id: id,
                },
            },
        },
        include: {
            tagList: {
                select: {
                    name: true,
                },
            },
            author: {
                select: {
                    username: true,
                    bio: true,
                    image: true,
                    followedBy: true,
                },
            },
            bookmarkedBy: true,
            _count: {
                select: {
                    bookmarkedBy: true,
                },
            },
        },
    });
    const result = {
        ...article,
        author: (0, profile_utils_1.default)(article.author, id),
        tagList: article?.tagList.map((tag) => tag.name),
        bookmarked: article.bookmarkedBy.some((bookmarked) => bookmarked.id === id),
        bookmarksCount: _count?.bookmarkedBy,
    };
    return result;
};
exports.unbookmarkArticle = unbookmarkArticle;
//# sourceMappingURL=article.service.js.map