"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateComment = exports.generateArticle = exports.generateUser = void 0;
const falso_1 = require("@ngneat/falso");
const client_1 = require("@prisma/client");
const auth_service_1 = require("../app/routes/auth/auth.service");
const article_service_1 = require("../app/routes/article/article.service");
const prisma = new client_1.PrismaClient();
const generateUser = async () => (0, auth_service_1.createUser)({
    username: (0, falso_1.randFullName)(),
    email: (0, falso_1.randEmail)(),
    password: (0, falso_1.randPassword)(),
    image: 'https://api.realworld.io/images/demo-avatar.png',
    demo: true,
});
exports.generateUser = generateUser;
const generateArticle = async (id) => (0, article_service_1.createArticle)({
    title: (0, falso_1.randPhrase)(),
    description: (0, falso_1.randParagraph)(),
    body: (0, falso_1.randLines)({ length: 10 }).join(' '),
    tagList: (0, falso_1.randWord)({ length: 4 }),
}, id);
exports.generateArticle = generateArticle;
const generateComment = async (id, slug) => (0, article_service_1.addComment)((0, falso_1.randParagraph)(), slug, id);
exports.generateComment = generateComment;
const main = async () => {
    try {
        const users = await Promise.all(Array.from({ length: 12 }, () => (0, exports.generateUser)()));
        users?.map(user => user);
        // eslint-disable-next-line no-restricted-syntax
        for await (const user of users) {
            const articles = await Promise.all(Array.from({ length: 12 }, () => (0, exports.generateArticle)(user.id)));
            // eslint-disable-next-line no-restricted-syntax
            for await (const article of articles) {
                await Promise.all(users.map(userItem => (0, exports.generateComment)(userItem.id, article.slug)));
            }
        }
    }
    catch (e) {
        console.error(e);
    }
};
main()
    .then(async () => {
    await prisma.$disconnect();
})
    .catch(async () => {
    await prisma.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=seed.js.map