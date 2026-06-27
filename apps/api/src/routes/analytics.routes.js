const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { loadCommunityBySlug, requireCommunityPermission } = require("../middleware/communityAccess");
const { getCommunityAnalytics } = require("../controllers/analytics.controller");

router.get(
  "/communities/:slug/analytics",
  requireAuth,
  loadCommunityBySlug,
  requireCommunityPermission("MEMBER_LIST"),
  getCommunityAnalytics
);

module.exports = router; 