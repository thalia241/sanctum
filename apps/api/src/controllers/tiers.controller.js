const asyncHandler = require("../utils/asyncHandler");
const Tier = require("../models/Tier");
const Role = require("../models/Role");

function sanitizePerks(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

const createTier = asyncHandler(async (req, res) => {
  const communityId = req.community._id;
  const {
    name,
    description = "",
    stripePriceId = "",
    roleIds = [],
    monthlyPriceLabel = "",
    highlightText = "",
    perks = [],
  } = req.body;

  if (!String(name || "").trim()) {
    return res.status(400).json({
      error: { message: "Tier name is required" },
    });
  }

  if (!String(stripePriceId || "").trim()) {
    return res.status(400).json({
      error: { message: "stripePriceId is required" },
    });
  }

  if (roleIds.length > 0) {
    const roles = await Role.find({ _id: { $in: roleIds }, communityId }).lean();
    if (roles.length !== roleIds.length) {
      return res.status(400).json({
        error: { message: "One or more roleIds are invalid for this community" },
      });
    }
  }

  const tier = await Tier.create({
    communityId,
    name: String(name || "").trim(),
    description: String(description || "").trim(),
    stripePriceId: String(stripePriceId || "").trim(),
    roleIds,
    monthlyPriceLabel: String(monthlyPriceLabel || "").trim(),
    highlightText: String(highlightText || "").trim(),
    perks: sanitizePerks(perks),
  });

  res.status(201).json({ ok: true, tier });
});

const updateTier = asyncHandler(async (req, res) => {
  const communityId = req.community._id;
  const { tierId } = req.params;
  const {
    name,
    description,
    stripePriceId,
    roleIds,
    monthlyPriceLabel,
    highlightText,
    perks,
    isActive,
  } = req.body;

  const tier = await Tier.findOne({ _id: tierId, communityId });
  if (!tier) {
    return res.status(404).json({ error: { message: "Tier not found" } });
  }

  if (Array.isArray(roleIds) && roleIds.length > 0) {
    const roles = await Role.find({ _id: { $in: roleIds }, communityId }).lean();
    if (roles.length !== roleIds.length) {
      return res.status(400).json({
        error: { message: "One or more roleIds are invalid for this community" },
      });
    }
    tier.roleIds = roleIds;
  }

  if (name !== undefined) tier.name = String(name || "").trim();
  if (description !== undefined) tier.description = String(description || "").trim();
  if (stripePriceId !== undefined) tier.stripePriceId = String(stripePriceId || "").trim();
  if (monthlyPriceLabel !== undefined) {
    tier.monthlyPriceLabel = String(monthlyPriceLabel || "").trim();
  }
  if (highlightText !== undefined) {
    tier.highlightText = String(highlightText || "").trim();
  }
  if (perks !== undefined) tier.perks = sanitizePerks(perks);
  if (isActive !== undefined) tier.isActive = Boolean(isActive);

  await tier.save();

  res.json({ ok: true, tier });
});

const listTiers = asyncHandler(async (req, res) => {
  const communityId = req.community._id;
  const tiers = await Tier.find({ communityId, isActive: true })
    .sort({ createdAt: 1 })
    .lean();

  res.json({ ok: true, tiers });
});

module.exports = { createTier, updateTier, listTiers }; 