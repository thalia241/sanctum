const mongoose = require("mongoose");

const tierSchema = new mongoose.Schema(
  {
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      default: "",
      maxlength: 500,
    },
    stripePriceId: {
      type: String,
      required: true,
      trim: true,
    },
    roleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Role" }],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    monthlyPriceLabel: {
      type: String,
      default: "",
      maxlength: 40,
    },

    highlightText: {
      type: String,
      default: "",
      maxlength: 80,
    },

    perks: [
      {
        type: String,
        trim: true,
        maxlength: 120,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tier", tierSchema); 