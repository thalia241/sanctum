const asyncHandler = require("../utils/asyncHandler");
const Notification = require("../models/Notification");

// GET /api/notifications
const listNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.sub;

  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  res.json({ ok: true, notifications });
});

// PATCH /api/notifications/:notificationId/read
const markNotificationRead = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const { notificationId } = req.params;

  const notification = await Notification.findOne({
    _id: notificationId,
    userId,
  });

  if (!notification) {
    return res.status(404).json({ error: { message: "Notification not found" } });
  }

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }

  res.json({ ok: true, notification });
});

// PATCH /api/notifications/read-all
const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const userId = req.user.sub;

  await Notification.updateMany(
    { userId, isRead: false },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );

  res.json({ ok: true });
});

module.exports = {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
}; 