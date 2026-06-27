const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const presenceController = require("../controllers/presence.controller");

router.get("/presence", requireAuth, presenceController.getPresence);

module.exports = router; 