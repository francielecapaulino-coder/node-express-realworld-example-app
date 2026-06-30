"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const express_1 = require("express");
const tag_controller_1 = tslib_1.__importDefault(require("./tag/tag.controller"));
const article_controller_1 = tslib_1.__importDefault(require("./article/article.controller"));
const auth_controller_1 = tslib_1.__importDefault(require("./auth/auth.controller"));
const profile_controller_1 = tslib_1.__importDefault(require("./profile/profile.controller"));
const api = (0, express_1.Router)()
    .use(tag_controller_1.default)
    .use(article_controller_1.default)
    .use(profile_controller_1.default)
    .use(auth_controller_1.default);
exports.default = (0, express_1.Router)().use('/api', api);
//# sourceMappingURL=routes.js.map