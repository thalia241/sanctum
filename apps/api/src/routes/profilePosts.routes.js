const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const profilePostsController = require("../controllers/profilePosts.controller");

router.get(
  "/users/:username/profile-posts",
  requireAuth,
  profilePostsController.listProfilePosts
);

router.post(
  "/users/:username/profile-posts",
  requireAuth,
  profilePostsController.createProfilePost
);

router.patch(
  "/profile-posts/:postId/pin",
  requireAuth,
  profilePostsController.togglePinProfilePost
);

router.delete(
  "/profile-posts/:postId",
  requireAuth,
  profilePostsController.deleteProfilePost
);

module.exports = router; 