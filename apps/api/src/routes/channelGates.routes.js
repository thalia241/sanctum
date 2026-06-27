const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const Channel = require("../models/Channel");
const Membership = require("../models/Membership");
const Ban = require("../models/Ban");
const asyncHandler = require("../utils/asyncHandler");

const { setChannelGates } = require("../controllers/channelGates.controller");

// Minimal inline guard: must be owner/mod in that channel's community
const requireChannelAdmin = asyncHandler(async (req, res, next) => {
  const userId = req.user.sub;
  const channel = await Channel.findById(req.params.channelId).lean();
  if (!channel) return res.status(404).json({ error: { message: "Channel not found" } });

  const ban = await Ban.findOne({ userId, communityId: channel.communityId }).lean();
  if (ban) return res.status(403).json({ error: { message: "You are banned from this community" } });

  const membership = await Membership.findOne({ userId, communityId: channel.communityId }).lean();
  if (!membership) return res.status(403).json({ error: { message: "Not a member of this community" } });

  if (membership.role !== "owner" && membership.role !== "mod") {
    return res.status(403).json({ error: { message: "Insufficient permissions" } });
  }

  req.channel = channel;
  next();
});

router.patch("/channels/:channelId/gates", requireAuth, requireChannelAdmin, setChannelGates);

module.exports = router; 