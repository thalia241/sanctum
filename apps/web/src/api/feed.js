import client from "./client";

export async function getFeed(params = {}) {
  const { data } = await client.get("/feed", { params });
  return data;
}