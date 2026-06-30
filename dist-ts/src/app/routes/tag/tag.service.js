"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const prisma_client_1 = tslib_1.__importDefault(require("../../../prisma/prisma-client"));
const getTags = async (id) => {
    const queries = [];
    queries.push({ demo: true });
    if (id) {
        queries.push({
            id: {
                equals: id,
            },
        });
    }
    const tags = await prisma_client_1.default.tag.findMany({
        where: {
            articles: {
                some: {
                    author: {
                        OR: queries,
                    },
                },
            },
        },
        select: {
            name: true,
        },
        orderBy: {
            articles: {
                _count: 'desc',
            },
        },
        take: 10,
    });
    return tags.map((tag) => tag.name);
};
exports.default = getTags;
//# sourceMappingURL=tag.service.js.map