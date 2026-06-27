const asyncHandler = require("../utils/asyncHandler");
const CommunitySettings = require("../models/CommunitySettings");
const { replaceMediaUsage } = require("../utils/media");

function sanitizeFeaturedPerks(value) {
  if (!Array.isArray(value)) return undefined;

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 6);
}

function sanitizePinnedAnnouncement(value) {
  if (!value || typeof value !== "object") return undefined;

  return {
    title: String(value.title || "").trim(),
    body: String(value.body || "").trim(),
    ctaLabel: String(value.ctaLabel || "").trim(),
    ctaUrl: String(value.ctaUrl || "").trim(),
  };
}

function sanitizeHex(value, fallback) {
  const raw = String(value || "").trim();
  return /^#([0-9a-fA-F]{6})$/.test(raw) ? raw : fallback;
}

const getCommunitySettings = asyncHandler(async (req, res) => {
  const communityId = req.community._id;

  let settings = await CommunitySettings.findOne({ communityId }).lean();

  if (!settings) {
    settings = await CommunitySettings.create({ communityId });
    settings = settings.toObject();
  }

  res.json({ ok: true, settings });
});

const updateCommunitySettings = asyncHandler(async (req, res) => {
  const communityId = req.community._id;
  const existing = await CommunitySettings.findOne({ communityId }).lean();

  const {
    charter,
    requireCharterAck,
    transparencyNote,
    onboardingMessage,
    description,
    isDiscoverable,
    isPublicFeed,
    bannerUrl,
    avatarUrl,
    brandHeadline,
    accentColor,
    themeVibe,
    backgroundColor,
    panelColor,
    textColor,
    featuredPerks,
    pinnedAnnouncement,
  } = req.body;

  const update = {};

  if (charter !== undefined) update.charter = charter;
  if (requireCharterAck !== undefined) {
    update.requireCharterAck = Boolean(requireCharterAck);
  }
  if (transparencyNote !== undefined) update.transparencyNote = transparencyNote;
  if (onboardingMessage !== undefined) update.onboardingMessage = onboardingMessage;
  if (description !== undefined) update.description = description;
  if (isDiscoverable !== undefined) update.isDiscoverable = Boolean(isDiscoverable);
  if (isPublicFeed !== undefined) update.isPublicFeed = Boolean(isPublicFeed);
  if (bannerUrl !== undefined) update.bannerUrl = String(bannerUrl || "").trim();
  if (avatarUrl !== undefined) update.avatarUrl = String(avatarUrl || "").trim();
  if (brandHeadline !== undefined) {
    update.brandHeadline = String(brandHeadline || "").trim();
  }

  if (accentColor !== undefined) {
    update.accentColor = sanitizeHex(accentColor, "#c084fc");
  }

  if (themeVibe !== undefined) {
    update.themeVibe = String(themeVibe || "").trim() || "dreamy";
  }

  if (backgroundColor !== undefined) {
    update.backgroundColor = sanitizeHex(backgroundColor, "#020617");
  }

  if (panelColor !== undefined) {
    update.panelColor = sanitizeHex(panelColor, "#0f172a");
  }

  if (textColor !== undefined) {
    update.textColor = sanitizeHex(textColor, "#e2e8f0");
  }

  const sanitizedPerks = sanitizeFeaturedPerks(featuredPerks);
  if (sanitizedPerks !== undefined) {
    update.featuredPerks = sanitizedPerks;
  }

  const sanitizedAnnouncement = sanitizePinnedAnnouncement(pinnedAnnouncement);
  if (sanitizedAnnouncement !== undefined) {
    update.pinnedAnnouncement = sanitizedAnnouncement;
  }

  const settings = await CommunitySettings.findOneAndUpdate(
    { communityId },
    { $set: update, $setOnInsert: { communityId } },
    { returnDocument: "after", upsert: true, runValidators: true }
  ).lean();

  const usageBase = {
    entityType: "community",
    entityId: String(communityId),
  };

  await Promise.all([
    replaceMediaUsage({
      oldUrl: existing?.bannerUrl || "",
      newUrl: settings.bannerUrl || "",
      usageTarget: { ...usageBase, field: "bannerUrl" },
    }),
    replaceMediaUsage({
      oldUrl: existing?.avatarUrl || "",
      newUrl: settings.avatarUrl || "",
      usageTarget: { ...usageBase, field: "avatarUrl" },
    }),
  ]);

  res.json({ ok: true, settings });
});

module.exports = {
  getCommunitySettings,
  updateCommunitySettings,
};    