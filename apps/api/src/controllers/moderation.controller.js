const asyncHandler = require("../utils/asyncHandler");
const Membership = require("../models/Membership");
const Ban = require("../models/Ban");
const User = require("../models/User");
const { createModerationLog } = require("../utils/moderation");

function canModerate(role) {
  return ["owner", "admin", "mod", "moderator"].includes(role);
}

async function requireModerator(communityId, userId) {
  const membership = await Membership.findOne({
    communityId,
    userId,
  }).lean();

  if (!membership || !canModerate(membership.role)) {
    const error = new Error("You do not have permission to moderate this community");
    error.status = 403;
    throw error;
  }

  return membership;
}

const banUser = asyncHandler(async (req, res) => {
  const community = req.community;
  const actorUserId = req.user.sub;
  const targetUserId = String(req.body?.userId || "").trim();
  const reason = String(req.body?.reason || "").trim();

  await requireModerator(community._id, actorUserId);

  if (!targetUserId) {
    return res.status(400).json({
      error: { message: "userId is required" },
    });
  }

  const targetUser = await User.findById(targetUserId).lean();
  if (!targetUser) {
    return res.status(404).json({
      error: { message: "Target user not found" },
    });
  }

  const existing = await Ban.findOne({
    communityId: community._id,
    userId: targetUserId,
  }).lean();

  if (existing) {
    return res.status(409).json({
      error: { message: "User is already banned" },
    });
  }

  const ban = await Ban.create({
    communityId: community._id,
    userId: targetUserId,
    reason,
    bannedByUserId: actorUserId,
  });

  await Membership.findOneAndDelete({
    communityId: community._id,
    userId: targetUserId,
  });

  await createModerationLog({
    communityId: community._id,
    actionType: "ban_user",
    targetType: "user",
    targetId: String(targetUser._id),
    targetLabel: targetUser.displayName || targetUser.username,
    actorUserId,
    reason,
    visibility: "public",
    metadata: {
      bannedUserId: String(targetUser._id),
      bannedUsername: targetUser.username,
    },
  });

  res.status(201).json({
    ok: true,
    ban,
  });
});

const unbanUser = asyncHandler(async (req, res) => {
  const community = req.community;
  const actorUserId = req.user.sub;
  const targetUserId = req.params.userId;

  await requireModerator(community._id, actorUserId);

  const targetUser = await User.findById(targetUserId).lean();
  if (!targetUser) {
    return res.status(404).json({
      error: { message: "Target user not found" },
    });
  }

  const deleted = await Ban.findOneAndDelete({
    communityId: community._id,
    userId: targetUserId,
  });

  if (!deleted) {
    return res.status(404).json({
      error: { message: "Ban not found" },
    });
  }

  await createModerationLog({
    communityId: community._id,
    actionType: "unban_user",
    targetType: "user",
    targetId: String(targetUser._id),
    targetLabel: targetUser.displayName || targetUser.username,
    actorUserId,
    reason: "User was unbanned.",
    visibility: "public",
    metadata: {
      unbannedUserId: String(targetUser._id),
      unbannedUsername: targetUser.username,
    },
  });

  res.json({
    ok: true,
    unbanned: true,
  });
});

const listBans = asyncHandler(async (req, res) => {
  const community = req.community;
  const actorUserId = req.user.sub;

  await requireModerator(community._id, actorUserId);

  const bans = await Ban.find({ communityId: community._id })
    .sort({ createdAt: -1 })
    .populate("userId", "username displayName avatarUrl")
    .populate("bannedByUserId", "username displayName avatarUrl")
    .lean();

  res.json({
    ok: true,
    bans: bans.map((ban) => ({
      id: ban._id,
      reason: ban.reason || "",
      createdAt: ban.createdAt,
      user: ban.userId
        ? {
            id: ban.userId._id,
            username: ban.userId.username,
            displayName: ban.userId.displayName || "",
            avatarUrl: ban.userId.avatarUrl || "",
          }
        : null,
      bannedBy: ban.bannedByUserId
        ? {
            id: ban.bannedByUserId._id,
            username: ban.bannedByUserId.username,
            displayName: ban.bannedByUserId.displayName || "",
            avatarUrl: ban.bannedByUserId.avatarUrl || "",
          }
        : null,
    })),
  });
});

module.exports = {
  banUser,
  unbanUser,
  listBans,
}; 