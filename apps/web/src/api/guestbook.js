import client from "./client";

export async function listGuestbookEntries(username) {
  const { data } = await client.get(`/users/${username}/guestbook`);
  return data;
}

export async function createGuestbookEntry(username, payload) {
  const { data } = await client.post(`/users/${username}/guestbook`, payload);
  return data;
}

export async function deleteGuestbookEntry(entryId) {
  const { data } = await client.delete(`/guestbook/${entryId}`);
  return data;
}

export async function togglePinGuestbookEntry(entryId) {
  const { data } = await client.patch(`/guestbook/${entryId}/pin`);
  return data;
} 