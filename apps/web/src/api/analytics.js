import client from "./client";

export async function getCommunityAnalytics(slug) {
  const { data } = await client.get(`/communities/${slug}/analytics`);
  return data;
} 