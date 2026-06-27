const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const {
  createComment,
  listComments,
  deleteComment,
} = require("../controllers/comments.controller");

router.post("/posts/:postId/comments", requireAuth, createComment);
router.get("/posts/:postId/comments", requireAuth, listComments);
router.delete("/comments/:commentId", requireAuth, deleteComment);

module.exports = router; 