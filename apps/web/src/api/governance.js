import client from "./client";

export async function listProposals(slug) {
  const { data } = await client.get(`/communities/${slug}/governance/proposals`);
  return data;
}

export async function createProposal(slug, payload) {
  const { data } = await client.post(
    `/communities/${slug}/governance/proposals`,
    payload
  );
  return data;
}

export async function voteOnProposal(slug, proposalId, vote) {
  const { data } = await client.post(
    `/communities/${slug}/governance/proposals/${proposalId}/vote`,
    { vote }
  );
  return data;
}

export async function closeProposal(slug, proposalId) {
  const { data } = await client.patch(
    `/communities/${slug}/governance/proposals/${proposalId}/close`
  );
  return data;
} 