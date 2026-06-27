const asyncHandler = require("../utils/asyncHandler");
const FriendRequest = require("../models/FriendRequest");
const Notification = require("../models/Notification");
const User = require("../models/User");

const REQUIRED_ONBOARDING_ACTION_KEYS = [
  "profileSavedAt",
  "themeChosenAt",
  "joinedCommunityAt",
  "sentFriendRequestAt",
  "createdPostAt",
];

function sanitizeUser(user) {
  return {
    id: user._id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    status: user.status,
  };
}

async function maybeCompleteOnboarding(userId) {
  const user = await User.findById(userId).lean();
  if (!user) return;

  const onboarding = user.onboarding || {};
  const actions = onboarding.actions || {};

  const hasAllRequired = REQUIRED_ONBOARDING_ACTION_KEYS.every((key) => Boolean(actions[key]));
  if (!hasAllRequired) return;
  if (onboarding.completedAt) return;

  await User.findByIdAndUpdate(userId, {
    $set: {
      "onboarding.completedAt": new Date(),
      "onboarding.lastCompletedStep": "completed",
    },
  });
}

async function stampOnboardingFriendRequest(userId) {
  await User.findOneAndUpdate(
    {
      _id: userId,
      "onboarding.actions.sentFriendRequestAt": null,
    },
    {
      $set: {
        "onboarding.actions.sentFriendRequestAt": new Date(),
        "onboarding.lastCompletedStep": "people",
      },
    }
  );

  await maybeCompleteOnboarding(userId);
}

const listFriends = asyncHandler(async (req, res) => {
  const me = await User.findById(req.user.sub)
    .populate("friends", "username displayName avatarUrl status")
    .populate("topFriends", "username displayName avatarUrl status")
    .lean();

  if (!me) {
    return res.status(404).json({ error: { message: "User not found" } });
  }

  res.json({
    ok: true,
    friends: (me.friends || []).map(sanitizeUser),
    topFriends: (me.topFriends || []).map(sanitizeUser),
  });
});

const listFriendRequests = asyncHandler(async (req, res) => {
  const userId = req.user.sub;

  const incoming = await FriendRequest.find({
    toUserId: userId,
    status: "pending",
  })
    .sort({ createdAt: -1 })
    .populate("fromUserId", "username displayName avatarUrl status")
    .lean();

  const outgoing = await FriendRequest.find({
    fromUserId: userId,
    status: "pending",
  })
    .sort({ createdAt: -1 })
    .populate("toUserId", "username displayName avatarUrl status")
    .lean();

  res.json({
    ok: true,
    incoming,
    outgoing,
  });
});

const getFriendshipStatus = asyncHandler(async (req, res) => {
  const viewerId = req.user.sub;
  const { username } = req.params;

  const target = await User.findOne({ username }).lean();
  if (!target) {
    return res.status(404).json({ error: { message: "User not found" } });
  }

  if (String(target._id) === String(viewerId)) {
    return res.json({
      ok: true,
      relationship: {
        status: "self",
      },
    });
  }

  const viewer = await User.findById(viewerId).lean();
  const alreadyFriends = (viewer.friends || []).some(
    (id) => String(id) === String(target._id)
  );

  if (alreadyFriends) {
    return res.json({
      ok: true,
      relationship: {
        status: "friends",
      },
    });
  }

  const outgoing = await FriendRequest.findOne({
    fromUserId: viewerId,
    toUserId: target._id,
    status: "pending",
  }).lean();

  if (outgoing) {
    return res.json({
      ok: true,
      relationship: {
        status: "outgoing_pending",
        requestId: outgoing._id,
      },
    });
  }

  const incoming = await FriendRequest.findOne({
    fromUserId: target._id,
    toUserId: viewerId,
    status: "pending",
  }).lean();

  if (incoming) {
    return res.json({
      ok: true,
      relationship: {
        status: "incoming_pending",
        requestId: incoming._id,
      },
    });
  }

  res.json({
    ok: true,
    relationship: {
      status: "none",
    },
  });
});

