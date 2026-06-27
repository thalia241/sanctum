const bcrypt = require("bcrypt");
const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");
const { signToken } = require("../utils/tokens");

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
    photoShowcase: userDoc.photoShowcase || [],
    interests: userDoc.interests || [],
    fandomTags: userDoc.fandomTags || [],
    badges: userDoc.badges || [],
    theme: userDoc.theme,
    onboarding: sanitizeOnboarding(userDoc.onboarding),
    createdAt: userDoc.createdAt,
  };
}

const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  const existingEmail = await User.findOne({ email: email.toLowerCase() });
  if (existingEmail) {
    return res.status(409).json({ error: { message: "Email already in use" } });
  }

  const existingUsername = await User.findOne({ username });
  if (existingUsername) {
    return res.status(409).json({ error: { message: "Username already in use" } });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    username,
    email: email.toLowerCase(),
    passwordHash,
  });

  const token = signToken({ sub: String(user._id), username: user.username });

  res.status(201).json({
    ok: true,
    token,
    user: sanitizeUser(user),
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({ error: { message: "Invalid credentials" } });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ error: { message: "Invalid credentials" } });
  }

  const token = signToken({ sub: String(user._id), username: user.username });

  res.json({
    ok: true,
    token,
    user: sanitizeUser(user),
  });
});

const me = asyncHandler(async (req, res) => {
  const userId = req.user.sub;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ error: { message: "User not found" } });
  }

  res.json({ ok: true, user: sanitizeUser(user) });
});

module.exports = { register, login, me }; 