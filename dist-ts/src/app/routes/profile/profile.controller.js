"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const express_1 = require("express");
const auth_1 = tslib_1.__importDefault(require("../auth/auth"));
const profile_service_1 = require("./profile.service");
const router = (0, express_1.Router)();
/**
 * Get profile
 * @auth optional
 * @route {GET} /profiles/:username
 * @param username string
 * @returns profile
 */
router.get('/profiles/:username', auth_1.default.optional, async (req, res, next) => {
    try {
        const profile = await (0, profile_service_1.getProfile)(req.params.username, req.auth?.user?.id);
        res.json({ profile });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Follow user
 * @auth required
 * @route {POST} /profiles/:username/follow
 * @param username string
 * @returns profile
 */
router.post('/profiles/:username/follow', auth_1.default.required, async (req, res, next) => {
    try {
        const profile = await (0, profile_service_1.followUser)(req.params?.username, req.auth?.user?.id);
        res.json({ profile });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Unfollow user
 * @auth required
 * @route {DELETE} /profiles/:username/follow
 * @param username string
 * @returns profiles
 */
router.delete('/profiles/:username/follow', auth_1.default.required, async (req, res, next) => {
    try {
        const profile = await (0, profile_service_1.unfollowUser)(req.params.username, req.auth?.user?.id);
        res.json({ profile });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=profile.controller.js.map