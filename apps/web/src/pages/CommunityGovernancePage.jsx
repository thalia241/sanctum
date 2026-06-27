import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import {
  listProposals,
  createProposal,
  voteOnProposal,
  closeProposal,
} from "../api/governance";

function formatTimeRemaining(closesAt, status) {
  if (!closesAt || status === "closed") return "Closed";

  const diff = new Date(closesAt).getTime() - Date.now();
  if (diff <= 0) return "Closing soon";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days >= 1) return `${days}d left`;
  if (hours >= 1) return `${hours}h left`;

  const minutes = Math.floor(diff / (1000 * 60));
  return `${Math.max(minutes, 1)}m left`;
}

function getVoteTotals(votes) {
  const yes = votes?.yes || 0;
  const no = votes?.no || 0;
  const abstain = votes?.abstain || 0;
  const total = yes + no + abstain;
  return { yes, no, abstain, total };
}

function getPercent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function ProposalTypeBadge({ type }) {
  const labels = {
    rule_change: "Rule Change",
    announcement: "Announcement",
    other: "General",
  };

  return (
    <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
      {labels[type] || "General"}
    </span>
  );
}

function StatusBadge({ status, outcome }) {
  let text = "Open";
  let cls = "border-sky-700/50 bg-sky-950/20 text-sky-200";

  if (status === "closed") {
    if (outcome === "passed") {
      text = "Passed";
      cls = "border-emerald-700/50 bg-emerald-950/20 text-emerald-200";
    } else if (outcome === "failed") {
      text = "Failed";
      cls = "border-rose-700/50 bg-rose-950/20 text-rose-200";
    } else {
      text = "Closed";
      cls = "border-slate-700 bg-slate-950 text-slate-300";
    }
  }

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>
      {text}
    </span>
  );
}

