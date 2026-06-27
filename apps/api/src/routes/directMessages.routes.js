const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const directMessagesController = require("../controllers/directMessages.controller");

router.get(
  "/inbox/conversations",
  requireAuth,
  directMessagesController.listConversations
);

router.post(
  "/inbox/conversations",
  requireAuth,
  directMessagesController.createConversation
);

router.get(
  "/inbox/conversations/:conversationId/messages",
  requireAuth,
  directMessagesController.getConversationMessages
);

router.post(
  "/inbox/conversations/:conversationId/messages",
  requireAuth,
  directMessagesController.sendMessage
);

router.post(
  "/inbox/conversations/:conversationId/read",
  requireAuth,
  directMessagesController.markConversationRead
);

module.exports = router; 