"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const authorMapper = (author, id) => ({
    username: author.username,
    bio: author.bio,
    image: author.image,
    following: id
        ? author?.followedBy.some((followingUser) => followingUser.id === id)
        : false,
});
exports.default = authorMapper;
//# sourceMappingURL=author.mapper.js.map