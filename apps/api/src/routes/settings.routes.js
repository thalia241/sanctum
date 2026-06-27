const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const validate = require("../middleware/validate");

const settingsController = require("../controllers/settings.controller");
const { ackCharterSchema } = require("../validators/settings.validators");

// keep only charter acknowledgement here
router.post(
  "/communities/:slug/charter/ack",
  requireAuth,
  validate(ackCharterSchema),
  settingsController.acknowledgeCharter
);

module.exports = router; 