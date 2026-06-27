const asyncHandler = require("../utils/asyncHandler");
const Community = require("../models/Community");
const CommunitySettings = require("../models/CommunitySettings");
const Membership = require("../models/Membership");
const Tier = require("../models/Tier");
const Post = require("../models/Post");

function startOfDaysAgo(days) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  now.setDate(now.getDate() - days);
  return now;
}

function sanitizePublicPost(post) {
  return {
    id: post._id,
    title: post.title,
    body: post.body,
    visibility: post.visibility,
    postType: post.postType,
    coverImageUrl: post.coverImageUrl || "",
    createdAt: post.createdAt,
  };
}

function buildDiscoveryLabelSignals({
  memberCount,
  recentPostCount,
  createdAt,
}) {
  const labels = [];

  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageDays = Math.floor(ageMs / 86400000);

  if (recentPostCount >= 5) labels.push("Trending");
  else if (recentPostCount >= 1) labels.push("Active");

  if (ageDays <= 14) labels.push("New");

  if (memberCount >= 25) labels.push("Growing");
  if (memberCount >= 100) labels.push("Popular");

  return labels.slice(0, 3);
}

// GET /api/discovery/communities
const listDiscoverableCommunities = asyncHandler(async (req, res) => {
  const settingsDocs = await CommunitySettings.find({ isDiscoverable: true }).lean();
  const communityIds = settingsDocs.map((s) => s.communityId);

  const communities = await Community.find({ _id: { $in: communityIds } })
    .sort({ createdAt: -1 })
    .lean();

  const settingsMap = new Map(settingsDocs.map((s) => [String(s.communityId), s]));
  const recentWindowStart = startOfDaysAgo(7);

  const results = await Promise.all(
    communities.map(async (community) => {
      const settings = settingsMap.get(String(community._id));

      const [memberCount, tierCount, recentPostCount, latestPublicPost] = await Promise.all([
        Membership.countDocuments({ communityId: community._id }),
        Tier.countDocuments({ communityId: community._id, isActive: true }),
        Post.countDocuments({
          communityId: community._id,
          isDeleted: false,
          createdAt: { $gte: recentWindowStart },
        }),
        Post.findOne({
          communityId: community._id,
          isDeleted: false,
          visibility: "public",
        })
          .sort({ createdAt: -1 })
          .lean(),
      ]);

      const labels = buildDiscoveryLabelSignals({
        memberCount,
        recentPostCount,
        createdAt: community.createdAt,
      });

      return {
        _id: community._id,
        name: community.name,
        slug: community.slug,
        createdAt: community.createdAt,
        description: settings?.description || "",
        brandHeadline: settings?.brandHeadline || "",
        bannerUrl: settings?.bannerUrl || "",
        avatarUrl: settings?.avatarUrl || "",
        accentColor: settings?.accentColor || "#c084fc",
        themeVibe: settings?.themeVibe || "dreamy",
        featuredPerks: Array.isArray(settings?.featuredPerks)
          ? settings.featuredPerks.filter(Boolean).slice(0, 3)
          : [],
        isDiscoverable: Boolean(settings?.isDiscoverable),
        isPublicFeed: Boolean(settings?.isPublicFeed),
        memberCount,
        tierCount,
        recentPostCount,
        latestActivityAt: latestPublicPost?.createdAt || community.createdAt,
        previewPost: latestPublicPost
          ? {
              id: latestPublicPost._id,
              title: latestPublicPost.title,
              body: latestPublicPost.body,
              createdAt: latestPublicPost.createdAt,
            }
          : null,
        labels,
      };
    })
  );

  res.json({ ok: true, communities: results });
});

// GET /api/communities/:slug/public
const getPublicCommunityProfile = asyncHandler(async (req, res) => {
  const community = req.community;

  const settings = await CommunitySettings.findOne({ communityId: community._id }).lean();
  if (!settings?.isDiscoverable) {
    return res.status(403).json({ error: { message: "This community is not public" } });
  }

  const [memberCount, tierCount, recentPublicPosts] = await Promise.all([
    Membership.countDocuments({ communityId: community._id }),
    Tier.countDocuments({ communityId: community._id, isActive: true }),
    settings.isPublicFeed
      ? Post.find({
          communityId: community._id,
          visibility: "public",
          isDeleted: false,
        })
          .sort({ isPinned: -1, createdAt: -1 })
          .limit(8)
          .lean()
      : [],
  ]);

  const recentPostCount = recentPublicPosts.length;
  const labels = buildDiscoveryLabelSignals({
    memberCount,
    recentPostCount,
    createdAt: community.createdAt,
  });

  res.json({
    ok: true,
    community: {
      _id: community._id,
      name: community.name,
      slug: community.slug,
      createdAt: community.createdAt,
      description: settings.description || "",
      brandHeadline: settings.brandHeadline || "",
      bannerUrl: settings.bannerUrl || "",
      avatarUrl: settings.avatarUrl || "",
      accentColor: settings.accentColor || "#c084fc",
      themeVibe: settings.themeVibe || "dreamy",
      featuredPerks: Array.isArray(settings.featuredPerks)
        ? settings.featuredPerks.filter(Boolean)
        : [],
      pinnedAnnouncement: {
        title: settings?.pinnedAnnouncement?.title || "",
        body: settings?.pinnedAnnouncement?.body || "",
        ctaLabel: settings?.pinnedAnnouncement?.ctaLabel || "",
        ctaUrl: settings?.pinnedAnnouncement?.ctaUrl || "",
      },
      isDiscoverable: Boolean(settings.isDiscoverable),
      isPublicFeed: Boolean(settings.isPublicFeed),
      memberCount,
      tierCount,
      labels,
      recentPublicPosts: recentPublicPosts.map(sanitizePublicPost),
    },
  });
});

module.exports = {
  listDiscoverableCommunities,
  getPublicCommunityProfile,
}; 