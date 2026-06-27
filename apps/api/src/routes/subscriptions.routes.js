const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { loadCommunityBySlug, requireCommunityPermission } = require("../middleware/communityAccess");

const { checkoutTier } = require("../controllers/subscriptions.controller");

router.post(
  "/communities/:slug/tiers/:tierId/checkout",
  requireAuth,
  loadCommunityBySlug,
  requireCommunityPermission("CHANNEL_LIST"), // any member can subscribe; must at least be able to view community
  checkoutTier
);

module.exports = router; 