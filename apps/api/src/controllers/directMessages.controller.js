const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const DirectConversation = require("../models/DirectConversation");
const DirectMessage = require("../models/DirectMessage");
const Notification = require("../models/Notification");
const User = require("../models/User");

function sanitizeParticipant(user) {
  if (!user) return null;

  return {
    id: user._id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    status: user.status,
  };
}

function sanitizeMessage(message, currentUserId = null) {
  const readBy = Array.isArray(message.readByUserIds)
    ? message.readByUserIds.map((id) => String(id))
    : [];

  return {
    id: message._id,
    conversationId: message.conversationId,
    userId: message.userId?._id || message.userId,
    author: message.userId?._id ? sanitizeParticipant(message.userId) : null,
    content: message.isDeleted ? "" : message.content,
    isDeleted: Boolean(message.isDeleted),
    isRead:
      currentUserId == null ? false : readBy.includes(String(currentUserId)),
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

function sanitizeConversation(conversation, currentUserId, unreadCount = 0) {
  const participants = (conversation.participantIds || [])
    .map(sanitizeParticipant)
    .filter(Boolean);

  const otherParticipants = participants.filter(
    (p) => String(p.id) !== String(currentUserId)
  );

  let derivedTitle = conversation.title || "";
  if (!derivedTitle) {
    if (conversation.isGroup) {
      derivedTitle =
        otherParticipants.map((p) => p.displayName || p.username).join(", ") ||
        "Group Chat";
    } else {
      const other = otherParticipants[0];
      derivedTitle = other
        ? other.displayName || other.username
        : "Direct Message";
    }
  }

  return {
    id: conversation._id,
    title: derivedTitle,
    isGroup: Boolean(conversation.isGroup),
    createdBy: conversation.createdBy,
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
    unreadCount,
    participants,
    otherParticipants,
  };
}

async function buildUnreadCountMap(conversationIds, currentUserId) {
  const pairs = await Promise.all(
    conversationIds.map(async (conversationId) => {
      const unreadCount = await DirectMessage.countDocuments({
        conversationId,
        userId: { $ne: currentUserId },
        readByUserIds: { $ne: currentUserId },
        isDeleted: false,
      });

      return [String(conversationId), unreadCount];
    })
  );

  return new Map(pairs);
}

function sortConversations(items) {
  return [...items].sort((a, b) => {
    if ((b.unreadCount || 0) !== (a.unreadCount || 0)) {
      return (b.unreadCount || 0) - (a.unreadCount || 0);
    }

    return (
      new Date(b.lastMessageAt || b.createdAt).getTime() -
      new Date(a.lastMessageAt || a.createdAt).getTime()
    );
  });
}

async function stampOnboardingSentDm(userId) {
  await User.findOneAndUpdate(
    {
      _id: userId,
      "onboarding.actions.sentDmAt": null,
    },
    {
      $set: {
        "onboarding.actions.sentDmAt": new Date(),
        "onboarding.lastCompletedStep": "dm",
      },
    }
  );
}

const listConversations = asyncHandler(async (req, res) => {
  const userId = req.user.sub;

  const conversations = await DirectConversation.find({
    participantIds: userId,
  })
    .populate("participantIds", "username displayName avatarUrl status")
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .lean();

  const conversationIds = conversations.map((c) => c._id);

  const latestMessages = conversationIds.length
    ? await Promise.all(
        conversationIds.map(async (conversationId) => {
          const doc = await DirectMessage.findOne({ conversationId })
            .populate("userId", "username displayName avatarUrl status")
            .sort({ createdAt: -1 })
            .lean();

          return [String(conversationId), doc];
        })
      )
    : [];

  const latestMessageMap = new Map(latestMessages);
  const unreadCountMap = await buildUnreadCountMap(conversationIds, userId);

  const items = conversations.map((conversation) => ({
    ...sanitizeConversation(
      conversation,
      userId,
      unreadCountMap.get(String(conversation._id)) || 0
    ),
    latestMessage: latestMessageMap.get(String(conversation._id))
      ? sanitizeMessage(latestMessageMap.get(String(conversation._id)), userId)
      : null,
  }));

  res.json({
    ok: true,
    conversations: sortConversations(items),
  });
});

const createConversation = asyncHandler(async (req, res) => {
  const currentUserId = String(req.user.sub);
  const { participantIds = [], title = "" } = req.body || {};

  const cleanedParticipantIds = Array.from(
    new Set(
      [currentUserId, ...participantIds]
        .map((id) => String(id || "").trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
    )
  );

  if (cleanedParticipantIds.length < 2) {
    return res.status(400).json({
      error: { message: "A conversation must have at least 2 participants" },
    });
  }

  const isGroup =
    cleanedParticipantIds.length > 2 || Boolean(String(title || "").trim());

  if (!isGroup && cleanedParticipantIds.length === 2) {
    const existing = await DirectConversation.findOne({
      isGroup: false,
      participantIds: { $all: cleanedParticipantIds, $size: 2 },
    }).populate("participantIds", "username displayName avatarUrl status");

    if (existing) {
      return res.json({
        ok: true,
        conversation: sanitizeConversation(existing, currentUserId, 0),
      });
    }
  }

  const conversation = await DirectConversation.create({
    title: String(title || "").trim(),
    isGroup,
    participantIds: cleanedParticipantIds,
    createdBy: currentUserId,
    lastMessageAt: new Date(),
  });

  const populated = await DirectConversation.findById(conversation._id)
    .populate("participantIds", "username displayName avatarUrl status")
    .lean();

  res.status(201).json({
    ok: true,
    conversation: sanitizeConversation(populated, currentUserId, 0),
  });
});

const getConversationMessages = asyncHandler(async (req, res) => {
  const currentUserId = String(req.user.sub);
  const { conversationId } = req.params;

  const conversation = await DirectConversation.findById(conversationId)
    .populate("participantIds", "username displayName avatarUrl status")
    .lean();

  if (!conversation) {
    return res
      .status(404)
      .json({ error: { message: "Conversation not found" } });
  }

  const isParticipant = (conversation.participantIds || []).some(
    (p) => String(p._id) === currentUserId
  );

  if (!isParticipant) {
    return res.status(403).json({ error: { message: "Access denied" } });
  }

  await DirectMessage.updateMany(
    {
      conversationId,
      userId: { $ne: currentUserId },
      readByUserIds: { $ne: currentUserId },
    },
    {
      $addToSet: { readByUserIds: currentUserId },
    }
  );

  const limitRaw = Number(req.query.limit || 50);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 100)
    : 50;

  const before = req.query.before;
  const filter = { conversationId };

  if (before) {
    const beforeDate = new Date(before);
    if (!Number.isNaN(beforeDate.getTime())) {
      filter.createdAt = { $lt: beforeDate };
    }
  }

  const docs = await DirectMessage.find(filter)
    .populate("userId", "username displayName avatarUrl status")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const messages = docs
    .reverse()
    .map((message) => sanitizeMessage(message, currentUserId));
  const nextCursor = docs.length ? docs[docs.length - 1].createdAt : null;

  res.json({
    ok: true,
    conversation: sanitizeConversation(conversation, currentUserId, 0),
    messages,
    nextCursor,
  });
});

const markConversationRead = asyncHandler(async (req, res) => {
  const currentUserId = String(req.user.sub);
  const { conversationId } = req.params;

  const conversation = await DirectConversation.findById(conversationId).lean();

  if (!conversation) {
    return res
      .status(404)
      .json({ error: { message: "Conversation not found" } });
  }

  const isParticipant = (conversation.participantIds || []).some(
    (id) => String(id) === currentUserId
  );

  if (!isParticipant) {
    return res.status(403).json({ error: { message: "Access denied" } });
  }

  await DirectMessage.updateMany(
    {
      conversationId,
      userId: { $ne: currentUserId },
      readByUserIds: { $ne: currentUserId },
    },
    {
      $addToSet: { readByUserIds: currentUserId },
    }
  );

  res.json({ ok: true, unreadCount: 0 });
});

const sendMessage = asyncHandler(async (req, res) => {
  const currentUserId = String(req.user.sub);
  const { conversationId } = req.params;
  const content = String(req.body?.content || "").trim();

  if (!content) {
    return res
      .status(400)
      .json({ error: { message: "Message content is required" } });
  }

  const conversation = await DirectConversation.findById(conversationId).lean();

  if (!conversation) {
    return res
      .status(404)
      .json({ error: { message: "Conversation not found" } });
  }

  const isParticipant = (conversation.participantIds || []).some(
    (id) => String(id) === currentUserId
  );

  if (!isParticipant) {
    return res.status(403).json({ error: { message: "Access denied" } });
  }

  const message = await DirectMessage.create({
    conversationId,
    userId: currentUserId,
    content,
    readByUserIds: [currentUserId],
  });

  await DirectConversation.findByIdAndUpdate(conversationId, {
    $set: { lastMessageAt: new Date() },
  });

  await stampOnboardingSentDm(currentUserId);

  const populatedMessage = await DirectMessage.findById(message._id)
    .populate("userId", "username displayName avatarUrl status")
    .lean();

  const recipientIds = (conversation.participantIds || [])
    .map((id) => String(id))
    .filter((id) => id !== currentUserId);

  if (recipientIds.length) {
    await Notification.insertMany(
      recipientIds.map((recipientId) => ({
        userId: recipientId,
        type: "direct_message",
        title: conversation.isGroup
          ? `New message in ${conversation.title || "group chat"}`
          : "New direct message",
        body: content.slice(0, 160),
        data: {
          conversationId: String(conversationId),
          senderId: currentUserId,
        },
      }))
    );
  }

  res.status(201).json({
    ok: true,
    message: sanitizeMessage(populatedMessage, currentUserId),
  });
});

module.exports = {
  listConversations,
  createConversation,
  getConversationMessages,
  markConversationRead,
  sendMessage,
}; 