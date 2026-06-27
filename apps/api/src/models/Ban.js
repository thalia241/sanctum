const mongoose = require("mongoose");

const banSchema = new mongoose.Schema(
  {
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, trim: true, maxlength: 280 },
    // optional future: expiresAt for temp bans
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

banSchema.index({ communityId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Ban", banSchema);