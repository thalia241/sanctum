const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");
const FriendRequest = require("../models/FriendRequest");
const { replaceMediaUsage, syncMediaSetUsages } = require("../utils/media");

const REQUIRED_ONBOARDING_ACTION_KEYS = [
  "profileSavedAt",
  "themeChosenAt",
  "joinedCommunityAt",
  "sentFriendRequestAt",
  "createdPostAt",
];

function sanitizeFriend(friendDoc) {
  return {
    id: friendDoc._id,
    username: friendDoc.username,
    displayName: friendDoc.displayName,
    avatarUrl: friendDoc.avatarUrl,
    status: friendDoc.status,
  };
}

function sanitizePhoto(photo) {
  return {
    imageUrl: photo?.imageUrl || "",
    caption: photo?.caption || "",
  };
}

function sanitizeBadge(badge) {
  return {
    label: badge?.label || "",
    color: badge?.color || "#c084fc",
  };
}

function sanitizeTagList(list = []) {
  return list.map((item) => String(item || "").trim()).filter(Boolean);
}

function sanitizeOnboarding(onboarding = {}) {
  return {
    completedAt: onboarding?.completedAt || null,
    dismissedAt: onboarding?.dismissedAt || null,
    lastCompletedStep: onboarding?.lastCompletedStep || "",
    actions: {
      profileSavedAt: onboarding?.actions?.profileSavedAt || null,
      themeChosenAt: onboarding?.actions?.themeChosenAt || null,
      joinedCommunityAt: onboarding?.actions?.joinedCommunityAt || null,
      sentFriendRequestAt: onboarding?.actions?.sentFriendRequestAt || null,
      createdPostAt: onboarding?.actions?.createdPostAt || null,
      sentDmAt: onboarding?.actions?.sentDmAt || null,
    },
  };
}

function sanitizeUser(userDoc) {
  return {
    id: userDoc._id,
    username: userDoc.username,
    email: userDoc.email,
    avatarUrl: userDoc.avatarUrl,
    bannerUrl: userDoc.bannerUrl,
    displayName: userDoc.displayName,
    bio: userDoc.bio,
    status: userDoc.status,
    favoriteSong: userDoc.favoriteSong,
    photoShowcase: (userDoc.photoShowcase || []).map(sanitizePhoto),
    interests: sanitizeTagList(userDoc.interests || []),
    fandomTags: sanitizeTagList(userDoc.fandomTags || []),
    badges: (userDoc.badges || []).map(sanitizeBadge),
    theme: userDoc.theme,
    onboarding: sanitizeOnboarding(userDoc.onboarding),
    topFriends: (userDoc.topFriends || []).map(sanitizeFriend),
    createdAt: userDoc.createdAt,
    updatedAt: userDoc.updatedAt,
  };
}

function buildRelationship({ viewer, targetId, outgoingMap, incomingMap }) {
  const targetIdString = String(targetId);
  const friendIds = new Set((viewer?.friends || []).map((id) => String(id)));

  if (friendIds.has(targetIdString)) {
    return { status: "friends", isFriend: true };
  }

  if (outgoingMap.has(targetIdString)) {
    return {
      status: "outgoing_pending",
      isFriend: false,
      requestId: outgoingMap.get(targetIdString),
    };
  }

  if (incomingMap.has(targetIdString)) {
    return {
      status: "incoming_pending",
      isFriend: false,
      requestId: incomingMap.get(targetIdString),
    };
  }

  return { status: "none", isFriend: false };
}