function VoteButton({ active, disabled, label, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl border px-4 py-2 text-sm transition ${
        active
          ? "border-violet-500 bg-violet-950/30 text-violet-200"
          : "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
      } disabled:opacity-50`}
    >
      {label}
    </button>
  );
}

function VoteBar({ label, value, total }) {
  const percent = getPercent(value, total);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>{value} • {percent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-slate-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function ProposalCard({ proposal, onVote, onClose, votingId, closingId }) {
  const { yes, no, abstain, total } = getVoteTotals(proposal.votes);

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <ProposalTypeBadge type={proposal.proposalType} />
            <StatusBadge status={proposal.status} outcome={proposal.outcome} />
            <span className="text-xs text-slate-500">
              {formatTimeRemaining(proposal.closesAt, proposal.status)}
            </span>
          </div>

          <h2 className="text-xl font-semibold text-slate-100">{proposal.title}</h2>

          {proposal.description ? (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
              {proposal.description}
            </p>
          ) : null}

          <p className="mt-3 text-xs text-slate-500">
            Created by {proposal.createdByUserId?.displayName || proposal.createdByUserId?.username || "Staff"} •{" "}
            {new Date(proposal.createdAt).toLocaleString()}
          </p>
        </div>

        {proposal.permissions?.canClose && proposal.status === "open" ? (
          <button
            type="button"
            onClick={() => onClose(proposal._id)}
            disabled={closingId === proposal._id}
            className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            {closingId === proposal._id ? "Closing..." : "Close"}
          </button>
        ) : null}
      </div>

      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-100">Vote summary</span>
          <span className="text-xs text-slate-500">
            {total} total vote{total === 1 ? "" : "s"}
          </span>
          {proposal.myVote ? (
            <span className="rounded-full border border-violet-700/50 bg-violet-950/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-200">
              You voted {proposal.myVote}
            </span>
          ) : null}
        </div>

        <div className="space-y-3">
          <VoteBar label="Yes" value={yes} total={total} />
          <VoteBar label="No" value={no} total={total} />
          <VoteBar label="Abstain" value={abstain} total={total} />
        </div>

        {proposal.status === "open" ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <VoteButton
              label="Vote Yes"
              active={proposal.myVote === "yes"}
              disabled={votingId === proposal._id || !proposal.permissions?.canVote}
              onClick={() => onVote(proposal._id, "yes")}
            />
            <VoteButton
              label="Vote No"
              active={proposal.myVote === "no"}
              disabled={votingId === proposal._id || !proposal.permissions?.canVote}
              onClick={() => onVote(proposal._id, "no")}
            />
            <VoteButton
              label="Abstain"
              active={proposal.myVote === "abstain"}
              disabled={votingId === proposal._id || !proposal.permissions?.canVote}
              onClick={() => onVote(proposal._id, "abstain")}
            />
          </div>
        ) : (
          <p className="mt-5 text-sm text-slate-400">
            Voting is closed for this proposal.
          </p>
        )}
      </div>
    </article>
  );
}

export default function CommunityGovernancePage() {
  const { slug } = useParams();

  const [proposals, setProposals] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [proposalType, setProposalType] = useState("other");
  const [durationHours, setDurationHours] = useState(24);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [votingId, setVotingId] = useState("");
  const [closingId, setClosingId] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const res = await listProposals(slug);
      setProposals(res.proposals || []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load proposals");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [slug]);

  const openProposals = useMemo(
    () => proposals.filter((p) => p.status === "open"),
    [proposals]
  );

  const closedProposals = useMemo(
    () => proposals.filter((p) => p.status === "closed"),
    [proposals]
  );

  async function handleCreate() {
    if (!title.trim()) return;

    try {
      setCreating(true);
      setError("");

      await createProposal(slug, {
        title,
        description,
        proposalType,
        durationHours,
      });

      setTitle("");
      setDescription("");
      setProposalType("other");
      setDurationHours(24);
      await load();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to create proposal");
    } finally {
      setCreating(false);
    }
  }

  async function handleVote(id, vote) {
    try {
      setVotingId(id);
      setError("");
      await voteOnProposal(slug, id, vote);
      await load();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to vote");
    } finally {
      setVotingId("");
    }
  }

  async function handleClose(id) {
    try {
      setClosingId(id);
      setError("");
      await closeProposal(slug, id);
      await load();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to close proposal");
    } finally {
      setClosingId("");
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
            Governance
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-100">
            Community Council
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Structured proposals, visible votes, and accountable decisions.
          </p>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold text-slate-100">Create proposal</h2>
          <p className="mt-2 text-sm text-slate-400">
            Use proposals for rule changes, announcements, and other structured decisions.
          </p>

          <div className="mt-5 grid gap-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Proposal title"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
            />

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what members are voting on..."
              className="min-h-32 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <select
                value={proposalType}
                onChange={(e) => setProposalType(e.target.value)}
                className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
              >
                <option value="other">General</option>
                <option value="rule_change">Rule Change</option>
                <option value="announcement">Announcement</option>
              </select>

              <select
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
              >
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
                <option value={72}>72 hours</option>
                <option value={168}>7 days</option>
              </select>
            </div>

            <div>
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || !title.trim()}
                className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create proposal"}
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Open proposals</h2>
            <p className="mt-1 text-sm text-slate-400">
              These are active and still accepting votes.
            </p>
          </div>

          {loading ? <p className="text-slate-400">Loading proposals...</p> : null}

          {!loading && !openProposals.length ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">No open proposals right now.</p>
            </div>
          ) : null}

          <div className="space-y-4">
            {openProposals.map((proposal) => (
              <ProposalCard
                key={proposal._id}
                proposal={proposal}
                onVote={handleVote}
                onClose={handleClose}
                votingId={votingId}
                closingId={closingId}
              />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Closed proposals</h2>
            <p className="mt-1 text-sm text-slate-400">
              Past decisions and outcomes stay visible for accountability.
            </p>
          </div>

          {!loading && !closedProposals.length ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">No closed proposals yet.</p>
            </div>
          ) : null}

          <div className="space-y-4">
            {closedProposals.map((proposal) => (
              <ProposalCard
                key={proposal._id}
                proposal={proposal}
                onVote={handleVote}
                onClose={handleClose}
                votingId={votingId}
                closingId={closingId}
              />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
} 