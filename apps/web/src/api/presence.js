import client from "./client";

export async function getPresence(ids = []) {
  const cleaned = Array.from(
    new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))
  );

  if (!cleaned.length) {
    return { ok: true, presence: {} };
  }

  const { data } = await client.get("/presence", {
    params: {
      ids: cleaned.join(","),
    },
  });

  return data;
} 