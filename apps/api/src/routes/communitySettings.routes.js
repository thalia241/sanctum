const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const {
  loadCommunityBySlug,
  requireCommunityPermission,
} = require("../middleware/communityAccess");

const {
  getCommunitySettings,
  updateCommunitySettings,
} = require("../controllers/communitySettings.controller");

router.get(
  "/communities/:slug/settings",
  requireAuth,
  loadCommunityBySlug,
  requireCommunityPermission("COMMUNITY_EDIT"),
  getCommunitySettings
);

router.patch(
  "/communities/:slug/settings",
  requireAuth,
  loadCommunityBySlug,
  requireCommunityPermission("COMMUNITY_EDIT"),
  updateCommunitySettings
);

module.exports = router; 