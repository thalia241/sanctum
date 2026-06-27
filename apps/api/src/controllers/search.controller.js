const asyncHandler = require("../utils/asyncHandler");
const Community = require("../models/Community");
const CommunitySettings = require("../models/CommunitySettings");
const Membership = require("../models/Membership");
const Ban = require("../models/Ban");
const Post = require("../models/Post");

// GET /api/search/communities?q=...
const searchDiscoverableCommunities = asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim();

  if (!q) {
    return res.status(400).json({
      error: { message: "Missing search query" },
    });
  }

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nameRegex = new RegExp(escaped, "i");

  // 1) Find discoverable settings that match text fields
  const settingsTextMatches = await CommunitySettings.find({
    isDiscoverable: true,
    $or: [
      { description: nameRegex },
      { onboardingMessage: nameRegex },
      { transparencyNote: nameRegex },
    ],
  })
    .select("communityId description isDiscoverable isPublicFeed")
    .lean();

  const settingsTextIds = settingsTextMatches.map((s) => s.communityId);

  // 2) Find communities matching name or slug
  const communityNameMatches = await Community.find({
    $or: [{ name: nameRegex }, { slug: nameRegex }],
  }).lean();

  const communityNameIds = communityNameMatches.map((c) => c._id);

  // 3) Only keep communities that are discoverable
  const discoverableSettings = await CommunitySettings.find({
    isDiscoverable: true,
    communityId: { $in: communityNameIds },
  })
    .select("communityId description isDiscoverable isPublicFeed")
    .lean();

  const discoverableNameIds = discoverableSettings.map((s) => s.communityId);

  // 4) Merge all discoverable ids
  const allCommunityIds = [
    ...new Set([...settingsTextIds, ...discoverableNameIds].map((id) => String(id))),
  ];

  if (allCommunityIds.length === 0) {
    return res.json({ ok: true, communities: [] });
  }

  const communities = await Community.find({
    _id: { $in: allCommunityIds },
  })
    .sort({ createdAt: -1 })
    .lean();

  const settingsMap = new Map(
    [...settingsTextMatches, ...discoverableSettings].map((s) => [String(s.communityId), s])
  );

  const results = await Promise.all(
    communities.map(async (community) => {
      const settings = settingsMap.get(String(community._id));
      const memberCount = await Membership.countDocuments({
        communityId: community._id,
      });

      return {
        _id: community._id,
        name: community.name,
        slug: community.slug,
        description: settings?.description || "",
        isDiscoverable: Boolean(settings?.isDiscoverable),
        isPublicFeed: Boolean(settings?.isPublicFeed),
        memberCount,
        createdAt: community.createdAt,
      };
    })
  );

  res.json({ ok: true, communities: results });
});

async function ensureCanSearchCommunityPosts({ userId, communityId }) {
  const ban = await Ban.findOne({ userId, communityId }).lean();
  if (ban) {
    throw new Error("You are banned from this community");
  }

  const membership = await Membership.findOne({
    userId,
    communityId,
  }).lean();

  if (!membership) {
    throw new Error("Not a member of this community");
  }

  const settings = await CommunitySettings.findOne({ communityId }).lean();
  if (settings?.requireCharterAck && !membership.acknowledgedCharterAt) {
    throw new Error("Charter acknowledgment required");
  }

  return { membership, settings };
}

// GET /api/communities/:slug/search/posts?q=...
const searchCommunityPosts = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const communityId = req.community._id;
  const q = String(req.query.q || "").trim();

  if (!q) {
    return res.status(400).json({
      error: { message: "Missing search query" },
    });
  }

  try {
    await ensureCanSearchCommunityPosts({ userId, communityId });
  } catch (err) {
    const message = err.message || "Access denied";

    if (
      message === "You are banned from this community" ||
      message === "Not a member of this community" ||
      message === "Charter acknowledgment required"
    ) {
      return res.status(403).json({ error: { message } });
    }

    throw err;
  }

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "i");

  const posts = await Post.find({
    communityId,
    isDeleted: false,
    $or: [{ title: regex }, { body: regex }],
  })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ ok: true, posts });
});

module.exports = {
  searchDiscoverableCommunities,
  searchCommunityPosts,
}; 