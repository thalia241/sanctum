const router = require("express").Router();

const { requireAuth } = require("../middleware/auth");
const {
  loadCommunityBySlug,
  requireCommunityPermission,
} = require("../middleware/communityAccess");

const {
  banUser,
  unbanUser,
  listBans,
} = require("../controllers/moderation.controller");

router.get(
  "/communities/:slug/moderation/bans",
  requireAuth,
  loadCommunityBySlug,
  requireCommunityPermission("COMMUNITY_MODERATE"),
  listBans
);

router.post(
  "/communities/:slug/moderation/ban",
  requireAuth,
  loadCommunityBySlug,
  requireCommunityPermission("COMMUNITY_MODERATE"),
  banUser
);

router.delete(
  "/communities/:slug/moderation/ban/:userId",
  requireAuth,
  loadCommunityBySlug,
  requireCommunityPermission("COMMUNITY_MODERATE"),
  unbanUser
);

module.exports = router; 