const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tierId: { type: mongoose.Schema.Types.ObjectId, ref: "Tier", required: true, index: true },
    stripeSubscriptionId: { type: String, required: true, index: true },
    status: { type: String, default: "incomplete", index: true },
    currentPeriodEnd: { type: Date, default: null },
  },
  { timestamps: true }
);

// One active subscription per user per community (you can relax later)
subscriptionSchema.index({ communityId: 1, userId: 1 }, { unique: false });

module.exports = mongoose.model("Subscription", subscriptionSchema);  