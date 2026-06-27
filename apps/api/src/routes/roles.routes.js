const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { loadCommunityBySlug, requireCommunityPermission } = require("../middleware/communityAccess");

const {
  createRole,
  listRoles,
  assignRole,
  unassignRole,
  listMemberRoles,
} = require("../controllers/roles.controller");

router.post(
  "/communities/:slug/roles",
  requireAuth,
  loadCommunityBySlug,
  requireCommunityPermission("COMMUNITY_EDIT"),
  createRole
);

router.get(
  "/communities/:slug/roles",
  requireAuth,
  loadCommunityBySlug,
  requireCommunityPermission("CHANNEL_LIST"),
  listRoles
);

router.post(
  "/communities/:slug/roles/assign",
  requireAuth,
  loadCommunityBySlug,
  requireCommunityPermission("MOD_PROMOTE"),
  assignRole
);

router.post(
  "/communities/:slug/roles/unassign",
  requireAuth,
  loadCommunityBySlug,
  requireCommunityPermission("MOD_PROMOTE"),
  unassignRole
);

router.get(
  "/communities/:slug/roles/members/:userId",
  requireAuth,
  loadCommunityBySlug,
  requireCommunityPermission("MEMBER_LIST"),
  listMemberRoles
);

module.exports = router; 