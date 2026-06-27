const asyncHandler = require("../utils/asyncHandler");
const GuestbookEntry = require("../models/GuestbookEntry");
const Notification = require("../models/Notification");
const User = require("../models/User");

function sanitizeEntry(entry) {
  return {
    _id: entry._id,
    profileOwnerId: entry.profileOwnerId,
    authorId: entry.authorId,
    body: entry.body,
    isPinned: entry.isPinned,
    isDeleted: entry.isDeleted,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

// GET /api/users/:username/guestbook
const listGuestbookEntries = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const owner = await User.findOne({ username }).lean();
  if (!owner) {
    return res.status(404).json({ error: { message: "User not found" } });
  }

  const entries = await GuestbookEntry.find({
    profileOwnerId: owner._id,
    isDeleted: false,
  })
    .sort({ isPinned: -1, createdAt: -1 })
    .populate("authorId", "username avatarUrl displayName")
    .lean();

  res.json({
    ok: true,
    entries,
  });
});

// POST /api/users/:username/guestbook
const createGuestbookEntry = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { username } = req.params;
  const trimmedBody = String(req.body.body || "").trim();

  if (!trimmedBody) {
    return res.status(400).json({
      error: { message: "Guestbook message is required" },
    });
  }

  const owner = await User.findOne({ username });
  if (!owner) {
    return res.status(404).json({ error: { message: "User not found" } });
  }

  const entry = await GuestbookEntry.create({
    profileOwnerId: owner._id,
    authorId: userId,
    body: trimmedBody,
  });

  const populated = await GuestbookEntry.findById(entry._id)
    .populate("authorId", "username avatarUrl displayName")
    .lean();

  if (String(owner._id) !== String(userId)) {
    await Notification.create({
      userId: owner._id,
      type: "guestbook_entry",
      title: "New guestbook message",
      body: trimmedBody.slice(0, 120),
      data: {
        username: owner.username,
        guestbookEntryId: entry._id,
        authorId: userId,
      },
    });
  }

  res.status(201).json({
    ok: true,
    entry: populated,
  });
});

// DELETE /api/guestbook/:entryId
const deleteGuestbookEntry = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { entryId } = req.params;

  const entry = await GuestbookEntry.findById(entryId);
  if (!entry || entry.isDeleted) {
    return res.status(404).json({ error: { message: "Guestbook entry not found" } });
  }

  const isOwner = String(entry.profileOwnerId) === String(userId);
  const isAuthor = String(entry.authorId) === String(userId);

  if (!isOwner && !isAuthor) {
    return res.status(403).json({
      error: { message: "You do not have permission to delete this guestbook entry" },
    });
  }

  entry.isDeleted = true;
  entry.deletedAt = new Date();
  entry.deletedBy = userId;
  await entry.save();

  res.json({ ok: true });
});

// PATCH /api/guestbook/:entryId/pin
const togglePinGuestbookEntry = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { entryId } = req.params;

  const entry = await GuestbookEntry.findById(entryId);
  if (!entry || entry.isDeleted) {
    return res.status(404).json({ error: { message: "Guestbook entry not found" } });
  }

  const isOwner = String(entry.profileOwnerId) === String(userId);
  if (!isOwner) {
    return res.status(403).json({
      error: { message: "Only the profile owner can pin guestbook entries" },
    });
  }

  entry.isPinned = !entry.isPinned;
  await entry.save();

  const populated = await GuestbookEntry.findById(entry._id)
    .populate("authorId", "username avatarUrl displayName")
    .lean();

  res.json({
    ok: true,
    entry: populated,
  });
});

module.exports = {
  listGuestbookEntries,
  createGuestbookEntry,
  deleteGuestbookEntry,
  togglePinGuestbookEntry,
}; 