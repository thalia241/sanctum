// src/routes/billing.routes.js
const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { loadCommunityBySlug, requireCommunityPermission } = require("../middleware/communityAccess");
const { checkoutSchema } = require("../validators/billing.validators");

const {
  createCommunityPlanCheckout,
  createBillingPortal,
  stripeWebhook,
  getCommunityBillingStatus
} = require("../controllers/billing.controller");

router.post(
  "/communities/:slug/billing/checkout",
  requireAuth,
  loadCommunityBySlug,
  requireCommunityPermission("COMMUNITY_EDIT"),
  validate(checkoutSchema),
  createCommunityPlanCheckout
);

router.get(
  "/communities/:slug/billing/status",
  requireAuth,
  loadCommunityBySlug,
  requireCommunityPermission("COMMUNITY_EDIT"),
  getCommunityBillingStatus
); 

router.post("/billing/portal", requireAuth, createBillingPortal);
router.post("/billing/webhook", stripeWebhook);

module.exports = router;