const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const feedController = require("../controllers/feed.controller");

router.get("/feed", requireAuth, feedController.getFeed);

module.exports = router; 