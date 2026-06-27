import client from "./client";

export async function getCommunityBillingStatus(slug) {
  const { data } = await client.get(`/communities/${slug}/billing/status`);
  return data;
}

export async function createCommunityPlanCheckout(slug, plan) {
  const { data } = await client.post(`/communities/${slug}/billing/checkout`, {
    plan,
  });
  return data;
}

export async function createBillingPortal() {
  const { data } = await client.post("/billing/portal");
  return data;
} 