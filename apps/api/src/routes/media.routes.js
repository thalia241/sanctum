const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { listMyMedia } = require("../controllers/media.controller");

router.get("/media", requireAuth, listMyMedia);

module.exports = router; 