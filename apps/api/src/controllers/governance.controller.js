const asyncHandler = require("../utils/asyncHandler");
const GovernanceProposal = require("../models/GovernanceProposal");
const GovernanceVote = require("../models/GovernanceVote");
const Membership = require("../models/Membership");

function canCreateProposal(role) {
  return ["owner", "admin", "mod", "moderator"].includes(role);
}

async function requireMembership(communityId, userId) {
  const membership = await Membership.findOne({
    communityId,
    userId,
  }).lean();

  if (!membership) {
    const err = new Error("Not a member of this community");
    err.status = 403;
    throw err;
  }

  return membership;
}

const createProposal = asyncHandler(async (req, res) => {
  const community = req.community;
  const userId = req.user.sub;

  const membership = await requireMembership(community._id, userId);

  if (!canCreateProposal(membership.role)) {
    return res.status(403).json({
      error: { message: "Not allowed to create proposals" },
    });
  }

  const { title, description, proposalType, durationHours = 24 } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({
      error: { message: "Title is required" },
    });
  }

  const closesAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

  const proposal = await GovernanceProposal.create({
    communityId: community._id,
    title: title.trim(),
    description: description || "",
    proposalType,
    createdByUserId: userId,
    closesAt,
  });

  res.status(201).json({ ok: true, proposal });
});

const listProposals = asyncHandler(async (req, res) => {
  const community = req.community;

  const proposals = await GovernanceProposal.find({
    communityId: community._id,
  })
    .sort({ createdAt: -1 })
    .lean();

  const proposalIds = proposals.map((p) => p._id);

  const votes = await GovernanceVote.find({
    proposalId: { $in: proposalIds },
  }).lean();

  const voteMap = {};

  for (const vote of votes) {
    const id = vote.proposalId.toString();
    if (!voteMap[id]) {
      voteMap[id] = { yes: 0, no: 0, abstain: 0 };
    }
    voteMap[id][vote.vote]++;
  }

  res.json({
    ok: true,
    proposals: proposals.map((p) => ({
      ...p,
      votes: voteMap[p._id.toString()] || {
        yes: 0,
        no: 0,
        abstain: 0,
      },
    })),
  });
});

const voteOnProposal = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { proposalId } = req.params;
  const { vote } = req.body;

  if (!["yes", "no", "abstain"].includes(vote)) {
    return res.status(400).json({
      error: { message: "Invalid vote" },
    });
  }

  const proposal = await GovernanceProposal.findById(proposalId);

  if (!proposal || proposal.status !== "open") {
    return res.status(400).json({
      error: { message: "Proposal not available for voting" },
    });
  }

  await GovernanceVote.findOneAndUpdate(
    { proposalId, userId },
    { vote },
    { upsert: true, new: true }
  );

  res.json({ ok: true });
});

const closeProposal = asyncHandler(async (req, res) => {
  const { proposalId } = req.params;

  const proposal = await GovernanceProposal.findById(proposalId);

  if (!proposal) {
    return res.status(404).json({
      error: { message: "Proposal not found" },
    });
  }

  proposal.status = "closed";
  await proposal.save();

  res.json({ ok: true });
});

module.exports = {
  createProposal,
  listProposals,
  voteOnProposal,
  closeProposal,
}; 