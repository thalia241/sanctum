import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import { listModerationLogs, createAppeal } from "../api/moderation";

function formatDateTime(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString();
}

function actionLabel(actionType) {
  const map = {
    ban_user: "User banned",
    unban_user: "User unbanned",
    remove_post: "Post removed",
    update_rules: "Rules updated",
    update_roles: "Roles updated",
    pin_announcement: "Announcement pinned",
    unpin_announcement: "Announcement unpinned",
    appeal_approved: "Appeal approved",
    appeal_denied: "Appeal denied",
    other: "Moderation action",
  };

  return map[actionType] || "Moderation action";
}

export default function CommunityModerationLogPage() {
  const { slug } = useParams();

  const [logs, setLogs] = useState([]);
  const [permissions, setPermissions] = useState({
    includeStaff: false,
    role: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [appealDrafts, setAppealDrafts] = useState({});
  const [submittingAppealId, setSubmittingAppealId] = useState("");
  const [message, setMessage] = useState("");

  async function loadLogs() {
    try {
      setLoading(true);
      setError("");

      const data = await listModerationLogs(slug);
      setLogs(data?.logs || []);
      setPermissions(
        data?.permissions || {
          includeStaff: false,
          role: null,
        }
      );
    } catch (err) {
      setError(
        err?.response?.data?.error?.message || "Failed to load moderation logs"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, [slug]);

  const grouped = useMemo(() => {
    return {
      public: logs.filter((log) => log.visibility === "public"),
      staff: logs.filter((log) => log.visibility === "staff"),
    };
  }, [logs]);

  function updateAppealDraft(logId, value) {
    setAppealDrafts((prev) => ({
      ...prev,
      [logId]: value,
    }));
  }

  async function handleSubmitAppeal(logId) {
    const explanation = String(appealDrafts[logId] || "").trim();
    if (!explanation) return;

    try {
      setSubmittingAppealId(logId);
      setError("");
      setMessage("");

      await createAppeal(slug, {
        moderationLogId: logId,
        explanation,
      });

      setMessage("Appeal submitted.");
      setAppealDrafts((prev) => ({
        ...prev,
        [logId]: "",
      }));
      await loadLogs();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to submit appeal");
    } finally {
      setSubmittingAppealId("");
    }
  }

  function renderLogCard(log, showAppealForm = false) {
    return (
      <article
        key={log.id}
        className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                {actionLabel(log.actionType)}
              </span>

              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                  log.visibility === "public"
                    ? "border-emerald-700/50 bg-emerald-950/20 text-emerald-200"
                    : "border-amber-700/50 bg-amber-950/20 text-amber-200"
                }`}
              >
                {log.visibility}
              </span>
            </div>

            <h2 className="mt-3 text-lg font-semibold text-slate-100">
              {log.targetLabel || "Moderation target"}
            </h2>

            {log.reason ? (
              <p className="mt-2 text-sm leading-6 text-slate-300">{log.reason}</p>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No reason was provided.</p>
            )}

            <p className="mt-3 text-xs text-slate-500">
              By {log.actor?.displayName || log.actor?.username || "Moderator"} •{" "}
              {formatDateTime(log.createdAt)}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {!log.linkedAppealId && log.actionType === "ban_user" ? (
              <Link
                to={`/communities/${slug}/appeals`}
                className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                View appeals
              </Link>
            ) : null}
          </div>
        </div>

        {showAppealForm && log.actionType === "ban_user" && !log.linkedAppealId ? (
          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <h3 className="text-sm font-semibold text-slate-100">Submit an appeal</h3>
            <textarea
              value={appealDrafts[log.id] || ""}
              onChange={(e) => updateAppealDraft(log.id, e.target.value)}
              placeholder="Explain why this action should be reviewed..."
              className="mt-3 min-h-28 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none"
            />
            <button
              type="button"
              onClick={() => handleSubmitAppeal(log.id)}
              disabled={
                submittingAppealId === log.id || !String(appealDrafts[log.id] || "").trim()
              }
              className="mt-3 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
            >
              {submittingAppealId === log.id ? "Submitting..." : "Submit appeal"}
            </button>
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
                Governance
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-100">
                Moderation Transparency Log
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Visible moderation history makes community power more accountable.
              </p>
            </div>

            <Link
              to={`/communities/${slug}/appeals`}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Open appeals
            </Link>
          </div>
        </section>

        {error ? <p className="text-red-300">{error}</p> : null}
        {message ? <p className="text-emerald-300">{message}</p> : null}

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Public transparency log</h2>
            <p className="mt-1 text-sm text-slate-400">
              These actions are visible as part of community accountability.
            </p>
          </div>

          {!loading && !grouped.public.length ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">No public moderation actions yet.</p>
            </div>
          ) : null}

          <div className="space-y-4">
            {grouped.public.map((log) => renderLogCard(log, true))}
          </div>
        </section>

        {permissions.includeStaff ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Staff-only log</h2>
              <p className="mt-1 text-sm text-slate-400">
                Internal moderation history for owners and moderators.
              </p>
            </div>

            {!loading && !grouped.staff.length ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <p className="text-sm text-slate-400">No staff-only moderation entries yet.</p>
              </div>
            ) : null}

            <div className="space-y-4">
              {grouped.staff.map((log) => renderLogCard(log, false))}
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
} 