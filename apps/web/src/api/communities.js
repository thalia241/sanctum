import client from "./client";

export async function listMyCommunities() {
  const { data } = await client.get("/communities/mine");
  return data;
}

export async function getCommunityBySlug(slug) {
  const { data } = await client.get(`/communities/${slug}`);
  return data;
}

export async function createCommunity(payload) {
  const { data } = await client.post("/communities", payload);
  return data;
}

export async function joinCommunity(slug) {
  const { data } = await client.post(`/communities/${slug}/join`);
  return data;
} 