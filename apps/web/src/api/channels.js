import client from "./client";

export async function listChannels(slug) {
  const { data } = await client.get(`/communities/${slug}/channels`);
  return data;
} 