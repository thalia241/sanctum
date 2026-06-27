const mongoose = require("mongoose");

const governanceProposalSchema = new mongoose.Schema(
  {
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    description: {
      type: String,
      default: "",
      maxlength: 2000,
    },

    proposalType: {
      type: String,
      enum: ["rule_change", "announcement", "other"],
      default: "other",
    },

    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
      index: true,
    },

    closesAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "GovernanceProposal",
  governanceProposalSchema
); 