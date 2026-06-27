const asyncHandler = require("../utils/asyncHandler");
const Channel = require("../models/Channel");
const Role = require("../models/Role");

// PATCH /api/channels/:channelId/gates
// body: { allowedRoleIds: [] }  (empty array = open channel)
const setChannelGates = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const { allowedRoleIds } = req.body;

  const channel = await Channel.findById(channelId);
  if (!channel) return res.status(404).json({ error: { message: "Channel not found" } });

  const ids = Array.isArray(allowedRoleIds) ? allowedRoleIds : [];

  // Validate roles belong to the same community
  if (ids.length > 0) {
    const roles = await Role.find({ _id: { $in: ids }, communityId: channel.communityId }).lean();
    if (roles.length !== ids.length) {
      return res.status(400).json({ error: { message: "One or more roles are invalid for this community" } });
    }
  }

  channel.allowedRoleIds = ids;
  await channel.save();

  res.json({ ok: true, channel: channel.toObject() });
});

module.exports = { setChannelGates }; 