const sendFriendRequest = asyncHandler(async (req, res) => {
  const fromUserId = req.user.sub;
  const { username } = req.params;

  const target = await User.findOne({ username });
  if (!target) {
    return res.status(404).json({ error: { message: "User not found" } });
  }

  if (String(target._id) === String(fromUserId)) {
    return res.status(400).json({
      error: { message: "You cannot send a friend request to yourself" },
    });
  }

  const sender = await User.findById(fromUserId);
  if (!sender) {
    return res.status(404).json({ error: { message: "User not found" } });
  }

  const alreadyFriends = (sender.friends || []).some(
    (id) => String(id) === String(target._id)
  );

  if (alreadyFriends) {
    return res.status(409).json({
      error: { message: "You are already friends" },
    });
  }

  const outgoingExisting = await FriendRequest.findOne({
    fromUserId,
    toUserId: target._id,
    status: "pending",
  });

  if (outgoingExisting) {
    return res.status(409).json({
      error: { message: "Friend request already sent" },
    });
  }

  const reversePending = await FriendRequest.findOne({
    fromUserId: target._id,
    toUserId: fromUserId,
    status: "pending",
  });

  if (reversePending) {
    return res.status(409).json({
      error: { message: "This user has already sent you a friend request" },
    });
  }

  const request = await FriendRequest.create({
    fromUserId,
    toUserId: target._id,
    status: "pending",
  });

  await Notification.create({
    userId: target._id,
    type: "friend_request",
    title: "New friend request",
    body: `${sender.displayName || sender.username} sent you a friend request.`,
    data: {
      requestId: request._id,
      fromUserId: sender._id,
      fromUsername: sender.username,
    },
  });

  await stampOnboardingFriendRequest(fromUserId);

  const populated = await FriendRequest.findById(request._id)
    .populate("fromUserId", "username displayName avatarUrl status")
    .populate("toUserId", "username displayName avatarUrl status")
    .lean();

  res.status(201).json({
    ok: true,
    request: populated,
  });
});

const acceptFriendRequest = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { requestId } = req.params;

  const request = await FriendRequest.findById(requestId);
  if (!request || request.status !== "pending") {
    return res.status(404).json({ error: { message: "Friend request not found" } });
  }

  if (String(request.toUserId) !== String(userId)) {
    return res.status(403).json({
      error: { message: "You cannot accept this friend request" },
    });
  }

  request.status = "accepted";
  request.respondedAt = new Date();
  await request.save();

  await User.findByIdAndUpdate(request.fromUserId, {
    $addToSet: { friends: request.toUserId },
  });

  await User.findByIdAndUpdate(request.toUserId, {
    $addToSet: { friends: request.fromUserId },
  });

  const accepter = await User.findById(userId);

  await Notification.create({
    userId: request.fromUserId,
    type: "friend_accept",
    title: "Friend request accepted",
    body: `${accepter.displayName || accepter.username} accepted your friend request.`,
    data: {
      requestId: request._id,
      acceptedByUserId: accepter._id,
      acceptedByUsername: accepter.username,
    },
  });

  res.json({ ok: true });
});

const declineFriendRequest = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { requestId } = req.params;

  const request = await FriendRequest.findById(requestId);
  if (!request || request.status !== "pending") {
    return res.status(404).json({ error: { message: "Friend request not found" } });
  }

  if (String(request.toUserId) !== String(userId)) {
    return res.status(403).json({
      error: { message: "You cannot decline this friend request" },
    });
  }

  request.status = "declined";
  request.respondedAt = new Date();
  await request.save();

  res.json({ ok: true });
});

const cancelFriendRequest = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { requestId } = req.params;

  const request = await FriendRequest.findById(requestId);
  if (!request || request.status !== "pending") {
    return res.status(404).json({ error: { message: "Friend request not found" } });
  }

  if (String(request.fromUserId) !== String(userId)) {
    return res.status(403).json({
      error: { message: "You cannot cancel this friend request" },
    });
  }

  await request.deleteOne();

  res.json({ ok: true });
});

const removeFriend = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { username } = req.params;

  const target = await User.findOne({ username });
  if (!target) {
    return res.status(404).json({ error: { message: "User not found" } });
  }

  await User.findByIdAndUpdate(userId, {
    $pull: { friends: target._id, topFriends: target._id },
  });

  await User.findByIdAndUpdate(target._id, {
    $pull: { friends: userId, topFriends: userId },
  });

  res.json({ ok: true });
});

const updateTopFriends = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const rawIds = Array.isArray(req.body?.friendIds) ? req.body.friendIds : [];

  const me = await User.findById(userId).lean();
  if (!me) {
    return res.status(404).json({ error: { message: "User not found" } });
  }

  const friendSet = new Set((me.friends || []).map((id) => String(id)));
  const uniqueIds = Array.from(
    new Set(rawIds.map((id) => String(id)).filter((id) => friendSet.has(id)))
  ).slice(0, 8);

  await User.findByIdAndUpdate(userId, {
    $set: { topFriends: uniqueIds },
  });

  const updated = await User.findById(userId)
    .populate("topFriends", "username displayName avatarUrl status")
    .lean();

  res.json({
    ok: true,
    topFriends: (updated.topFriends || []).map(sanitizeUser),
  });
});

module.exports = {
  listFriends,
  listFriendRequests,
  getFriendshipStatus,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
  updateTopFriends,
}; 