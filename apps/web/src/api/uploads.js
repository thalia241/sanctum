import client from "./client";

export async function uploadFile(file, kind = "media") {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await client.post(`/uploads/${kind}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
} 