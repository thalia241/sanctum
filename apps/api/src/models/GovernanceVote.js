const mongoose = require("mongoose");

const governanceVoteSchema = new mongoose.Schema(
  {
    proposalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GovernanceProposal",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    vote: {
      type: String,
      enum: ["yes", "no", "abstain"],
      required: true,
    },
  },
  { timestamps: true }
);

governanceVoteSchema.index({ proposalId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("GovernanceVote", governanceVoteSchema); 