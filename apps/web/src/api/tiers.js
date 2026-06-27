import client from "./client";

export async function listTiers(slug) {
  const { data } = await client.get(`/communities/${slug}/tiers`);
  return data;
}

export async function checkoutTier(slug, tierId) {
  const { data } = await client.post(`/communities/${slug}/tiers/${tierId}/checkout`);
  return data;
}

export async function createTier(slug, payload) {
  const { data } = await client.post(`/communities/${slug}/tiers`, payload);
  return data;
}

export async function updateTier(slug, tierId, payload) {
  const { data } = await client.patch(`/communities/${slug}/tiers/${tierId}`, payload);
  return data;
} 