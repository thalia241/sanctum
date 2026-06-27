const { Server } = require("socket.io");
const env = require("../config/env");
const Message = require("../models/Message");
const DirectConversation = require("../models/DirectConversation");
const DirectMessage = require("../models/DirectMessage");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { socketAuthMiddleware } = require("./auth");
const { ensureCanAccessChannel } = require("./access");
const { setIO } = require("./io");
const {
  markUserOnline,
  markUserOffline,
} = require("../lib/presence");

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

function sanitizeDirectMessage(message) {
  return {
    id: message._id,
    conversationId: message.conversationId,
    userId: message.userId?._id || message.userId,
    author: message.userId?._id ? sanitizeParticipant(message.userId) : null,
    content: message.isDeleted ? "" : message.content,
    isDeleted: Boolean(message.isDeleted),
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

async function ensureCanAccessDirectConversation({ userId, conversationId }) {
  const conversation = await DirectConversation.findById(conversationId).lean();

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const isParticipant = (conversation.participantIds || []).some(
    (id) => String(id) === String(userId)
  );

  if (!isParticipant) {
    throw new Error("Access denied");
  }

  return conversation;
}

async function emitPresenceUpdate(io, userId, isOnline, lastActiveAt = null) {
  const user = await User.findById(userId).select("friends").lean();
  if (!user) return;

  const recipientIds = Array.from(
    new Set([String(userId), ...(user.friends || []).map((id) => String(id))])
  );

  for (const recipientId of recipientIds) {
    io.to(`user:${recipientId}`).emit("presence:update", {
      userId: String(userId),
      isOnline: Boolean(isOnline),
      lastActiveAt: lastActiveAt || null,
    });
  }
}

function initSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_ORIGIN, credentials: true },
  });

  setIO(io);
  io.use(socketAuthMiddleware);

  io.on("connection", async (socket) => {
    const userId = socket.data.user.id;
    socket.join(`user:${userId}`);

    const becameOnline = markUserOnline(userId);
    if (becameOnline) {
      await User.findByIdAndUpdate(userId, {
        $set: { lastActiveAt: new Date() },
      });
      await emitPresenceUpdate(io, userId, true, new Date());
    }

    socket.emit("ready", { ok: true, user: socket.data.user });

    socket.on("joinChannel", async (payload, ack) => {
      try {
        const channelId = payload?.channelId;
        if (!channelId) throw new Error("channelId is required");

        await ensureCanAccessChannel({ userId, channelId });

        socket.join(String(channelId));
        ack?.({ ok: true, joined: String(channelId) });
      } catch (e) {
        ack?.({ ok: false, error: e.message });
      }
    });

    socket.on("leaveChannel", (payload, ack) => {
      const channelId = payload?.channelId;
      if (channelId) socket.leave(String(channelId));
      ack?.({ ok: true });
    });

    socket.on("sendMessage", async (payload, ack) => {
      try {
        const channelId = payload?.channelId;
        const content = String(payload?.content || "").trim();

        if (!channelId) throw new Error("channelId is required");
        if (!content) throw new Error("content is required");
        if (content.length > 4000) throw new Error("content too long");

        await ensureCanAccessChannel({ userId, channelId });

        const msg = await Message.create({
          channelId,
          userId,
          content,
        });

        io.to(String(channelId)).emit("receiveMessage", msg);
        ack?.({ ok: true, message: msg });
      } catch (e) {
        ack?.({ ok: false, error: e.message });
      }
    });

    socket.on("direct:join", async (payload, ack) => {
      try {
        const conversationId = payload?.conversationId;
        if (!conversationId) throw new Error("conversationId is required");

        await ensureCanAccessDirectConversation({ userId, conversationId });

        socket.join(`dm:${conversationId}`);
        ack?.({ ok: true, joined: `dm:${conversationId}` });
      } catch (e) {
        ack?.({ ok: false, error: e.message });
      }
    });

    socket.on("direct:leave", (payload, ack) => {
      const conversationId = payload?.conversationId;
      if (conversationId) {
        socket.leave(`dm:${conversationId}`);
      }
      ack?.({ ok: true });
    });

    socket.on("direct:typing", async (payload, ack) => {
      try {
        const conversationId = payload?.conversationId;
        const isTyping = Boolean(payload?.isTyping);

        if (!conversationId) throw new Error("conversationId is required");

        await ensureCanAccessDirectConversation({ userId, conversationId });

        socket.to(`dm:${conversationId}`).emit("direct:typing", {
          conversationId: String(conversationId),
          userId: String(userId),
          username: socket.data.user.username,
          isTyping,
        });

        ack?.({ ok: true });
      } catch (e) {
        ack?.({ ok: false, error: e.message });
      }
    });

    socket.on("direct:send", async (payload, ack) => {
      try {
        const conversationId = payload?.conversationId;
        const content = String(payload?.content || "").trim();

        if (!conversationId) throw new Error("conversationId is required");
        if (!content) throw new Error("content is required");
        if (content.length > 4000) throw new Error("content too long");

        const conversation = await ensureCanAccessDirectConversation({
          userId,
          conversationId,
        });

        const message = await DirectMessage.create({
          conversationId,
          userId,
          content,
        });

        await DirectConversation.findByIdAndUpdate(conversationId, {
          $set: { lastMessageAt: new Date() },
        });

        const populatedMessage = await DirectMessage.findById(message._id)
          .populate("userId", "username displayName avatarUrl status")
          .lean();

        const sanitizedMessage = sanitizeDirectMessage(populatedMessage);

        const participantIds = (conversation.participantIds || []).map((id) =>
          String(id)
        );

        if (participantIds.length) {
          const recipientIds = participantIds.filter(
            (participantId) => participantId !== String(userId)
          );

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
                  senderId: String(userId),
                },
              }))
            );
          }

          participantIds.forEach((participantId) => {
            io.to(`user:${participantId}`).emit("direct:message", {
              conversationId: String(conversationId),
              message: sanitizedMessage,
            });
          });
        }

        io.to(`dm:${conversationId}`).emit("direct:typing", {
          conversationId: String(conversationId),
          userId: String(userId),
          username: socket.data.user.username,
          isTyping: false,
        });

        ack?.({ ok: true, message: sanitizedMessage });
      } catch (e) {
        ack?.({ ok: false, error: e.message });
      }
    });

    socket.on("disconnect", async () => {
      const becameOffline = markUserOffline(userId);
      if (!becameOffline) return;

      const lastActiveAt = new Date();
      await User.findByIdAndUpdate(userId, {
        $set: { lastActiveAt },
      });

      await emitPresenceUpdate(io, userId, false, lastActiveAt);
    });
  });

  return io;
}

module.exports = { initSockets }; 