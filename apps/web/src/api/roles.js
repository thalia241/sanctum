import client from "./client";

export async function listRoles(slug) {
  const { data } = await client.get(`/communities/${slug}/roles`);
  return data;
}

export async function createRole(slug, payload) {
  const { data } = await client.post(`/communities/${slug}/roles`, payload);
  return data;
}

export async function assignRole(slug, payload) {
  const { data } = await client.post(`/communities/${slug}/roles/assign`, payload);
  return data;
}

export async function unassignRole(slug, payload) {
  const { data } = await client.post(`/communities/${slug}/roles/unassign`, payload);
  return data;
}

export async function listMemberRoles(slug, userId) {
  const { data } = await client.get(`/communities/${slug}/roles/members/${userId}`);
  return data;
} 