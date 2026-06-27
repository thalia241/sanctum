const mongoose = require("mongoose");

const directConversationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },

    isGroup: {
      type: Boolean,
      default: false,
      index: true,
    },

    participantIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

directConversationSchema.index({ participantIds: 1, lastMessageAt: -1 });

module.exports = mongoose.model("DirectConversation", directConversationSchema);