const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notifications.controller");

router.get("/notifications", requireAuth, listNotifications);
router.patch("/notifications/:notificationId/read", requireAuth, markNotificationRead);
router.patch("/notifications/read-all", requireAuth, markAllNotificationsRead);

module.exports = router; 