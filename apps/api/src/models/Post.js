const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },
    visibility: {
      type: String,
      enum: ["public", "members", "subscribers"],
      default: "members",
      index: true,
    },
    postType: {
      type: String,
      enum: ["standard", "creator_update"],
      default: "standard",
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    accessTierLabel: {
      type: String,
      default: "",
      trim: true,
      maxlength: 80,
    },
    coverImageUrl: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    embedUrl: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
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
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

postSchema.index({ communityId: 1, isPinned: -1, createdAt: -1 });

postSchema.index({
  title: "text",
  body: "text",
});

module.exports = mongoose.model("Post", postSchema); 