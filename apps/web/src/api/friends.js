import client from "./client";

export async function listFriends() {
  const { data } = await client.get("/friends");
  return data;
}

export async function listFriendRequests() {
  const { data } = await client.get("/friends/requests");
  return data;
}

export async function getFriendshipStatus(username) {
  const { data } = await client.get(`/users/${username}/friendship`);
  return data;
}

export async function sendFriendRequest(username) {
  const { data } = await client.post(`/users/${username}/friend-request`);
  return data;
}

export async function acceptFriendRequest(requestId) {
  const { data } = await client.post(`/friend-requests/${requestId}/accept`);
  return data;
}

export async function declineFriendRequest(requestId) {
  const { data } = await client.post(`/friend-requests/${requestId}/decline`);
  return data;
}

export async function cancelFriendRequest(requestId) {
  const { data } = await client.post(`/friend-requests/${requestId}/cancel`);
  return data;
}

export async function removeFriend(username) {
  const { data } = await client.delete(`/users/${username}/friend`);
  return data;
}

export async function updateTopFriends(topFriendIds) {
  const { data } = await client.patch("/friends/top", { topFriendIds });
  return data;
} 