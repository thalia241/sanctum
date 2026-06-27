const asyncHandler = require("../utils/asyncHandler");
const ProfilePost = require("../models/ProfilePost");
const User = require("../models/User");

const REQUIRED_ONBOARDING_ACTION_KEYS = [
  "profileSavedAt",
  "themeChosenAt",
  "joinedCommunityAt",
  "sentFriendRequestAt",
  "createdPostAt",
];

function sanitizeAuthor(user) {
  if (!user) return null;

  return {
    id: user._id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    status: user.status,
  };
}

function sanitizePost(post) {
  return {
    id: post._id,
    profileOwnerId: post.profileOwnerId,
    authorId: post.authorId?._id || post.authorId,
    author: post.authorId?._id ? sanitizeAuthor(post.authorId) : null,
    body: post.body,
    visibility: post.visibility,
    isPinned: Boolean(post.isPinned),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

function isFriend(viewer, ownerId) {
  return (viewer?.friends || []).some((id) => String(id) === String(ownerId));
}

async function maybeCompleteOnboarding(userId) {
  const user = await User.findById(userId).lean();
  if (!user) return;

  const onboarding = user.onboarding || {};
  const actions = onboarding.actions || {};

  const hasAllRequired = REQUIRED_ONBOARDING_ACTION_KEYS.every((key) => Boolean(actions[key]));
  if (!hasAllRequired) return;
  if (onboarding.completedAt) return;

  await User.findByIdAndUpdate(userId, {
    $set: {
      "onboarding.completedAt": new Date(),
      "onboarding.lastCompletedStep": "completed",
    },
  });
}

async function stampOnboardingCreatedPost(userId) {
  await User.findOneAndUpdate(
    {
      _id: userId,
      "onboarding.actions.createdPostAt": null,
    },
    {
      $set: {
        "onboarding.actions.createdPostAt": new Date(),
        "onboarding.lastCompletedStep": "post",
      },
    }
  );

  await maybeCompleteOnboarding(userId);
}

const listProfilePosts = asyncHandler(async (req, res) => {
  const viewerId = req.user.sub;
  const { username } = req.params;

  const profileOwner = await User.findOne({ username }).lean();
  if (!profileOwner) {
    return res.status(404).json({ error: { message: "User not found" } });
  }

  const viewer = await User.findById(viewerId).lean();
  if (!viewer) {
    return res.status(404).json({ error: { message: "User not found" } });
  }

  const isOwnProfile = String(profileOwner._id) === String(viewerId);
  const areFriends = isFriend(viewer, profileOwner._id);

  const allowedVisibility = ["public"];
  if (isOwnProfile || areFriends) {
    allowedVisibility.push("friends");
  }

  const posts = await ProfilePost.find({
    profileOwnerId: profileOwner._id,
    isDeleted: false,
    visibility: { $in: allowedVisibility },
  })
    .sort({ isPinned: -1, createdAt: -1 })
    .populate("authorId", "username displayName avatarUrl status")
    .lean();

  res.json({
    ok: true,
    posts: posts.map(sanitizePost),
    viewer: {
      isOwnProfile,
      areFriends,
    },
  });
});

const createProfilePost = asyncHandler(async (req, res) => {
  const viewerId = req.user.sub;
  const { username } = req.params;
  const body = String(req.body?.body || "").trim();
  const visibilityRaw = String(req.body?.visibility || "public").trim();

  if (!body) {
    return res.status(400).json({
      error: { message: "Post body is required" },
    });
  }

  const profileOwner = await User.findOne({ username });
  if (!profileOwner) {
    return res.status(404).json({ error: { message: "User not found" } });
  }

  const viewer = await User.findById(viewerId);
  if (!viewer) {
    return res.status(404).json({ error: { message: "User not found" } });
  }

  const isOwnProfile = String(profileOwner._id) === String(viewerId);
  const areFriends = isFriend(viewer, profileOwner._id);

  if (!isOwnProfile && !areFriends) {
    return res.status(403).json({
      error: { message: "You can only post on your own profile or a friend's profile" },
    });
  }

  const visibility = ["public", "friends"].includes(visibilityRaw)
    ? visibilityRaw
    : "public";

  const post = await ProfilePost.create({
    profileOwnerId: profileOwner._id,
    authorId: viewerId,
    body,
    visibility,
  });

  await stampOnboardingCreatedPost(viewerId);

  const populated = await ProfilePost.findById(post._id)
    .populate("authorId", "username displayName avatarUrl status")
    .lean();

  res.status(201).json({
    ok: true,
    post: sanitizePost(populated),
  });
});

const togglePinProfilePost = asyncHandler(async (req, res) => {
  const viewerId = req.user.sub;
  const { postId } = req.params;
  const isPinned = Boolean(req.body?.isPinned);

  const post = await ProfilePost.findById(postId);
  if (!post || post.isDeleted) {
    return res.status(404).json({ error: { message: "Profile post not found" } });
  }

  if (String(post.profileOwnerId) !== String(viewerId)) {
    return res.status(403).json({
      error: { message: "Only the profile owner can pin posts" },
    });
  }

  if (isPinned) {
    await ProfilePost.updateMany(
      { profileOwnerId: post.profileOwnerId, _id: { $ne: post._id } },
      { $set: { isPinned: false } }
    );
  }

  post.isPinned = isPinned;
  await post.save();

  const populated = await ProfilePost.findById(post._id)
    .populate("authorId", "username displayName avatarUrl status")
    .lean();

  res.json({
    ok: true,
    post: sanitizePost(populated),
  });
});

const deleteProfilePost = asyncHandler(async (req, res) => {
  const viewerId = req.user.sub;
  const { postId } = req.params;

  const post = await ProfilePost.findById(postId);
  if (!post || post.isDeleted) {
    return res.status(404).json({ error: { message: "Profile post not found" } });
  }

  const canDelete =
    String(post.authorId) === String(viewerId) ||
    String(post.profileOwnerId) === String(viewerId);

  if (!canDelete) {
    return res.status(403).json({
      error: { message: "You do not have permission to delete this post" },
    });
  }

  post.isDeleted = true;
  post.deletedAt = new Date();
  await post.save();

  res.json({ ok: true });
});

module.exports = {
  listProfilePosts,
  createProfilePost,
  togglePinProfilePost,
  deleteProfilePost,
}; 