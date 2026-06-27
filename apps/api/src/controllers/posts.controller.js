const asyncHandler = require("../utils/asyncHandler");
const Post = require("../models/Post");
const Membership = require("../models/Membership");
const CommunitySettings = require("../models/CommunitySettings");
const Subscription = require("../models/Subscription");
const {
  registerMediaUsageByUrl,
  replaceMediaUsage,
  unregisterMediaUsageByUrl,
} = require("../utils/media");

const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"];

async function getMembership(userId, communityId) {
  return Membership.findOne({ userId, communityId }).lean();
}

async function hasActiveSubscription(userId, communityId) {
  const subscription = await Subscription.findOne({
    userId,
    communityId,
    status: { $in: ACTIVE_SUBSCRIPTION_STATUSES },
  }).lean();

  return Boolean(subscription);
}

function canCreateCreatorUpdate(membership) {
  return membership?.role === "owner" || membership?.role === "mod";
}

function canPinPosts(membership) {
  return membership?.role === "owner" || membership?.role === "mod";
}

function sanitizePost(post) {
  return {
    _id: post._id,
    communityId: post.communityId,
    authorId: post.authorId,
    title: post.title,
    body: post.body,
    visibility: post.visibility,
    postType: post.postType || "standard",
    isPinned: Boolean(post.isPinned),
    accessTierLabel: post.accessTierLabel || "",
    coverImageUrl: post.coverImageUrl || "",
    embedUrl: post.embedUrl || "",
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

// POST /api/communities/:slug/posts
const createPost = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const communityId = req.community._id;

  const {
    title,
    body,
    visibility = "members",
    postType = "standard",
    isPinned = false,
    accessTierLabel = "",
    coverImageUrl = "",
    embedUrl = "",
  } = req.body;

  const membership = await getMembership(userId, communityId);
  if (!membership) {
    return res.status(403).json({ error: { message: "Not a member of this community" } });
  }

  const trimmedTitle = String(title || "").trim();
  const trimmedBody = String(body || "").trim();

  if (!trimmedTitle || !trimmedBody) {
    return res.status(400).json({
      error: { message: "Title and body are required" },
    });
  }

  const normalizedVisibility = ["public", "members", "subscribers"].includes(visibility)
    ? visibility
    : "members";

  const requestedPostType = ["standard", "creator_update"].includes(postType)
    ? postType
    : "standard";

  const normalizedPostType = canCreateCreatorUpdate(membership)
    ? requestedPostType
    : "standard";

  const normalizedPinned = canPinPosts(membership) ? Boolean(isPinned) : false;

  const normalizedAccessTierLabel = String(accessTierLabel || "").trim();
  const normalizedCoverImageUrl = String(coverImageUrl || "").trim();
  const normalizedEmbedUrl = String(embedUrl || "").trim();

  const post = await Post.create({
    communityId,
    authorId: userId,
    title: trimmedTitle,
    body: trimmedBody,
    visibility: normalizedVisibility,
    postType: normalizedPostType,
    isPinned: normalizedPinned,
    accessTierLabel: normalizedVisibility === "subscribers" ? normalizedAccessTierLabel : "",
    coverImageUrl: normalizedCoverImageUrl,
    embedUrl: normalizedEmbedUrl,
  });

  const usageBase = {
    entityType: "post",
    entityId: String(post._id),
  };

  await Promise.all([
    registerMediaUsageByUrl(post.coverImageUrl || "", {
      ...usageBase,
      field: "coverImageUrl",
    }),
    registerMediaUsageByUrl(post.embedUrl || "", {
      ...usageBase,
      field: "embedUrl",
    }),
  ]);

  const populated = await Post.findById(post._id)
    .populate("authorId", "username displayName avatarUrl bannerUrl")
    .lean();

  res.status(201).json({
    ok: true,
    post: sanitizePost(populated),
  });
});

// GET /api/communities/:slug/posts
const listPosts = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const communityId = req.community._id;

  const membership = await getMembership(userId, communityId);
  if (!membership) {
    return res.status(403).json({ error: { message: "Not a member of this community" } });
  }

  const isModerator = membership.role === "owner" || membership.role === "mod";
  const isSubscriber = await hasActiveSubscription(userId, communityId);

  const allowedVisibility = ["public", "members"];
  if (isSubscriber || isModerator) {
    allowedVisibility.push("subscribers");
  }

  const posts = await Post.find({
    communityId,
    isDeleted: false,
    visibility: { $in: allowedVisibility },
  })
    .sort({ isPinned: -1, createdAt: -1 })
    .populate("authorId", "username displayName avatarUrl bannerUrl")
    .lean();

  res.json({
    ok: true,
    posts: posts.map(sanitizePost),
    viewer: {
      role: membership.role,
      isSubscriber,
    },
  });
});

