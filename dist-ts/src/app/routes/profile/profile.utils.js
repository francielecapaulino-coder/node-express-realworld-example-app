"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const profileMapper = (user, id) => ({
    username: user.username,
    bio: user.bio,
    image: user.image,
    following: id
        ? user?.followedBy.some((followingUser) => followingUser.id === id)
        : false,
});
exports.default = profileMapper;
//# sourceMappingURL=profile.utils.js.map