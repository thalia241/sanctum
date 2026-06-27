import client from "./client";

export async function listNotifications() {
  const { data } = await client.get("/notifications");
  return data;
}

export async function markNotificationRead(notificationId) {
  const { data } = await client.patch(`/notifications/${notificationId}/read`);
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await client.patch("/notifications/read-all");
  return data;
} 