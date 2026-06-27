const router = require("express").Router();

const { requireAuth } = require("../middleware/auth");
const {
  loadCommunityBySlug,
  requireCommunityPermission,
} = require("../middleware/communityAccess");

const {
  createProposal,
  listProposals,
  voteOnProposal,
  closeProposal,
} = require("../controllers/governance.controller");

router.post(
  "/communities/:slug/governance/proposals",
  requireAuth,
  loadCommunityBySlug,
  requireCommunityPermission("CHANNEL_LIST"),
  createProposal
);

router.get(
  "/communities/:slug/governance/proposals",
  requireAuth,
  loadCommunityBySlug,
  requireCommunityPermission("CHANNEL_LIST"),
  listProposals
);

router.post(
  "/communities/:slug/governance/proposals/:proposalId/vote",
  requireAuth,
  loadCommunityBySlug,
  requireCommunityPermission("CHANNEL_LIST"),
  voteOnProposal
);

router.patch(
  "/communities/:slug/governance/proposals/:proposalId/close",
  requireAuth,
  loadCommunityBySlug,
  requireCommunityPermission("COMMUNITY_MODERATE"),
  closeProposal
);

module.exports = router; 