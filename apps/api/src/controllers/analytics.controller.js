const asyncHandler = require("../utils/asyncHandler");
const Membership = require("../models/Membership");
const Channel = require("../models/Channel");
const Post = require("../models/Post");
const PostComment = require("../models/PostComment");
const Role = require("../models/Role");
const Subscription = require("../models/Subscription");
const Message = require("../models/Message");

// GET /api/communities/:slug/analytics
const getCommunityAnalytics = asyncHandler(async (req, res) => {
  const communityId = req.community._id;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const channelIds = (
    await Channel.find({ communityId }).select("_id").lean()
  ).map((c) => c._id);

  const posts = await Post.find({
    communityId,
    isDeleted: false,
  })
    .select("_id title createdAt authorId")
    .lean();

  const postIds = posts.map((p) => p._id);

  const [
    memberCount,
    newMembersLast7Days,
    channelCount,
    postCount,
    postsLast7Days,
    roleCount,
    paidSubscriberCount,
    messageCount,
    messagesLast7Days,
    commentsCount,
    commentsLast7Days,
    commentAgg,
  ] = await Promise.all([
    Membership.countDocuments({ communityId }),
    Membership.countDocuments({
      communityId,
      createdAt: { $gte: sevenDaysAgo },
    }),
    Channel.countDocuments({ communityId }),
    Post.countDocuments({
      communityId,
      isDeleted: false,
    }),
    Post.countDocuments({
      communityId,
      isDeleted: false,
      createdAt: { $gte: sevenDaysAgo },
    }),
    Role.countDocuments({ communityId }),
    Subscription.countDocuments({
      communityId,
      status: { $in: ["active", "trialing"] },
    }),
    Message.countDocuments({
      channelId: { $in: channelIds },
    }),
    Message.countDocuments({
      channelId: { $in: channelIds },
      createdAt: { $gte: sevenDaysAgo },
    }),
    PostComment.countDocuments({
      communityId,
      isDeleted: false,
    }),
    PostComment.countDocuments({
      communityId,
      isDeleted: false,
      createdAt: { $gte: sevenDaysAgo },
    }),
    PostComment.aggregate([
      {
        $match: {
          communityId,
          isDeleted: false,
          postId: { $in: postIds },
        },
      },
      {
        $group: {
          _id: "$postId",
          commentCount: { $sum: 1 },
        },
      },
      {
        $sort: { commentCount: -1 },
      },
      {
        $limit: 5,
      },
    ]),
  ]);

  const postMap = new Map(posts.map((p) => [String(p._id), p]));

  const topPosts = commentAgg.map((row) => {
    const post = postMap.get(String(row._id));
    return {
      postId: row._id,
      title: post?.title || "Untitled post",
      commentCount: row.commentCount,
      createdAt: post?.createdAt || null,
      authorId: post?.authorId || null,
    };
  });

  res.json({
    ok: true,
    analytics: {
      memberCount,
      newMembersLast7Days,
      channelCount,
      postCount,
      postsLast7Days,
      roleCount,
      paidSubscriberCount,
      messageCount,
      messagesLast7Days,
      commentsCount,
      commentsLast7Days,
      topPosts,
    },
  });
});

module.exports = { getCommunityAnalytics };  