import client from "./client";

export async function listDirectConversations() {
  const { data } = await client.get("/inbox/conversations");
  return data;
}

export async function createDirectConversation(payload) {
  const { data } = await client.post("/inbox/conversations", payload);
  return data;
}

export async function getDirectMessages(conversationId, params = {}) {
  const { data } = await client.get(
    `/inbox/conversations/${conversationId}/messages`,
    {
      params,
    }
  );
  return data;
}

export async function sendDirectMessage(conversationId, payload) {
  const { data } = await client.post(
    `/inbox/conversations/${conversationId}/messages`,
    payload
  );
  return data;
}

export async function markConversationRead(conversationId) {
  const { data } = await client.post(
    `/inbox/conversations/${conversationId}/read`
  );
  return data;
} 