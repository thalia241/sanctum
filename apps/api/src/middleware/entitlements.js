// src/middleware/entitlements.js
const asyncHandler = require("../utils/asyncHandler");
const CommunityPlan = require("../models/CommunityPlan");
const { getEntitlementsForPlan } = require("../utils/entitlements");

const attachEntitlements = asyncHandler(async (req, res, next) => {
  const communityId = req.community?._id;
  if (!communityId) return next();

  const planDoc = (await CommunityPlan.findOne({ communityId }).lean()) || { plan: "free", status: "none" };
  req.communityPlan = planDoc;
  req.entitlements = getEntitlementsForPlan(planDoc.plan);

  next();
});

module.exports = { attachEntitlements };