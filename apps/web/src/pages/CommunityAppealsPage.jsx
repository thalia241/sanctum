import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import { listAppeals, resolveAppeal } from "../api/moderation";

function formatDateTime(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString();
}

function StatusBadge({ status }) {
  const toneMap = {
    submitted: "border-sky-700/50 bg-sky-950/20 text-sky-200",
    under_review: "border-amber-700/50 bg-amber-950/20 text-amber-200",
    approved: "border-emerald-700/50 bg-emerald-950/20 text-emerald-200",
    denied: "border-rose-700/50 bg-rose-950/20 text-rose-200",
    withdrawn: "border-slate-700 bg-slate-950 text-slate-300",
  };

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${toneMap[status] || toneMap.submitted}`}>
      {String(status || "submitted").replace("_", " ")}
    </span>
  );
}

export default function CommunityAppealsPage() {
  const { slug } = useParams();

  const [appeals, setAppeals] = useState([]);
  const [permissions, setPermissions] = useState({
    staffAccess: false,
    role: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resolutionDrafts, setResolutionDrafts] = useState({});
  const [updatingId, setUpdatingId] = useState("");

  async function loadAppeals() {
    try {
      setLoading(true);
      setError("");

      const data = await listAppeals(slug);
      setAppeals(data?.appeals || []);
      setPermissions(
        data?.permissions || {
          staffAccess: false,
          role: null,
        }
      );
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load appeals");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppeals();
  }, [slug]);

  const grouped = useMemo(() => {
    return {
      active: appeals.filter((appeal) =>
        ["submitted", "under_review"].includes(appeal.status)
      ),
      resolved: appeals.filter((appeal) =>
        ["approved", "denied", "withdrawn"].includes(appeal.status)
      ),
    };
  }, [appeals]);

  function updateDraft(appealId, key, value) {
    setResolutionDrafts((prev) => ({
      ...prev,
      [appealId]: {
        ...(prev[appealId] || {}),
        [key]: value,
      },
    }));
  }

  async function handleResolve(appealId, status) {
    try {
      setUpdatingId(appealId);
      setError("");
      setMessage("");

      const draft = resolutionDrafts[appealId] || {};

      await resolveAppeal(slug, appealId, {
        status,
        resolutionNote: draft.resolutionNote || "",
      });

      setMessage(`Appeal ${status.replace("_", " ")}.`);
      await loadAppeals();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to update appeal");
    } finally {
      setUpdatingId("");
    }
  }

  function AppealCard({ appeal }) {
    const isStaff = permissions.staffAccess;
    const isActive = ["submitted", "under_review"].includes(appeal.status);

    return (
      <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={appeal.status} />
              <span className="text-xs text-slate-500">
                {formatDateTime(appeal.createdAt)}
              </span>
            </div>

            <h2 className="mt-3 text-lg font-semibold text-slate-100">
              Appeal from {appeal.appellant?.displayName || appeal.appellant?.username || "Member"}
            </h2>

            {appeal.moderationLog ? (
              <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Related moderation action
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  {appeal.moderationLog.actionType} • {appeal.moderationLog.targetLabel || "Target"}
                </p>
                {appeal.moderationLog.reason ? (
                  <p className="mt-2 text-sm text-slate-400">
                    {appeal.moderationLog.reason}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Appeal explanation
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                {appeal.explanation}
              </p>
            </div>

            {appeal.resolutionNote ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Resolution note
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {appeal.resolutionNote}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {isStaff && isActive ? (
          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <h3 className="text-sm font-semibold text-slate-100">Resolve appeal</h3>

            <textarea
              value={resolutionDrafts[appeal.id]?.resolutionNote || ""}
              onChange={(e) => updateDraft(appeal.id, "resolutionNote", e.target.value)}
              placeholder="Add a resolution note..."
              className="mt-3 min-h-28 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none"
            />

            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleResolve(appeal.id, "under_review")}
                disabled={updatingId === appeal.id}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
              >
                Mark under review
              </button>

              <button
                type="button"
                onClick={() => handleResolve(appeal.id, "approved")}
                disabled={updatingId === appeal.id}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
              >
                Approve appeal
              </button>

              <button
                type="button"
                onClick={() => handleResolve(appeal.id, "denied")}
                disabled={updatingId === appeal.id}
                className="rounded-xl border border-rose-700/50 bg-rose-950/20 px-4 py-2 text-sm text-rose-200 hover:bg-rose-950/30 disabled:opacity-50"
              >
                Deny appeal
              </button>
            </div>
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
            Governance
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-100">Appeals</h1>
          <p className="mt-2 text-sm text-slate-400">
            Process-based moderation starts with visible review and resolution.
          </p>
        </section>

        {error ? <p className="text-red-300">{error}</p> : null}
        {message ? <p className="text-emerald-300">{message}</p> : null}

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-100">Active appeals</h2>

          {!loading && !grouped.active.length ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">No active appeals right now.</p>
            </div>
          ) : null}

          <div className="space-y-4">
            {grouped.active.map((appeal) => (
              <AppealCard key={appeal.id} appeal={appeal} />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-100">Resolved appeals</h2>

          {!loading && !grouped.resolved.length ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">No resolved appeals yet.</p>
            </div>
          ) : null}

          <div className="space-y-4">
            {grouped.resolved.map((appeal) => (
              <AppealCard key={appeal.id} appeal={appeal} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
} 