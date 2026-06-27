import client from "./client";

export async function listMyMedia(params = {}) {
  const { data } = await client.get("/media", { params });
  return data;
} 