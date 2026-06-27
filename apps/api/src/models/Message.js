const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    channelId: { type: mongoose.Schema.Types.ObjectId, ref: "Channel", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    content: { type: String, required: true, trim: true, maxlength: 4000 },

    // Soft delete fields
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deletedReason: { type: String, trim: true, maxlength: 280 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema); 