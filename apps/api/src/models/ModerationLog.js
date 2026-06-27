const mongoose = require("mongoose");

const moderationLogSchema = new mongoose.Schema(
  {
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      index: true,
    },
    actionType: {
      type: String,
      required: true,
      trim: true,
      enum: [
        "ban_user",
        "unban_user",
        "remove_post",
        "update_rules",
        "update_roles",
        "pin_announcement",
        "unpin_announcement",
        "appeal_approved",
        "appeal_denied",
        "other",
      ],
    },
    targetType: {
      type: String,
      required: true,
      trim: true,
      enum: ["user", "post", "rule", "role", "announcement", "other"],
    },
    targetId: {
      type: String,
      trim: true,
      default: "",
    },
    targetLabel: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
    },
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    visibility: {
      type: String,
      required: true,
      enum: ["staff", "public"],
      default: "staff",
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    linkedAppealId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ModerationAppeal",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ModerationLog", moderationLogSchema);