import client from "./client";

export async function listMembers(slug) {
  const { data } = await client.get(`/communities/${slug}/members`);
  return data;
}

export async function promoteMember(slug, userId) {
  const { data } = await client.post(`/communities/${slug}/members/${userId}/promote`);
  return data;
}

export async function demoteMember(slug, userId) {
  const { data } = await client.post(`/communities/${slug}/members/${userId}/demote`);
  return data;
}

export async function kickMember(slug, userId) {
  const { data } = await client.post(`/communities/${slug}/members/${userId}/kick`);
  return data;
}

export async function banMember(slug, userId, reason = "") {
  const { data } = await client.post(`/communities/${slug}/bans/${userId}`, {
    reason,
  });
  return data;
}

export async function listBans(slug) {
  const { data } = await client.get(`/communities/${slug}/bans`);
  return data;
}

export async function unbanMember(slug, userId) {
  const { data } = await client.delete(`/communities/${slug}/bans/${userId}`);
  return data;
} 