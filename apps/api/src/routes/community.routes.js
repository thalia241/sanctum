const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { loadCommunityBySlug } = require("../middleware/communityAccess");

const {
  createCommunity,
  listMyCommunities,
  getCommunityBySlug,
  joinCommunityBySlug,
  listMembers,
  leaveCommunity,
} = require("../controllers/community.controller");

const { listModerationLogs } = require("../controllers/moderationLogs.controller");

const {
  listAppeals,
  createAppeal,
  resolveAppeal,
} = require("../controllers/moderationAppeals.controller");

const {
  banUser,
  unbanUser,
  listBans,
} = require("../controllers/moderation.controller");

const router = express.Router();

router.use(requireAuth);

router.post("/", createCommunity);
router.get("/mine", listMyCommunities);

router.get("/:slug", loadCommunityBySlug, getCommunityBySlug);
router.post("/:slug/join", loadCommunityBySlug, joinCommunityBySlug);
router.get("/:slug/members", loadCommunityBySlug, listMembers);
router.post("/:slug/leave", loadCommunityBySlug, leaveCommunity);

router.get("/:slug/moderation-logs", loadCommunityBySlug, listModerationLogs);
router.get("/:slug/appeals", loadCommunityBySlug, listAppeals);
router.post("/:slug/appeals", loadCommunityBySlug, createAppeal);
router.patch("/:slug/appeals/:appealId", loadCommunityBySlug, resolveAppeal);

router.get("/:slug/moderation/bans", loadCommunityBySlug, listBans);
router.post("/:slug/moderation/ban", loadCommunityBySlug, banUser);
router.delete("/:slug/moderation/ban/:userId", loadCommunityBySlug, unbanUser);

module.exports = router; 