const mongoose = require("mongoose");

const directMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DirectConversation",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },

    readByUserIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

directMessageSchema.index({ conversationId: 1, createdAt: -1 });
directMessageSchema.index({ conversationId: 1, readByUserIds: 1 });

module.exports = mongoose.model("DirectMessage", directMessageSchema); 