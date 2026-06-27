import client from "./client";

export async function listDiscoverableCommunities() {
  const { data } = await client.get("/discovery/communities");
  return data;
}

export async function searchDiscoverableCommunities(query) {
  const { data } = await client.get("/search/communities", {
    params: { q: query },
  });
  return data;
}

export async function getPublicCommunityProfile(slug) {
  const { data } = await client.get(`/communities/${slug}/public`);
  return data;
}  