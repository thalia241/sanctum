const asyncHandler = require("../utils/asyncHandler");
const ModerationLog = require("../models/ModerationLog");
const Membership = require("../models/Membership");

function canManageModeration(role) {
  return ["owner", "admin", "mod", "moderator"].includes(role);
}

function sanitizeActor(user) {
  if (!user) return null;

  return {
    id: user._id,
    username: user.username,
    displayName: user.displayName || "",
    avatarUrl: user.avatarUrl || "",
  };
}

function sanitizeLog(log) {
  return {
    id: log._id,
    communityId: log.communityId,
    actionType: log.actionType,
    targetType: log.targetType,
    targetId: log.targetId,
    targetLabel: log.targetLabel,
    actor: sanitizeActor(log.actorUserId),
    reason: log.reason,
    visibility: log.visibility,
    metadata: log.metadata || {},
    linkedAppealId: log.linkedAppealId || null,
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
  };
}

// GET /communities/:slug/moderation-logs
const listModerationLogs = asyncHandler(async (req, res) => {
  const community = req.community;
  const userId = req.user.sub;

  const membership = await Membership.findOne({
    communityId: community._id,
    userId,
  }).lean();

  const role = membership?.role || "";
  const includeStaff = canManageModeration(role);

  const visibilityFilter = includeStaff ? ["public", "staff"] : ["public"];

  const logs = await ModerationLog.find({
    communityId: community._id,
    visibility: { $in: visibilityFilter },
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("actorUserId", "username displayName avatarUrl")
    .lean();

  res.json({
    ok: true,
    logs: logs.map(sanitizeLog),
    permissions: {
      includeStaff,
      role: role || null,
    },
  });
});

module.exports = {
  listModerationLogs,
}; 