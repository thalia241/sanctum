const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { loadCommunityBySlug, requireCommunityPermission } = require("../middleware/communityAccess");
const channelController = require("../controllers/channel.controller");
const { createChannelSchema, listChannelsSchema } = require("../validators/channel.validators");
const { attachEntitlements } = require("../middleware/entitlements"); 

/**
 * Mounted at: /api/communities
 * So these become:
 * POST /api/communities/:slug/channels
 * GET  /api/communities/:slug/channels
 */
router.post(
  "/:slug/channels",
  requireAuth,
  validate(createChannelSchema),
  loadCommunityBySlug,
  attachEntitlements,
  requireCommunityPermission("CHANNEL_CREATE"),
  channelController.createChannel
);

router.get(
  "/:slug/channels",
  requireAuth,
  validate(listChannelsSchema),
  loadCommunityBySlug,
  attachEntitlements, 
  requireCommunityPermission("CHANNEL_LIST"),
  channelController.listChannels
);

module.exports = router;