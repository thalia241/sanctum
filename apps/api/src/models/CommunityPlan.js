// src/models/CommunityPlan.js
const mongoose = require("mongoose");

const communityPlanSchema = new mongoose.Schema(
  {
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: true, unique: true, index: true },
    plan: { type: String, enum: ["free", "pro", "studio"], default: "free", index: true },
    status: {
      type: String,
      enum: ["active", "past_due", "canceled", "incomplete", "incomplete_expired", "trialing", "unpaid", "none"],
      default: "none",
      index: true,
    },
    stripeSubscriptionId: { type: String, default: null, index: true },
    currentPeriodEnd: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CommunityPlan", communityPlanSchema);