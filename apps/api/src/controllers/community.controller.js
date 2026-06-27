const slugify = require("slugify");
const asyncHandler = require("../utils/asyncHandler");
const Community = require("../models/Community");
const Membership = require("../models/Membership");
const Ban = require("../models/Ban");
const User = require("../models/User");
const CommunitySettings = require("../models/CommunitySettings");
const Tier = require("../models/Tier");
const Channel = require("../models/Channel");
const Post = require("../models/Post");

function makeBaseSlug(input) {
  return slugify(String(input), {
    lower: true,
    strict: true,
    trim: true,
  });
}

async function ensureUniqueSlug(baseSlug) {
  let slug = baseSlug;
  let n = 2;

  while (await Community.exists({ slug })) {
    slug = `${baseSlug}-${n}`;
    n += 1;
    if (n > 200) throw new Error("Unable to generate unique slug");
  }

  return slug;
}

function sanitizeOwner(owner) {
  if (!owner) return null;

  return {
    id: owner._id,
    username: owner.username,
    displayName: owner.displayName || "",
    avatarUrl: owner.avatarUrl || "",
  };
}

function sanitizeSettingsSummary(settings) {
  return {
    description: settings?.description || "",
    bannerUrl: settings?.bannerUrl || "",
    avatarUrl: settings?.avatarUrl || "",
    brandHeadline: settings?.brandHeadline || "",
    accentColor: settings?.accentColor || "#c084fc",
    themeVibe: settings?.themeVibe || "dreamy",
    backgroundColor: settings?.backgroundColor || "#020617",
    panelColor: settings?.panelColor || "#0f172a",
    textColor: settings?.textColor || "#e2e8f0",
    featuredPerks: Array.isArray(settings?.featuredPerks)
      ? settings.featuredPerks.filter(Boolean)
      : [],
    pinnedAnnouncement: {
      title: settings?.pinnedAnnouncement?.title || "",
      body: settings?.pinnedAnnouncement?.body || "",
      ctaLabel: settings?.pinnedAnnouncement?.ctaLabel || "",
      ctaUrl: settings?.pinnedAnnouncement?.ctaUrl || "",
    },
    onboardingMessage: settings?.onboardingMessage || "",
    transparencyNote: settings?.transparencyNote || "",
    charter: settings?.charter || "",
    requireCharterAck: Boolean(settings?.requireCharterAck),
    isPublicFeed: Boolean(settings?.isPublicFeed),
    isDiscoverable: Boolean(settings?.isDiscoverable),
  };
}

function sanitizeTierPreview(tier) {
  return {
    _id: tier._id,
    name: tier.name,
    description: tier.description || "",
    monthlyPriceLabel: tier.monthlyPriceLabel || "",
    highlightText: tier.highlightText || "",
    perks: Array.isArray(tier.perks) ? tier.perks.filter(Boolean) : [],
    isActive: Boolean(tier.isActive),
  };
}

function sanitizePostPreview(post) {
  if (!post) return null;

  return {
    id: post._id,
    title: post.title,
    body: post.body,
    visibility: post.visibility,
    postType: post.postType || "standard",
    coverImageUrl: post.coverImageUrl || "",
    createdAt: post.createdAt,
  };
}

function getActivityLabel({ latestPostAt, memberCount, postCount7d }) {
  const now = Date.now();
  const latestTime = latestPostAt ? new Date(latestPostAt).getTime() : 0;
  const diffHours = latestTime ? (now - latestTime) / 3600000 : Infinity;

  if (postCount7d >= 8) return "Very active";
  if (postCount7d >= 3) return "Active";
  if (diffHours <= 24) return "Recently active";
  if (memberCount >= 50) return "Established";
  return "Growing";
}

async function stampOnboardingJoinedCommunity(userId) {
  await User.findOneAndUpdate(
    {
      _id: userId,
      "onboarding.actions.joinedCommunityAt": null,
    },
    {
      $set: {
        "onboarding.actions.joinedCommunityAt": new Date(),
        "onboarding.lastCompletedStep": "community",
      },
    }
  );
}

const createCommunity = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { name, description, slug: requestedSlug } = req.body;

  const baseSlug = makeBaseSlug(requestedSlug || name);
  if (!baseSlug) {
    return res.status(400).json({ error: { message: "Invalid name/slug" } });
  }

  const slug = await ensureUniqueSlug(baseSlug);

  const community = await Community.create({
    name,
    slug,
    description,
    ownerId: userId,
  });

  await Membership.create({
    userId,
    communityId: community._id,
    role: "owner",
  });

  await CommunitySettings.create({
    communityId: community._id,
    description: description || "",
  });

  await stampOnboardingJoinedCommunity(userId);

  res.status(201).json({
    ok: true,
    community,
    membership: { role: "owner" },
  });
});

