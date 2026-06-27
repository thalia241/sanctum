const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");
const { getPresenceSnapshot } = require("../lib/presence");

const getPresence = asyncHandler(async (req, res) => {
  const rawIds = String(req.query.ids || "").trim();

  if (!rawIds) {
    return res.json({ ok: true, presence: {} });
  }

  const ids = Array.from(
    new Set(
      rawIds
        .split(",")
        .map((id) => String(id || "").trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
    )
  );

  if (!ids.length) {
    return res.json({ ok: true, presence: {} });
  }

  const users = await User.find({ _id: { $in: ids } })
    .select("_id lastActiveAt")
    .lean();

  const onlineSnapshot = getPresenceSnapshot(ids);

  const presence = {};
  for (const user of users) {
    const userId = String(user._id);
    presence[userId] = {
      isOnline: Boolean(onlineSnapshot[userId]?.isOnline),
      lastActiveAt: user.lastActiveAt || null,
    };
  }

  res.json({
    ok: true,
    presence,
  });
});

module.exports = {
  getPresence,
}; 