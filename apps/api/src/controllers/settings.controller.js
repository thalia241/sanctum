const asyncHandler = require("../utils/asyncHandler");
const Community = require("../models/Community");
const CommunitySettings = require("../models/CommunitySettings");
const Membership = require("../models/Membership");

function isOwnerOrMod(role) {
  return role === "owner" || role === "mod";
}

async function getOrCreateSettings(communityId) {
  let settings = await CommunitySettings.findOne({ communityId }).lean();
  if (!settings) {
    const created = await CommunitySettings.create({ communityId });
    settings = created.toObject();
  }
  return settings;
}

const getSettings = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { slug } = req.params;

  const community = await Community.findOne({ slug }).lean();
  if (!community) return res.status(404).json({ error: { message: "Community not found" } });

  const membership = await Membership.findOne({ userId, communityId: community._id }).lean();
  if (!membership) return res.status(403).json({ error: { message: "Not a member of this community" } });

  const settings = await getOrCreateSettings(community._id);

  res.json({ ok: true, community: { slug, name: community.name }, settings });
});

const updateSettings = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { slug } = req.params;

  const community = await Community.findOne({ slug });
  if (!community) return res.status(404).json({ error: { message: "Community not found" } });

  const membership = await Membership.findOne({ userId, communityId: community._id }).lean();
  if (!membership) return res.status(403).json({ error: { message: "Not a member of this community" } });

  // keep it strict: only owner/mod can edit settings
  if (!isOwnerOrMod(membership.role)) {
    return res.status(403).json({ error: { message: "Insufficient permissions" } });
  }

  const patch = {};
  for (const key of [
    "charterMarkdown",
    "transparencyMode",
    "requireCharterAck",
    "spoilerPolicy",
    "lfgEnabled",
    "bookClubMode",
    "rules",
  ]) {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  }

  const settings = await CommunitySettings.findOneAndUpdate(
    { communityId: community._id },
    { $set: patch, $setOnInsert: { communityId: community._id } },
    { upsert: true, new: true }
  ).lean();

  res.json({ ok: true, settings });
});

const acknowledgeCharter = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { slug } = req.params;

  const community = await Community.findOne({ slug }).lean();
  if (!community) return res.status(404).json({ error: { message: "Community not found" } });

  const membership = await Membership.findOne({ userId, communityId: community._id });
  if (!membership) return res.status(403).json({ error: { message: "Not a member of this community" } });

  membership.acknowledgedCharterAt = new Date();
  await membership.save();

  res.json({ ok: true, acknowledgedAt: membership.acknowledgedCharterAt });
});

module.exports = { getSettings, updateSettings, acknowledgeCharter }; 