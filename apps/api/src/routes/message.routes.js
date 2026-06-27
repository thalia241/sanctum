const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { getMessagesSchema } = require("../validators/message.validators");
const messageController = require("../controllers/message.controller");

/**
 * GET /api/channels/:channelId/messages
 */
router.get(
  "/channels/:channelId/messages",
  requireAuth,
  validate(getMessagesSchema),
  messageController.getChannelMessages
);

module.exports = router;