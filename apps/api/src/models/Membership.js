const mongoose = require("mongoose");

const membershipSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: true, index: true },
    role: { type: String, enum: ["owner", "mod", "member"], default: "member" },
    acknowledgedCharterAt: { type: Date }, 
  },
  { timestamps: true }
);

membershipSchema.index({ userId: 1, communityId: 1 }, { unique: true });

module.exports = mongoose.model("Membership", membershipSchema);