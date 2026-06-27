import client from "./client";

export async function listMessages(channelId) {
  const { data } = await client.get(`/channels/${channelId}/messages`);
  return data;
} 