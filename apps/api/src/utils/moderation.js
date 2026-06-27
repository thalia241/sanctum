const ModerationLog = require("../models/ModerationLog");

async function createModerationLog({
  communityId,
  actionType,
  targetType,
  targetId = "",
  targetLabel = "",
  actorUserId,
  reason = "",
  visibility = "staff",
  metadata = {},
  linkedAppealId = null,
}) {
  return ModerationLog.create({
    communityId,
    actionType,
    targetType,
    targetId: String(targetId || ""),
    targetLabel: String(targetLabel || "").trim(),
    actorUserId,
    reason: String(reason || "").trim(),
    visibility,
    metadata: metadata || {},
    linkedAppealId,
  });
}

module.exports = {
  createModerationLog,
}; 