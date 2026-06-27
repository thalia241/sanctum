const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const {
  loadCommunityBySlug,
  requireCommunityPermission,
} = require("../middleware/communityAccess");

const {
  createPost,
  listPosts,
  updatePost,
  deletePost,
  listPublicPosts,
} = require("../controllers/posts.controller");

router.get(
  "/communities/:slug/posts",
  requireAuth,
  loadCommunityBySlug,
  requireCommunityPermission("CHANNEL_LIST"),
  listPosts
);

router.get(
  "/communities/:slug/posts/public",
  loadCommunityBySlug,
  listPublicPosts
);

router.post(
  "/communities/:slug/posts",
  requireAuth,
  loadCommunityBySlug,
  requireCommunityPermission("MESSAGE_SEND"),
  createPost
);

router.patch("/posts/:postId", requireAuth, updatePost);
router.delete("/posts/:postId", requireAuth, deletePost);

module.exports = router;   