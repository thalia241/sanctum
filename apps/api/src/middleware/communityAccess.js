const asyncHandler = require("../utils/asyncHandler");
const Community = require("../models/Community");
const Membership = require("../models/Membership");

const ROLE_PERMISSIONS = {
  owner: [
    "CHANNEL_LIST",
    "COMMUNITY_EDIT",
    "COMMUNITY_MODERATE",
    "COMMUNITY_ADMIN",
  ],
  admin: [
    "CHANNEL_LIST",
    "COMMUNITY_EDIT",
    "COMMUNITY_MODERATE",
    "COMMUNITY_ADMIN",
  ],
  mod: [
    "CHANNEL_LIST",
    "COMMUNITY_MODERATE",
  ],
  moderator: [
    "CHANNEL_LIST",
    "COMMUNITY_MODERATE",
  ],
  member: [
    "CHANNEL_LIST",
  ],
};

const loadCommunityBySlug = asyncHandler(async (req, res, next) => {
  const { slug } = req.params;

  const community = await Community.findOne({ slug });
  if (!community) {
    return res.status(404).json({
      error: { message: "Community not found" },
    });
  }

  req.community = community;
  next();
});

function requireCommunityPermission(permission) {
  return asyncHandler(async (req, res, next) => {
    const community = req.community;
    const userId = req.user?.sub;

    if (!community || !userId) {
      return res.status(403).json({
        error: { message: "Access denied" },
      });
    }

    const membership = await Membership.findOne({
      communityId: community._id,
      userId,
    }).lean();

    if (!membership) {
      return res.status(403).json({
        error: { message: "You are not a member of this community" },
      });
    }

    req.membership = membership;

    const permissions = ROLE_PERMISSIONS[membership.role] || [];
    if (!permissions.includes(permission)) {
      return res.status(403).json({
        error: { message: "You do not have permission to perform this action" },
      });
    }

    next();
  });
}

module.exports = {
  loadCommunityBySlug,
  requireCommunityPermission,
}; 