import client from "./client";

export async function getMyProfile() {
  const { data } = await client.get("/users/me");
  return data;
}

export async function updateMyProfile(payload) {
  const { data } = await client.patch("/users/me", payload);
  return data;
}

export async function getUserProfile(username) {
  const { data } = await client.get(`/users/${username}`);
  return data;
}

export async function searchUsers(query) {
  const { data } = await client.get("/users/search", {
    params: { q: query },
  });
  return data;
}  