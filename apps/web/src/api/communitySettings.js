import client from "./client";

export async function getCommunitySettings(slug) {
  const { data } = await client.get(`/communities/${slug}/settings`);
  return data;
}

export async function updateCommunitySettings(slug, payload) {
  const { data } = await client.patch(`/communities/${slug}/settings`, payload);
  return data;
} 