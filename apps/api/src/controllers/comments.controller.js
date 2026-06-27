const asyncHandler = require("../utils/asyncHandler");
const Post = require("../models/Post");
const PostComment = require("../models/PostComment");
const Membership = require("../models/Membership");
const Ban = require("../models/Ban");
const CommunitySettings = require("../models/CommunitySettings");
const Notification = require("../models/Notification");

async function ensureCanAccessPost({ userId, post }) {
  if (!post || post.isDeleted) {
    throw new Error("Post not found");
  }

  const communityId = post.communityId;

  const ban = await Ban.findOne({ userId, communityId }).lean();
  if (ban) {
    throw new Error("You are banned from this community");
  }

  const membership = await Membership.findOne({
    userId,
    communityId,
  }).lean();

  if (!membership) {
    throw new Error("Not a member of this community");
  }

  const settings = await CommunitySettings.findOne({ communityId }).lean();
  if (settings?.requireCharterAck && !membership.acknowledgedCharterAt) {
    throw new Error("Charter acknowledgment required");
  }

  return { membership, settings };
}

// POST /api/posts/:postId/comments
const createComment = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { postId } = req.params;
  const { body, parentCommentId = null } = req.body;

  const post = await Post.findById(postId).lean();

  try {
    await ensureCanAccessPost({ userId, post });
  } catch (err) {
    const message = err.message || "Access denied";

    if (message === "Post not found") {
      return res.status(404).json({ error: { message } });
    }

    if (
      message === "You are banned from this community" ||
      message === "Not a member of this community" ||
      message === "Charter acknowledgment required"
    ) {
      return res.status(403).json({ error: { message } });
    }

    throw err;
  }

  let parent = null;

  if (parentCommentId) {
    parent = await PostComment.findOne({
      _id: parentCommentId,
      postId,
      communityId: post.communityId,
    }).lean();

    if (!parent || parent.isDeleted) {
      return res.status(400).json({
        error: { message: "Parent comment not found" },
      });
    }
  }

  const trimmedBody = String(body || "").trim();
  if (!trimmedBody) {
    return res.status(400).json({
      error: { message: "Comment body is required" },
    });
  }

  const comment = await PostComment.create({
    postId,
    communityId: post.communityId,
    authorId: userId,
    body: trimmedBody,
    parentCommentId,
  });

  // Notify post author if someone else commented on their post
  if (String(post.authorId) !== String(userId)) {
    await Notification.create({
      userId: post.authorId,
      type: "post_comment",
      title: "New comment on your post",
      body: trimmedBody.slice(0, 120),
      data: {
        communityId: post.communityId,
        postId: post._id,
        commentId: comment._id,
      },
    });
  }

  // Notify parent comment author if this is a reply and it's not the same person
  if (parent && String(parent.authorId) !== String(userId)) {
    await Notification.create({
      userId: parent.authorId,
      type: "comment_reply",
      title: "New reply to your comment",
      body: trimmedBody.slice(0, 120),
      data: {
        communityId: post.communityId,
        postId: post._id,
        commentId: comment._id,
        parentCommentId: parent._id,
      },
    });
  }

  res.status(201).json({ ok: true, comment });
});

// GET /api/posts/:postId/comments
const listComments = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { postId } = req.params;

  const post = await Post.findById(postId).lean();

  try {
    await ensureCanAccessPost({ userId, post });
  } catch (err) {
    const message = err.message || "Access denied";

    if (message === "Post not found") {
      return res.status(404).json({ error: { message } });
    }

    if (
      message === "You are banned from this community" ||
      message === "Not a member of this community" ||
      message === "Charter acknowledgment required"
    ) {
      return res.status(403).json({ error: { message } });
    }

    throw err;
  }

  const comments = await PostComment.find({
    postId,
    isDeleted: false,
  })
    .sort({ createdAt: 1 })
    .lean();

  res.json({ ok: true, comments });
});

// DELETE /api/comments/:commentId
const deleteComment = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { commentId } = req.params;

  const comment = await PostComment.findById(commentId);
  if (!comment || comment.isDeleted) {
    return res.status(404).json({ error: { message: "Comment not found" } });
  }

  const ban = await Ban.findOne({
    userId,
    communityId: comment.communityId,
  }).lean();

  if (ban) {
    return res.status(403).json({
      error: { message: "You are banned from this community" },
    });
  }

  const membership = await Membership.findOne({
    userId,
    communityId: comment.communityId,
  }).lean();

  if (!membership) {
    return res.status(403).json({
      error: { message: "Not a member of this community" },
    });
  }

  const settings = await CommunitySettings.findOne({
    communityId: comment.communityId,
  }).lean();

  if (settings?.requireCharterAck && !membership.acknowledgedCharterAt) {
    return res.status(403).json({
      error: { message: "Charter acknowledgment required" },
    });
  }

  const isAuthor = String(comment.authorId) === String(userId);
  const isModerator = membership.role === "mod" || membership.role === "owner";

  if (!isAuthor && !isModerator) {
    return res.status(403).json({
      error: { message: "You do not have permission to delete this comment" },
    });
  }

  comment.isDeleted = true;
  comment.deletedAt = new Date();
  comment.deletedBy = userId;
  await comment.save();

  res.json({ ok: true });
});

module.exports = {
  createComment,
  listComments,
  deleteComment,
};  