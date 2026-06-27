const router = require("express").Router();

router.get("/", (req, res) => res.json({ ok: true, service: "sanctum-api" }));

router.use("/auth", require("./auth.routes"));
router.use("/communities", require("./community.routes"));
router.use("/communities", require("./channel.routes"));
router.use("/", require("./message.routes"));
router.use("/moderation", require("./moderation.routes"));
router.use("/", require("./invite.routes"));
router.use("/", require("./settings.routes"));
router.use("/", require("./billing.routes"));
router.use("/", require("./roles.routes"));
router.use("/", require("./channelGates.routes"));
router.use("/", require("./tiers.routes"));
router.use("/", require("./subscriptions.routes"));
router.use("/", require("./posts.routes"));
router.use("/", require("./discovery.routes"));
router.use("/", require("./analytics.routes"));
router.use("/", require("./communitySettings.routes"));
router.use("/", require("./comments.routes"));
router.use("/", require("./notifications.routes"));
router.use("/", require("./search.routes"));
router.use("/", require("./users.routes"));
router.use("/", require("./guestbook.routes"));
router.use("/", require("./friends.routes"));
router.use("/", require("./uploads.routes"));
router.use("/", require("./media.routes")); 
router.use("/", require("./directMessages.routes")); 
router.use("/", require("./profilePosts.routes")); 
router.use("/", require("./feed.routes")); 
router.use("/", require("./presence.routes")); 

module.exports = router; 