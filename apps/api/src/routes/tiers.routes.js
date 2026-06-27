const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const {
  loadCommunityBySlug,
  requireCommunityPermission,
} = require("../middleware/communityAccess");

const {
  createTier,
  updateTier,
  listTiers,
} = require("../controllers/tiers.controller");

router.post(
  "/communities/:slug/tiers",
  requireAuth,
  loadCommunityBySlug,
  requireCommunityPermission("COMMUNITY_EDIT"),
  createTier
);

router.get(
  "/communities/:slug/tiers",
  requireAuth,
  loadCommunityBySlug,
  requireCommunityPermission("CHANNEL_LIST"),
  listTiers
);

router.patch(
  "/communities/:slug/tiers/:tierId",
  requireAuth,
  loadCommunityBySlug,
  requireCommunityPermission("COMMUNITY_EDIT"),
  updateTier
);

module.exports = router; 