import client from "./client";

export async function listProfilePosts(username) {
  const { data } = await client.get(`/users/${username}/profile-posts`);
  return data;
}

export async function createProfilePost(username, payload) {
  const { data } = await client.post(`/users/${username}/profile-posts`, payload);
  return data;
}

export async function togglePinProfilePost(postId, isPinned) {
  const { data } = await client.patch(`/profile-posts/${postId}/pin`, { isPinned });
  return data;
}

export async function deleteProfilePost(postId) {
  const { data } = await client.delete(`/profile-posts/${postId}`);
  return data;
} 