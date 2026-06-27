const mongoose = require("mongoose");

const profilePostSchema = new mongoose.Schema(
  {
    profileOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    visibility: {
      type: String,
      enum: ["public", "friends"],
      default: "public",
      index: true,
    },

    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },

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

profilePostSchema.index({ profileOwnerId: 1, isDeleted: 1, isPinned: -1, createdAt: -1 });

module.exports = mongoose.model("ProfilePost", profilePostSchema); 