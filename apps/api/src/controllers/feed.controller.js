const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");
const Membership = require("../models/Membership");
const Community = require("../models/Community");
const Post = require("../models/Post");
const ProfilePost = require("../models/ProfilePost");

function hoursSince(dateValue) {
  if (!dateValue) return 999999;
  const diffMs = Date.now() - new Date(dateValue).getTime();
  return diffMs / 3600000;
}

function recencyScore(dateValue) {
  const hours = hoursSince(dateValue);

  if (hours <= 2) return 60;
  if (hours <= 6) return 45;
  if (hours <= 12) return 35;
  if (hours <= 24) return 28;
  if (hours <= 48) return 20;
  if (hours <= 72) return 14;
  if (hours <= 24 * 7) return 8;
  if (hours <= 24 * 14) return 4;
  return 0;
}

function joinedRecently(joinedAt) {
  if (!joinedAt) return false;
  const hours = hoursSince(joinedAt);
  return hours <= 24 * 14;
}

function sanitizeUser(user) {
  if (!user) return null;

  return {
    id: user._id,
    username: user.username,
    displayName: user.displayName || "",
    avatarUrl: user.avatarUrl || "",
    status: user.status || "",
  };
}

function sanitizeCommunity(community) {
  if (!community) return null;

  return {
    id: community._id,
    name: community.name,
    slug: community.slug,
  };
}

function buildProfileFeedItem(post, scoreBreakdown = {}) {
  return {
    id: String(post._id),
    itemType: "profile_post",
    actor: sanitizeUser(post.authorId),
    profileOwner: sanitizeUser(post.profileOwnerId),
    body: post.body,
    visibility: post.visibility,
    isPinned: Boolean(post.isPinned),
    createdAt: post.createdAt,
    scoreBreakdown,
  };
}

function buildCommunityFeedItem(post, scoreBreakdown = {}) {
  return {
    id: String(post._id),
    itemType: "community_post",
    actor: sanitizeUser(post.authorId),
    community: sanitizeCommunity(post.communityId),
    title: post.title,
    body: post.body,
    visibility: post.visibility,
    isPinned: Boolean(post.isPinned),
    postType: post.postType || "standard",
    coverImageUrl: post.coverImageUrl || "",
    createdAt: post.createdAt,
    scoreBreakdown,
  };
}

function scoreProfilePost(post, viewerId, friendIdSet) {
  let score = 0;
  const breakdown = {};

  const createdRecency = recencyScore(post.createdAt);
  score += createdRecency;
  breakdown.recency = createdRecency;

  const authorId = String(post.authorId?._id || post.authorId || "");
  const profileOwnerId = String(post.profileOwnerId?._id || post.profileOwnerId || "");

  if (authorId === String(viewerId)) {
    score += 18;
    breakdown.ownAuthor = 18;
  }

  if (profileOwnerId === String(viewerId)) {
    score += 12;
    breakdown.onOwnProfile = 12;
  }

  if (friendIdSet.has(authorId)) {
    score += 35;
    breakdown.friendAuthor = 35;
  }

  if (friendIdSet.has(profileOwnerId)) {
    score += 20;
    breakdown.friendProfileOwner = 20;
  }

  if (post.visibility === "friends") {
    score += 6;
    breakdown.friendsVisibility = 6;
  }

  if (post.isPinned) {
    score += 8;
    breakdown.pinned = 8;
  }

  return { total: score, breakdown };
}

function scoreCommunityPost(post, membershipByCommunityId) {
  let score = 0;
  const breakdown = {};

  const createdRecency = recencyScore(post.createdAt);
  score += createdRecency;
  breakdown.recency = createdRecency;

  const communityId = String(post.communityId?._id || post.communityId || "");
  const membership = membershipByCommunityId.get(communityId);

  if (membership) {
    score += 30;
    breakdown.joinedCommunity = 30;

    if (joinedRecently(membership.createdAt)) {
      score += 18;
      breakdown.recentlyJoinedCommunity = 18;
    }

    if (membership.role === "owner") {
      score += 8;
      breakdown.ownedCommunity = 8;
    }

    if (membership.role === "admin" || membership.role === "moderator") {
      score += 4;
      breakdown.staffedCommunity = 4;
    }
  }

  if (post.postType === "creator_update") {
    score += 10;
    breakdown.creatorUpdate = 10;
  }

  if (post.visibility === "public") {
    score += 4;
    breakdown.publicVisibility = 4;
  }

  if (post.isPinned) {
    score += 10;
    breakdown.pinned = 10;
  }

  return { total: score, breakdown };
}

const getFeed = asyncHandler(async (req, res) => {
  const viewerId = req.user.sub;
  const limitRaw = Number(req.query.limit || 30);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 60) : 30;

  const viewer = await User.findById(viewerId).lean();
  if (!viewer) {
    return res.status(404).json({ error: { message: "User not found" } });
  }

  const friendIds = (viewer.friends || []).map((id) => String(id));
  const friendIdSet = new Set(friendIds);

  const memberships = await Membership.find({ userId: viewerId }).lean();
  const joinedCommunityIds = memberships.map((m) => m.communityId);
  const membershipByCommunityId = new Map(
    memberships.map((m) => [String(m.communityId), m])
  );

  const profileOwnerIds = [viewerId, ...friendIds];

  const [profilePosts, communityPosts] = await Promise.all([
    ProfilePost.find({
      profileOwnerId: { $in: profileOwnerIds },
      isDeleted: false,
      visibility: { $in: ["public", "friends"] },
    })
      .sort({ createdAt: -1 })
      .limit(80)
      .populate("authorId", "username displayName avatarUrl status")
      .populate("profileOwnerId", "username displayName avatarUrl status")
      .lean(),

    Post.find({
      communityId: { $in: joinedCommunityIds },
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(120)
      .populate("authorId", "username displayName avatarUrl status")
      .populate("communityId", "name slug")
      .lean(),
  ]);

  const scoredProfileItems = profilePosts.map((post) => {
    const scoring = scoreProfilePost(post, viewerId, friendIdSet);

    return {
      score: scoring.total,
      createdAt: post.createdAt,
      item: buildProfileFeedItem(post, scoring.breakdown),
    };
  });

  const scoredCommunityItems = communityPosts.map((post) => {
    const scoring = scoreCommunityPost(post, membershipByCommunityId);

    return {
      score: scoring.total,
      createdAt: post.createdAt,
      item: buildCommunityFeedItem(post, scoring.breakdown),
    };
  });

  const merged = [...scoredProfileItems, ...scoredCommunityItems]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, limit)
    .map((entry) => entry.item);

  res.json({
    ok: true,
    items: merged,
    meta: {
      totalProfileCandidates: profilePosts.length,
      totalCommunityCandidates: communityPosts.length,
    },
  });
});

module.exports = {
  getFeed,
}; 