// PATCH /api/posts/:postId
const updatePost = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { postId } = req.params;

  const post = await Post.findById(postId);
  if (!post || post.isDeleted) {
    return res.status(404).json({ error: { message: "Post not found" } });
  }

  const membership = await Membership.findOne({
    userId,
    communityId: post.communityId,
  }).lean();

  if (!membership) {
    return res.status(403).json({ error: { message: "Not a member of this community" } });
  }

  const isAuthor = String(post.authorId) === String(userId);
  const isModerator = membership.role === "mod" || membership.role === "owner";

  if (!isAuthor && !isModerator) {
    return res.status(403).json({
      error: { message: "You do not have permission to update this post" },
    });
  }

  const oldCoverImageUrl = post.coverImageUrl || "";
  const oldEmbedUrl = post.embedUrl || "";

  if (req.body.title !== undefined) {
    post.title = String(req.body.title || "").trim();
  }
  if (req.body.body !== undefined) {
    post.body = String(req.body.body || "").trim();
  }
  if (req.body.visibility !== undefined) {
    const visibility = String(req.body.visibility || "").trim();
    if (["public", "members", "subscribers"].includes(visibility)) {
      post.visibility = visibility;
    }
  }
  if (req.body.postType !== undefined && canCreateCreatorUpdate(membership)) {
    const postType = String(req.body.postType || "").trim();
    if (["standard", "creator_update"].includes(postType)) {
      post.postType = postType;
    }
  }
  if (req.body.isPinned !== undefined && canPinPosts(membership)) {
    post.isPinned = Boolean(req.body.isPinned);
  }
  if (req.body.accessTierLabel !== undefined) {
    post.accessTierLabel =
      post.visibility === "subscribers"
        ? String(req.body.accessTierLabel || "").trim()
        : "";
  }
  if (req.body.coverImageUrl !== undefined) {
    post.coverImageUrl = String(req.body.coverImageUrl || "").trim();
  }
  if (req.body.embedUrl !== undefined) {
    post.embedUrl = String(req.body.embedUrl || "").trim();
  }

  await post.save();

  const usageBase = {
    entityType: "post",
    entityId: String(post._id),
  };

  await Promise.all([
    replaceMediaUsage({
      oldUrl: oldCoverImageUrl,
      newUrl: post.coverImageUrl || "",
      usageTarget: { ...usageBase, field: "coverImageUrl" },
    }),
    replaceMediaUsage({
      oldUrl: oldEmbedUrl,
      newUrl: post.embedUrl || "",
      usageTarget: { ...usageBase, field: "embedUrl" },
    }),
  ]);

  const populated = await Post.findById(post._id)
    .populate("authorId", "username displayName avatarUrl bannerUrl")
    .lean();

  res.json({
    ok: true,
    post: sanitizePost(populated),
  });
});

// DELETE /api/posts/:postId
const deletePost = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { postId } = req.params;

  const post = await Post.findById(postId);
  if (!post || post.isDeleted) {
    return res.status(404).json({ error: { message: "Post not found" } });
  }

  const membership = await Membership.findOne({
    userId,
    communityId: post.communityId,
  }).lean();

  if (!membership) {
    return res.status(403).json({ error: { message: "Not a member of this community" } });
  }

  const isAuthor = String(post.authorId) === String(userId);
  const isModerator = membership.role === "mod" || membership.role === "owner";

  if (!isAuthor && !isModerator) {
    return res.status(403).json({
      error: { message: "You do not have permission to delete this post" },
    });
  }

  const usageBase = {
    entityType: "post",
    entityId: String(post._id),
  };

  const coverImageUrl = post.coverImageUrl || "";
  const embedUrl = post.embedUrl || "";

  post.isDeleted = true;
  post.deletedAt = new Date();
  post.deletedBy = userId;
  await post.save();

  await Promise.all([
    unregisterMediaUsageByUrl(coverImageUrl, {
      ...usageBase,
      field: "coverImageUrl",
    }),
    unregisterMediaUsageByUrl(embedUrl, {
      ...usageBase,
      field: "embedUrl",
    }),
  ]);

  res.json({ ok: true });
});

// GET /api/communities/:slug/posts/public
const listPublicPosts = asyncHandler(async (req, res) => {
  const communityId = req.community._id;

  const settings = await CommunitySettings.findOne({ communityId }).lean();
  if (!settings?.isPublicFeed) {
    return res.status(403).json({ error: { message: "Public feed is disabled for this community" } });
  }

  const posts = await Post.find({
    communityId,
    visibility: "public",
    isDeleted: false,
  })
    .sort({ isPinned: -1, createdAt: -1 })
    .populate("authorId", "username displayName avatarUrl bannerUrl")
    .lean();

  res.json({
    ok: true,
    posts: posts.map(sanitizePost),
  });
});

module.exports = {
  createPost,
  listPosts,
  updatePost,
  deletePost,
  listPublicPosts,
};    