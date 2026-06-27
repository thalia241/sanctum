const asyncHandler = require("../utils/asyncHandler");
const Message = require("../models/Message");
const { ensureCanAccessChannel } = require("../sockets/access");

const getChannelMessages = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { channelId } = req.params;

  const { channel } = await ensureCanAccessChannel({ userId, channelId });

  const limitRaw = req.query?.limit;
  const beforeRaw = req.query?.before;

  let limit = Number(limitRaw || 50);
  if (!Number.isFinite(limit) || limit < 1) limit = 50;
  if (limit > 100) limit = 100;

  const filter = { channelId: channel._id };

  if (beforeRaw) {
    const beforeDate = new Date(beforeRaw);
    if (!Number.isNaN(beforeDate.getTime())) {
      filter.createdAt = { $lt: beforeDate };
    }
  }

  const docs = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const messages = docs.reverse().map((m) => {
    if (m.isDeleted) {
      return {
        ...m,
        content: "",
        redacted: true,
      };
    }
    return { ...m, redacted: false };
  });

  const nextCursor = docs.length ? docs[docs.length - 1].createdAt : null;

  res.json({
    ok: true,
    channelId: String(channel._id),
    messages,
    nextCursor,
  });
});

module.exports = { getChannelMessages }; 