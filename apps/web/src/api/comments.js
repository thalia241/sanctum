import client from "./client";

export async function listComments(postId) {
  const { data } = await client.get(`/posts/${postId}/comments`);
  return data;
}

export async function createComment(postId, payload) {
  const { data } = await client.post(`/posts/${postId}/comments`, payload);
  return data;
}

export async function deleteComment(commentId) {
  const { data } = await client.delete(`/comments/${commentId}`);
  return data;
} 