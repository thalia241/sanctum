const asyncHandler = require("../utils/asyncHandler");
const Role = require("../models/Role");
const MemberRole = require("../models/MemberRole");
const Membership = require("../models/Membership");

// POST /api/communities/:slug/roles
const createRole = asyncHandler(async (req, res) => {
  const communityId = req.community._id;
  const { name, isPaidRole = false } = req.body;

  const role = await Role.create({
    communityId,
    name: name.trim(),
    isPaidRole: Boolean(isPaidRole),
  });

  res.status(201).json({ ok: true, role });
});

// GET /api/communities/:slug/roles
const listRoles = asyncHandler(async (req, res) => {
  const communityId = req.community._id;
  const roles = await Role.find({ communityId }).sort({ createdAt: 1 }).lean();
  res.json({ ok: true, roles });
});

// POST /api/communities/:slug/roles/assign
// body: { targetUserId, roleId }
const assignRole = asyncHandler(async (req, res) => {
  const communityId = req.community._id;
  const { targetUserId, roleId } = req.body;

  // Ensure role belongs to this community
  const role = await Role.findOne({ _id: roleId, communityId }).lean();
  if (!role) return res.status(404).json({ error: { message: "Role not found" } });

  // Ensure target is member
  const targetMembership = await Membership.findOne({ userId: targetUserId, communityId }).lean();
  if (!targetMembership) {
    return res.status(400).json({ error: { message: "Target user is not a member of this community" } });
  }

  await MemberRole.updateOne(
    { communityId, userId: targetUserId, roleId },
    { $setOnInsert: { communityId, userId: targetUserId, roleId } },
    { upsert: true }
  );

  res.json({ ok: true });
});

// POST /api/communities/:slug/roles/unassign
// body: { targetUserId, roleId }
const unassignRole = asyncHandler(async (req, res) => {
  const communityId = req.community._id;
  const { targetUserId, roleId } = req.body;

  await MemberRole.deleteOne({ communityId, userId: targetUserId, roleId });
  res.json({ ok: true });
});

// GET /api/communities/:slug/roles/members/:userId
const listMemberRoles = asyncHandler(async (req, res) => {
  const communityId = req.community._id;
  const userId = req.params.userId;

  const rows = await MemberRole.find({ communityId, userId }).lean();
  const roleIds = rows.map((r) => r.roleId);

  const roles = await Role.find({ _id: { $in: roleIds }, communityId }).lean();
  res.json({ ok: true, roles });
});

module.exports = { createRole, listRoles, assignRole, unassignRole, listMemberRoles };