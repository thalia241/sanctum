const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { previewInviteSchema } = require("../validators/invite.validators");

const inviteController = require("../controllers/invite.controller");
const { createInviteSchema, listInvitesSchema, revokeInviteSchema, joinInviteSchema } = require("../validators/invite.validators");

/**
 * Community-scoped invites
 * POST /api/communities/:slug/invites
 * GET  /api/communities/:slug/invites
 */
router.post("/communities/:slug/invites", requireAuth, validate(createInviteSchema), inviteController.createInvite);
router.get("/communities/:slug/invites", requireAuth, validate(listInvitesSchema), inviteController.listInvites);

router.get("/invites/:code", validate(previewInviteSchema), inviteController.previewInvite); 
/**
 * Invite code actions
 * POST /api/invites/:code/join
 * POST /api/invites/:code/revoke
 */
router.post("/invites/:code/join", requireAuth, validate(joinInviteSchema), inviteController.joinInvite);
router.post("/invites/:code/revoke", requireAuth, validate(revokeInviteSchema), inviteController.revokeInvite); 

module.exports = router; 