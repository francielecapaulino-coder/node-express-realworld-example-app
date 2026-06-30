"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const express_1 = require("express");
const auth_1 = tslib_1.__importDefault(require("../auth/auth"));
const tag_service_1 = tslib_1.__importDefault(require("./tag.service"));
const router = (0, express_1.Router)();
/**
 * Get top 10 popular tags
 * @auth optional
 * @route {GET} /api/tags
 * @returns tags list of tag names
 */
router.get('/tags', auth_1.default.optional, async (req, res, next) => {
    try {
        const tags = await (0, tag_service_1.default)(req.auth?.user?.id);
        res.json({ tags });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=tag.controller.js.map