function sanitizeSearchUser(userDoc, relationship) {
  return {
    id: userDoc._id,
    username: userDoc.username,
    displayName: userDoc.displayName,
    avatarUrl: userDoc.avatarUrl,
    status: userDoc.status,
    relationship,
  };
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

async function stampOnboardingAction(userId, actionKey, stepName) {
  await User.findOneAndUpdate(
    {
      _id: userId,
      [`onboarding.actions.${actionKey}`]: null,
    },
    {
      $set: {
        [`onboarding.actions.${actionKey}`]: new Date(),
        "onboarding.lastCompletedStep": stepName,
      },
    }
  );

  await maybeCompleteOnboarding(userId);
}

const getMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.sub).populate(
    "topFriends",
    "username displayName avatarUrl status"
  );

  if (!user) {
    return res.status(404).json({ error: { message: "User not found" } });
  }

  res.json({
    ok: true,
    user: sanitizeUser(user),
  });
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const existingUser = await User.findById(req.user.sub);
  if (!existingUser) {
    return res.status(404).json({ error: { message: "User not found" } });
  }

  const allowedFields = [
    "avatarUrl",
    "bannerUrl",
    "displayName",
    "bio",
    "status",
    "favoriteSong",
    "photoShowcase",
    "interests",
    "fandomTags",
    "badges",
    "theme",
    "onboarding",
  ];

  const patch = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) {
      patch[key] = req.body[key];
    }
  }

  if (Array.isArray(patch.photoShowcase)) {
    patch.photoShowcase = patch.photoShowcase
      .filter((item) => item && (item.imageUrl || item.caption))
      .slice(0, 6)
      .map((item) => ({
        imageUrl: String(item.imageUrl || "").trim(),
        caption: String(item.caption || "").trim(),
      }));
  }

  if (Array.isArray(patch.interests)) {
    patch.interests = patch.interests
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  if (Array.isArray(patch.fandomTags)) {
    patch.fandomTags = patch.fandomTags
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  if (Array.isArray(patch.badges)) {
    patch.badges = patch.badges
      .filter((badge) => badge && badge.label)
      .slice(0, 8)
      .map((badge) => ({
        label: String(badge.label || "").trim(),
        color: String(badge.color || "#c084fc").trim() || "#c084fc",
      }));
  }

  let profileWasMeaningfullySaved = false;
  if (
    req.body.displayName !== undefined ||
    req.body.bio !== undefined ||
    req.body.status !== undefined
  ) {
    const nextDisplayName =
      req.body.displayName !== undefined
        ? String(req.body.displayName || "").trim()
        : String(existingUser.displayName || "").trim();

    const nextBio =
      req.body.bio !== undefined
        ? String(req.body.bio || "").trim()
        : String(existingUser.bio || "").trim();

    const nextStatus =
      req.body.status !== undefined
        ? String(req.body.status || "").trim()
        : String(existingUser.status || "").trim();

    profileWasMeaningfullySaved = Boolean(nextDisplayName || nextBio || nextStatus);
  }

  let themeWasChanged = false;
  if (req.body.theme && typeof req.body.theme === "object") {
    const currentTheme = existingUser.theme || {};
    const incomingTheme = req.body.theme || {};

    themeWasChanged =
      (incomingTheme.accentColor ?? currentTheme.accentColor) !== currentTheme.accentColor ||
      (incomingTheme.backgroundColor ?? currentTheme.backgroundColor) !==
        currentTheme.backgroundColor ||
      (incomingTheme.panelColor ?? currentTheme.panelColor) !== currentTheme.panelColor ||
      (incomingTheme.textColor ?? currentTheme.textColor) !== currentTheme.textColor ||
      (incomingTheme.vibe ?? currentTheme.vibe) !== currentTheme.vibe;
  }

  if (patch.onboarding && typeof patch.onboarding === "object") {
    const existingOnboarding =
      typeof existingUser.onboarding?.toObject === "function"
        ? existingUser.onboarding.toObject()
        : existingUser.onboarding || {};

    const incomingOnboarding = patch.onboarding || {};

    patch.onboarding = {
      ...existingOnboarding,
      ...incomingOnboarding,
      actions: {
        ...(existingOnboarding.actions || {}),
        ...(incomingOnboarding.actions || {}),
      },
    };
  }

  const oldAvatarUrl = existingUser.avatarUrl || "";
  const oldBannerUrl = existingUser.bannerUrl || "";
  const oldShowcaseUrls = (existingUser.photoShowcase || [])
    .map((item) => item?.imageUrl || "")
    .filter(Boolean);

  const updatedUser = await User.findByIdAndUpdate(
    req.user.sub,
    { $set: patch },
    { new: true, runValidators: true }
  ).populate("topFriends", "username displayName avatarUrl status");

  const newShowcaseUrls = (updatedUser.photoShowcase || [])
    .map((item) => item?.imageUrl || "")
    .filter(Boolean);

  const usageBase = {
    entityType: "user",
    entityId: String(updatedUser._id),
  };

  await Promise.all([
    replaceMediaUsage({
      oldUrl: oldAvatarUrl,
      newUrl: updatedUser.avatarUrl || "",
      usageTarget: { ...usageBase, field: "avatarUrl" },
    }),
    replaceMediaUsage({
      oldUrl: oldBannerUrl,
      newUrl: updatedUser.bannerUrl || "",
      usageTarget: { ...usageBase, field: "bannerUrl" },
    }),
    syncMediaSetUsages({
      oldUrls: oldShowcaseUrls,
      newUrls: newShowcaseUrls,
      usageTarget: { ...usageBase, field: "photoShowcase" },
    }),
  ]);

  if (profileWasMeaningfullySaved) {
    await stampOnboardingAction(updatedUser._id, "profileSavedAt", "profile");
  }

  if (themeWasChanged) {
    await stampOnboardingAction(updatedUser._id, "themeChosenAt", "theme");
  }

  const freshUser = await User.findById(updatedUser._id).populate(
    "topFriends",
    "username displayName avatarUrl status"
  );

  res.json({
    ok: true,
    user: sanitizeUser(freshUser),
  });
});

