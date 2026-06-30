"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUser = exports.getCurrentUser = exports.login = exports.createUser = void 0;
const tslib_1 = require("tslib");
const bcrypt = tslib_1.__importStar(require("bcryptjs"));
const prisma_client_1 = tslib_1.__importDefault(require("../../../prisma/prisma-client"));
const http_exception_model_1 = tslib_1.__importDefault(require("../../models/http-exception.model"));
const token_utils_1 = tslib_1.__importDefault(require("./token.utils"));
const checkUserUniqueness = async (email, username) => {
    const existingUserByEmail = await prisma_client_1.default.user.findUnique({
        where: {
            email,
        },
        select: {
            id: true,
        },
    });
    const existingUserByUsername = await prisma_client_1.default.user.findUnique({
        where: {
            username,
        },
        select: {
            id: true,
        },
    });
    if (existingUserByEmail || existingUserByUsername) {
        throw new http_exception_model_1.default(422, {
            errors: {
                ...(existingUserByEmail ? { email: ['has already been taken'] } : {}),
                ...(existingUserByUsername ? { username: ['has already been taken'] } : {}),
            },
        });
    }
};
const createUser = async (input) => {
    const email = input.email?.trim();
    const username = input.username?.trim();
    const password = input.password?.trim();
    const { image, bio, demo } = input;
    if (!email) {
        throw new http_exception_model_1.default(422, { errors: { email: ["can't be blank"] } });
    }
    if (!username) {
        throw new http_exception_model_1.default(422, { errors: { username: ["can't be blank"] } });
    }
    if (!password) {
        throw new http_exception_model_1.default(422, { errors: { password: ["can't be blank"] } });
    }
    await checkUserUniqueness(email, username);
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma_client_1.default.user.create({
        data: {
            username,
            email,
            password: hashedPassword,
            ...(image ? { image } : {}),
            ...(bio ? { bio } : {}),
            ...(demo ? { demo } : {}),
        },
        select: {
            id: true,
            email: true,
            username: true,
            bio: true,
            image: true,
        },
    });
    return {
        ...user,
        token: (0, token_utils_1.default)(user.id),
    };
};
exports.createUser = createUser;
const login = async (userPayload) => {
    const email = userPayload.email?.trim();
    const password = userPayload.password?.trim();
    if (!email) {
        throw new http_exception_model_1.default(422, { errors: { email: ["can't be blank"] } });
    }
    if (!password) {
        throw new http_exception_model_1.default(422, { errors: { password: ["can't be blank"] } });
    }
    const user = await prisma_client_1.default.user.findUnique({
        where: {
            email,
        },
        select: {
            id: true,
            email: true,
            username: true,
            password: true,
            bio: true,
            image: true,
        },
    });
    if (user) {
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            return {
                email: user.email,
                username: user.username,
                bio: user.bio,
                image: user.image,
                token: (0, token_utils_1.default)(user.id),
            };
        }
    }
    throw new http_exception_model_1.default(403, {
        errors: {
            'email or password': ['is invalid'],
        },
    });
};
exports.login = login;
const getCurrentUser = async (id) => {
    const user = (await prisma_client_1.default.user.findUnique({
        where: {
            id,
        },
        select: {
            id: true,
            email: true,
            username: true,
            bio: true,
            image: true,
        },
    }));
    return {
        ...user,
        token: (0, token_utils_1.default)(user.id),
    };
};
exports.getCurrentUser = getCurrentUser;
const updateUser = async (userPayload, id) => {
    const { email, username, password, image, bio } = userPayload;
    let hashedPassword;
    if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
    }
    const user = await prisma_client_1.default.user.update({
        where: {
            id: id,
        },
        data: {
            ...(email ? { email } : {}),
            ...(username ? { username } : {}),
            ...(password ? { password: hashedPassword } : {}),
            ...(image ? { image } : {}),
            ...(bio ? { bio } : {}),
        },
        select: {
            id: true,
            email: true,
            username: true,
            bio: true,
            image: true,
        },
    });
    return {
        ...user,
        token: (0, token_utils_1.default)(user.id),
    };
};
exports.updateUser = updateUser;
//# sourceMappingURL=auth.service.js.map