const listMyCommunities = asyncHandler(async (req, res) => {
  const userId = req.user.sub;

  const memberships = await Membership.find({ userId }).lean();
  const communityIds = memberships.map((m) => m.communityId);

  const communities = await Community.find({ _id: { $in: communityIds } })
    .sort({ createdAt: -1 })
    .lean();

  const roleByCommunityId = new Map(
    memberships.map((m) => [String(m.communityId), m.role])
  );

  const result = communities.map((c) => ({
    ...c,
    myRole: roleByCommunityId.get(String(c._id)) || null,
  }));

  res.json({ ok: true, communities: result });
});

const getCommunityBySlug = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { slug } = req.params;

  const community = await Community.findOne({ slug })
    .populate("ownerId", "username displayName avatarUrl")
    .lean();

  if (!community) {
    return res.status(404).json({ error: { message: "Community not found" } });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    membership,
    settings,
    memberCount,
    activeTiers,
    channelCount,
    recentPosts,
    latestPost,
  ] = await Promise.all([
    Membership.findOne({ userId, communityId: community._id }).lean(),
    CommunitySettings.findOne({ communityId: community._id }).lean(),
    Membership.countDocuments({ communityId: community._id }),
    Tier.find({ communityId: community._id, isActive: true })
      .sort({ createdAt: 1 })
      .limit(3)
      .lean(),
    Channel.countDocuments({ communityId: community._id }),
    Post.countDocuments({
      communityId: community._id,
      isDeleted: false,
      createdAt: { $gte: sevenDaysAgo },
    }),
    Post.findOne({
      communityId: community._id,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const activity = {
    channelCount,
    postCount7d: recentPosts,
    latestPostAt: latestPost?.createdAt || null,
    activityLabel: getActivityLabel({
      latestPostAt: latestPost?.createdAt || null,
      memberCount,
      postCount7d: recentPosts,
    }),
  };

  res.json({
    ok: true,
    community: {
      ...community,
      owner: sanitizeOwner(community.ownerId),
      ownerId: community.ownerId?._id || community.ownerId,
      memberCount,
      settingsSummary: sanitizeSettingsSummary(settings),
      tierPreview: activeTiers.map(sanitizeTierPreview),
      activity,
      latestPostPreview: sanitizePostPreview(latestPost),
    },
    membership: membership
      ? {
          role: membership.role,
          joinedAt: membership.createdAt,
          acknowledgedCharterAt: membership.acknowledgedCharterAt || null,
        }
      : null,
  });
});

const joinCommunityBySlug = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { slug } = req.params;

  const community = await Community.findOne({ slug });
  if (!community) {
    return res.status(404).json({ error: { message: "Community not found" } });
  }

  const existing = await Membership.findOne({
    userId,
    communityId: community._id,
  }).lean();

  if (existing) {
    return res.json({
      ok: true,
      community,
      membership: { role: existing.role },
      joined: false,
    });
  }

  const ban = await Ban.findOne({ userId, communityId: community._id }).lean();
  if (ban) {
    return res
      .status(403)
      .json({ error: { message: "You are banned from this community" } });
  }

  await Membership.create({ userId, communityId: community._id, role: "member" });
  await stampOnboardingJoinedCommunity(userId);

  res.status(201).json({
    ok: true,
    community,
    membership: { role: "member" },
    joined: true,
  });
});

const listMembers = asyncHandler(async (req, res) => {
  const community = req.community;
  const communityId = community._id;

  const limitRaw = req.query?.limit;
  const cursorRaw = req.query?.cursor;

  let limit = Number(limitRaw || 50);
  if (!Number.isFinite(limit) || limit < 1) limit = 50;
  if (limit > 100) limit = 100;

  const filter = { communityId };

  if (cursorRaw) {
    const cursorDate = new Date(cursorRaw);
    if (!Number.isNaN(cursorDate.getTime())) {
      filter.createdAt = { $lt: cursorDate };
    }
  }

  const memberships = await Membership.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("userId", "username avatarUrl createdAt")
    .lean();

  const nextCursor = memberships.length
    ? memberships[memberships.length - 1].createdAt
    : null;

  res.json({
    ok: true,
    community: { slug: community.slug, name: community.name },
    members: memberships.map((m) => ({
      user: m.userId,
      role: m.role,
      joinedAt: m.createdAt,
    })),
    nextCursor,
  });
});

const leaveCommunity = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const community = req.community;

  if (String(community.ownerId) === String(userId)) {
    return res.status(400).json({
      error: {
        message: "Owner cannot leave the community. Transfer ownership first.",
      },
    });
  }

  const deleted = await Membership.findOneAndDelete({
    userId,
    communityId: community._id,
  });

  res.json({ ok: true, left: Boolean(deleted) });
});

module.exports = {
  createCommunity,
  listMyCommunities,
  getCommunityBySlug,
  joinCommunityBySlug,
  listMembers,
  leaveCommunity,
}; 