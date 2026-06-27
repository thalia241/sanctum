const asyncHandler = require("../utils/asyncHandler");
const ModerationAppeal = require("../models/ModerationAppeal");
const ModerationLog = require("../models/ModerationLog");
const Membership = require("../models/Membership");
const { createModerationLog } = require("../utils/moderation");

function canManageModeration(role) {
  return ["owner", "admin", "mod", "moderator"].includes(role);
}

function sanitizeUser(user) {
  if (!user) return null;

  return {
    id: user._id,
    username: user.username,
    displayName: user.displayName || "",
    avatarUrl: user.avatarUrl || "",
  };
}

function sanitizeAppeal(appeal) {
  return {
    id: appeal._id,
    communityId: appeal.communityId,
    moderationLogId: appeal.moderationLogId?._id || appeal.moderationLogId,
    moderationLog: appeal.moderationLogId?._id
      ? {
          id: appeal.moderationLogId._id,
          actionType: appeal.moderationLogId.actionType,
          targetType: appeal.moderationLogId.targetType,
          targetLabel: appeal.moderationLogId.targetLabel,
          reason: appeal.moderationLogId.reason,
          createdAt: appeal.moderationLogId.createdAt,
        }
      : null,
    appellant: sanitizeUser(appeal.appellantUserId),
    explanation: appeal.explanation,
    status: appeal.status,
    reviewer: sanitizeUser(appeal.reviewerUserId),
    resolutionNote: appeal.resolutionNote || "",
    createdAt: appeal.createdAt,
    updatedAt: appeal.updatedAt,
  };
}

// GET /communities/:slug/appeals
const listAppeals = asyncHandler(async (req, res) => {
  const community = req.community;
  const userId = req.user.sub;

  const membership = await Membership.findOne({
    communityId: community._id,
    userId,
  }).lean();

  const role = membership?.role || "";
  const staffAccess = canManageModeration(role);

  const filter = staffAccess
    ? { communityId: community._id }
    : { communityId: community._id, appellantUserId: userId };

  const appeals = await ModerationAppeal.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("appellantUserId", "username displayName avatarUrl")
    .populate("reviewerUserId", "username displayName avatarUrl")
    .populate("moderationLogId")
    .lean();

  res.json({
    ok: true,
    appeals: appeals.map(sanitizeAppeal),
    permissions: {
      staffAccess,
      role: role || null,
    },
  });
});

// POST /communities/:slug/appeals
const createAppeal = asyncHandler(async (req, res) => {
  const community = req.community;
  const userId = req.user.sub;
  const moderationLogId = String(req.body?.moderationLogId || "").trim();
  const explanation = String(req.body?.explanation || "").trim();

  if (!moderationLogId) {
    return res.status(400).json({
      error: { message: "moderationLogId is required" },
    });
  }

  if (!explanation) {
    return res.status(400).json({
      error: { message: "Appeal explanation is required" },
    });
  }

  const log = await ModerationLog.findOne({
    _id: moderationLogId,
    communityId: community._id,
  }).lean();

  if (!log) {
    return res.status(404).json({
      error: { message: "Moderation log entry not found" },
    });
  }

  const existing = await ModerationAppeal.findOne({
    communityId: community._id,
    moderationLogId,
    appellantUserId: userId,
    status: { $in: ["submitted", "under_review"] },
  }).lean();

  if (existing) {
    return res.status(409).json({
      error: { message: "You already have an active appeal for this moderation action" },
    });
  }

  const appeal = await ModerationAppeal.create({
    communityId: community._id,
    moderationLogId,
    appellantUserId: userId,
    explanation,
    status: "submitted",
  });

  const populated = await ModerationAppeal.findById(appeal._id)
    .populate("appellantUserId", "username displayName avatarUrl")
    .populate("reviewerUserId", "username displayName avatarUrl")
    .populate("moderationLogId")
    .lean();

  res.status(201).json({
    ok: true,
    appeal: sanitizeAppeal(populated),
  });
});

// PATCH /communities/:slug/appeals/:appealId
const resolveAppeal = asyncHandler(async (req, res) => {
  const community = req.community;
  const userId = req.user.sub;
  const { appealId } = req.params;
  const status = String(req.body?.status || "").trim();
  const resolutionNote = String(req.body?.resolutionNote || "").trim();

  if (!["under_review", "approved", "denied"].includes(status)) {
    return res.status(400).json({
      error: { message: "Invalid appeal status" },
    });
  }

  const membership = await Membership.findOne({
    communityId: community._id,
    userId,
  }).lean();

  if (!canManageModeration(membership?.role || "")) {
    return res.status(403).json({
      error: { message: "You do not have permission to resolve appeals" },
    });
  }

  const appeal = await ModerationAppeal.findOne({
    _id: appealId,
    communityId: community._id,
  });

  if (!appeal) {
    return res.status(404).json({
      error: { message: "Appeal not found" },
    });
  }

  appeal.status = status;
  appeal.reviewerUserId = userId;
  appeal.resolutionNote = resolutionNote;
  await appeal.save();

  if (status === "approved" || status === "denied") {
    await createModerationLog({
      communityId: community._id,
      actionType: status === "approved" ? "appeal_approved" : "appeal_denied",
      targetType: "user",
      targetId: String(appeal.appellantUserId),
      targetLabel: "Appeal resolution",
      actorUserId: userId,
      reason: resolutionNote || `Appeal ${status}.`,
      visibility: "public",
      linkedAppealId: appeal._id,
      metadata: {
        originalModerationLogId: String(appeal.moderationLogId),
      },
    });

    await ModerationLog.findByIdAndUpdate(appeal.moderationLogId, {
      $set: { linkedAppealId: appeal._id },
    });
  }

  const populated = await ModerationAppeal.findById(appeal._id)
    .populate("appellantUserId", "username displayName avatarUrl")
    .populate("reviewerUserId", "username displayName avatarUrl")
    .populate("moderationLogId")
    .lean();

  res.json({
    ok: true,
    appeal: sanitizeAppeal(populated),
  });
});

module.exports = {
  listAppeals,
  createAppeal,
  resolveAppeal,
}; 