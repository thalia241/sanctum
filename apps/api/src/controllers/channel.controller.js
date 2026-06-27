// src/controllers/channel.controller.js
const asyncHandler = require("../utils/asyncHandler");
const Channel = require("../models/Channel");

const createChannel = asyncHandler(async (req, res) => {
  const communityId = req.community._id;
  const { name } = req.body;

  // Phase 1: enforce plan channel limits
  const maxChannels = req.entitlements?.maxChannels ?? 10;
  const currentCount = await Channel.countDocuments({ communityId });
  if (currentCount >= maxChannels) {
    return res.status(403).json({
      error: {
        message: `Channel limit reached (${maxChannels}). Upgrade your community plan to add more channels.`,
      },
    });
  }

  const trimmed = name.trim();

  try {
    const channel = await Channel.create({
      communityId,
      name: trimmed,
      type: "text",
    });

    res.status(201).json({ ok: true, channel });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({
        error: { message: "Channel name already exists in this community" },
      });
    }
    throw err;
  }
});

const listChannels = asyncHandler(async (req, res) => {
  const communityId = req.community._id;

  const channels = await Channel.find({ communityId })
    .sort({ createdAt: 1 })
    .lean();

  res.json({ ok: true, channels });
});

module.exports = { createChannel, listChannels }; 