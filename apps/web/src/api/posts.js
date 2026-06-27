import client from "./client";

export async function listPosts(slug) {
  const { data } = await client.get(`/communities/${slug}/posts`);
  return data;
}

export async function createPost(slug, payload) {
  const { data } = await client.post(`/communities/${slug}/posts`, payload);
  return data;
}

export async function deletePost(postId) {
  const { data } = await client.delete(`/posts/${postId}`);
  return data;
} 