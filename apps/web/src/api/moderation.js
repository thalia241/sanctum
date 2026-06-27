import client from "./client";

export async function listModerationLogs(slug) {
  const { data } = await client.get(`/communities/${slug}/moderation-logs`);
  return data;
}

export async function listAppeals(slug) {
  const { data } = await client.get(`/communities/${slug}/appeals`);
  return data;
}

export async function createAppeal(slug, payload) {
  const { data } = await client.post(`/communities/${slug}/appeals`, payload);
  return data;
}

export async function resolveAppeal(slug, appealId, payload) {
  const { data } = await client.patch(
    `/communities/${slug}/appeals/${appealId}`,
    payload
  );
  return data;
}

export async function listBans(slug) {
  const { data } = await client.get(`/communities/${slug}/moderation/bans`);
  return data;
}

export async function banUser(slug, payload) {
  const { data } = await client.post(`/communities/${slug}/moderation/ban`, payload);
  return data;
}

export async function unbanUser(slug, userId) {
  const { data } = await client.delete(`/communities/${slug}/moderation/ban/${userId}`);
  return data;
} 