const mongoose = require("mongoose");

const moderationAppealSchema = new mongoose.Schema(
  {
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      index: true,
    },
    moderationLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ModerationLog",
      required: true,
      index: true,
    },
    appellantUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    explanation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      required: true,
      enum: ["submitted", "under_review", "approved", "denied", "withdrawn"],
      default: "submitted",
      index: true,
    },
    reviewerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolutionNote: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ModerationAppeal", moderationAppealSchema);