const getProfileByUsername = asyncHandler(async (req, res) => {
  const user = await User.findOne({ username: req.params.username }).populate(
    "topFriends",
    "username displayName avatarUrl status"
  );

  if (!user) {
    return res.status(404).json({ error: { message: "User not found" } });
  }

  res.json({
    ok: true,
    user: sanitizeUser(user),
  });
});

const searchUsers = asyncHandler(async (req, res) => {
  const viewer = await User.findById(req.user.sub).lean();
  if (!viewer) {
    return res.status(404).json({ error: { message: "User not found" } });
  }

  const q = String(req.query.q || "").trim();
  if (!q) {
    return res.json({ ok: true, users: [] });
  }

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "i");

  const users = await User.find({
    _id: { $ne: req.user.sub },
    $or: [{ username: regex }, { displayName: regex }, { status: regex }],
  })
    .select("username displayName avatarUrl status")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const userIds = users.map((user) => user._id);

  const [outgoingRequests, incomingRequests] = await Promise.all([
    FriendRequest.find({
      fromUserId: req.user.sub,
      toUserId: { $in: userIds },
      status: "pending",
    })
      .select("_id toUserId")
      .lean(),
    FriendRequest.find({
      fromUserId: { $in: userIds },
      toUserId: req.user.sub,
      status: "pending",
    })
      .select("_id fromUserId")
      .lean(),
  ]);

  const outgoingMap = new Map(
    outgoingRequests.map((request) => [String(request.toUserId), String(request._id)])
  );
  const incomingMap = new Map(
    incomingRequests.map((request) => [String(request.fromUserId), String(request._id)])
  );

  res.json({
    ok: true,
    users: users.map((user) =>
      sanitizeSearchUser(
        user,
        buildRelationship({
          viewer,
          targetId: user._id,
          outgoingMap,
          incomingMap,
        })
      )
    ),
  });
});

module.exports = {
  getMyProfile,
  updateMyProfile,
  getProfileByUsername,
  searchUsers,
}; 