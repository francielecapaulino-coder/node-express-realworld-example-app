"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unfollowUser = exports.followUser = exports.getProfile = void 0;
const tslib_1 = require("tslib");
const prisma_client_1 = tslib_1.__importDefault(require("../../../prisma/prisma-client"));
const profile_utils_1 = tslib_1.__importDefault(require("./profile.utils"));
const http_exception_model_1 = tslib_1.__importDefault(require("../../models/http-exception.model"));
const getProfile = async (usernamePayload, id) => {
    const profile = await prisma_client_1.default.user.findUnique({
        where: {
            username: usernamePayload,
        },
        include: {
            followedBy: true,
        },
    });
    if (!profile) {
        throw new http_exception_model_1.default(404, {});
    }
    return (0, profile_utils_1.default)(profile, id);
};
exports.getProfile = getProfile;
const followUser = async (usernamePayload, id) => {
    const profile = await prisma_client_1.default.user.update({
        where: {
            username: usernamePayload,
        },
        data: {
            followedBy: {
                connect: {
                    id,
                },
            },
        },
        include: {
            followedBy: true,
        },
    });
    return (0, profile_utils_1.default)(profile, id);
};
exports.followUser = followUser;
const unfollowUser = async (usernamePayload, id) => {
    const profile = await prisma_client_1.default.user.update({
        where: {
            username: usernamePayload,
        },
        data: {
            followedBy: {
                disconnect: {
                    id,
                },
            },
        },
        include: {
            followedBy: true,
        },
    });
    return (0, profile_utils_1.default)(profile, id);
};
exports.unfollowUser = unfollowUser;
//# sourceMappingURL=profile.service.js.map