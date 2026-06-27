const mongoose = require("mongoose");

const inviteSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },

    communityId: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: true, index: true },
    channelId: { type: mongoose.Schema.Types.ObjectId, ref: "Channel" }, // optional “landing” channel
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    maxUses: { type: Number }, // optional (undefined/null = unlimited)
    uses: { type: Number, default: 0 },

    expiresAt: { type: Date }, // optional
    revokedAt: { type: Date },
  },
  { timestamps: true }
);

inviteSchema.index({ communityId: 1, createdAt: -1 });

module.exports = mongoose.model("Invite", inviteSchema); 