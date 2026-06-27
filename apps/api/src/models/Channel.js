const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema(
  {
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 50 },
    type: { type: String, enum: ["text"], default: "text" },
    allowedRoleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Role" }],
  },
  { timestamps: true }
);

channelSchema.index({ communityId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Channel", channelSchema);