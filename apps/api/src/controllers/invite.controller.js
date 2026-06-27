const { customAlphabet } = require("nanoid");
const asyncHandler = require("../utils/asyncHandler");
const Invite = require("../models/Invite");
const Community = require("../models/Community");
const Channel = require("../models/Channel");
const Membership = require("../models/Membership");
const Ban = require("../models/Ban");

const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8); // avoids confusing chars

function isOwnerOrMod(role) {
  return role === "owner" || role === "mod";
}

const createInvite = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { slug } = req.params;
  const { channelId, maxUses, expiresAt } = req.body;

  const community = await Community.findOne({ slug });
  if (!community) return res.status(404).json({ error: { message: "Community not found" } });

  const membership = await Membership.findOne({ userId, communityId: community._id }).lean();
  if (!membership) return res.status(403).json({ error: { message: "You are not a member of this community" } });
  if (!isOwnerOrMod(membership.role)) return res.status(403).json({ error: { message: "Insufficient permissions" } });

  let parsedExpiresAt;
  if (expiresAt) {
    parsedExpiresAt = new Date(expiresAt);
    if (Number.isNaN(parsedExpiresAt.getTime())) {
      return res.status(400).json({ error: { message: "expiresAt must be a valid ISO date string" } });
    }
  }

  if (channelId) {
    const ch = await Channel.findById(channelId).lean();
    if (!ch) return res.status(404).json({ error: { message: "Channel not found" } });
    if (String(ch.communityId) !== String(community._id)) {
      return res.status(400).json({ error: { message: "channelId does not belong to this community" } });
    }
  }

  // Generate unique code (retry a few times)
  let invite;
  for (let i = 0; i < 5; i++) {
    const code = nanoid();
    try {
      invite = await Invite.create({
        code,
        communityId: community._id,
        channelId: channelId || undefined,
        createdBy: userId,
        maxUses: maxUses || undefined,
        expiresAt: parsedExpiresAt || undefined,
      });
      break;
    } catch (err) {
      if (err && err.code === 11000) continue; // code collision
      throw err;
    }
  }

  if (!invite) return res.status(500).json({ error: { message: "Failed to generate invite code" } });

  res.status(201).json({
    ok: true,
    invite,
    inviteUrlHint: `/invite/${invite.code}`, // frontend can build full URL
  });
});

const listInvites = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { slug } = req.params;

  const community = await Community.findOne({ slug }).lean();
  if (!community) return res.status(404).json({ error: { message: "Community not found" } });

  const membership = await Membership.findOne({ userId, communityId: community._id }).lean();
  if (!membership) return res.status(403).json({ error: { message: "You are not a member of this community" } });
  if (!isOwnerOrMod(membership.role)) return res.status(403).json({ error: { message: "Insufficient permissions" } });

  const invites = await Invite.find({ communityId: community._id })
    .sort({ createdAt: -1 })
    .populate("createdBy", "username avatarUrl")
    .lean();

  res.json({ ok: true, communitySlug: slug, invites });
});

const revokeInvite = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { code } = req.params;

  const invite = await Invite.findOne({ code });
  if (!invite) return res.status(404).json({ error: { message: "Invite not found" } });

  const membership = await Membership.findOne({ userId, communityId: invite.communityId }).lean();
  if (!membership) return res.status(403).json({ error: { message: "You are not a member of this community" } });
  if (!isOwnerOrMod(membership.role)) return res.status(403).json({ error: { message: "Insufficient permissions" } });

  if (invite.revokedAt) {
    return res.status(409).json({ error: { message: "Invite already revoked" } });
  }

  invite.revokedAt = new Date();
  await invite.save();

  res.json({ ok: true, revoked: true, code });
});

const previewInvite = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const invite = await Invite.findOne({ code })
    .populate("createdBy", "username avatarUrl")
    .lean();

  if (!invite) return res.status(404).json({ error: { message: "Invite not found" } });

  // Basic validity checks (no user context required)
  if (invite.revokedAt) {
    return res.status(410).json({ error: { message: "Invite revoked" } });
  }

  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    return res.status(410).json({ error: { message: "Invite expired" } });
  }

  if (typeof invite.maxUses === "number" && invite.uses >= invite.maxUses) {
    return res.status(410).json({ error: { message: "Invite max uses reached" } });
  }

  const community = await Community.findById(invite.communityId).lean();
  if (!community) return res.status(404).json({ error: { message: "Community not found" } });

  let channel = null;
  if (invite.channelId) {
    channel = await Channel.findById(invite.channelId).select("_id name").lean();
  }

  res.json({
    ok: true,
    invite: {
      code: invite.code,
      uses: invite.uses,
      maxUses: invite.maxUses ?? null,
      expiresAt: invite.expiresAt ?? null,
      createdAt: invite.createdAt,
      createdBy: invite.createdBy,
    },
    community: {
      name: community.name,
      slug: community.slug,
    },
    channel,
  });
}); 

const joinInvite = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { code } = req.params;

  const invite = await Invite.findOne({ code }).lean();
  if (!invite) return res.status(404).json({ error: { message: "Invite not found" } });

  if (invite.revokedAt) return res.status(410).json({ error: { message: "Invite revoked" } });

  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    return res.status(410).json({ error: { message: "Invite expired" } });
  }

  // Banned check
  const ban = await Ban.findOne({ communityId: invite.communityId, userId }).lean();
  if (ban) return res.status(403).json({ error: { message: "You are banned from this community" } });

  // If already member, don’t consume uses
  const existing = await Membership.findOne({ communityId: invite.communityId, userId }).lean();
  if (existing) {
    return res.json({
      ok: true,
      joined: false,
      communityId: String(invite.communityId),
      channelId: invite.channelId ? String(invite.channelId) : null,
      role: existing.role,
    });
  }

  // Consume an invite use (atomic if maxUses is set)
  if (typeof invite.maxUses === "number") {
    const updated = await Invite.findOneAndUpdate(
      {
        code,
        revokedAt: { $exists: false },
        $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
        uses: { $lt: invite.maxUses },
      },
      { $inc: { uses: 1 } },
      { new: true }
    ).lean();

    if (!updated) return res.status(410).json({ error: { message: "Invite is no longer valid (max uses reached or expired)" } });
  } else {
    // Unlimited uses: still increment for analytics (non-critical)
    await Invite.updateOne({ code }, { $inc: { uses: 1 } });
  }

  await Membership.create({
    communityId: invite.communityId,
    userId,
    role: "member",
  });

  res.status(201).json({
    ok: true,
    joined: true,
    communityId: String(invite.communityId),
    channelId: invite.channelId ? String(invite.channelId) : null,
    role: "member",
  });
});

module.exports = { createInvite, listInvites, revokeInvite, joinInvite, previewInvite };  