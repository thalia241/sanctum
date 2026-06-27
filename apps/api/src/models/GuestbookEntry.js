const mongoose = require("mongoose");

const guestbookEntrySchema = new mongoose.Schema(
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
      maxlength: 500,
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
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

guestbookEntrySchema.index({ profileOwnerId: 1, isPinned: -1, createdAt: -1 });

module.exports = mongoose.model("GuestbookEntry", guestbookEntrySchema); 