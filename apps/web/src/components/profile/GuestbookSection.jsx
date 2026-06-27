import { useEffect, useState } from "react";
import {
  listGuestbookEntries,
  createGuestbookEntry,
  deleteGuestbookEntry,
  togglePinGuestbookEntry,
} from "../../api/guestbook";
import { useAuth } from "../../context/AuthContext";
import RemoteImage from "../common/RemoteImage";

function GuestbookComposer({ username, onCreated }) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    const trimmed = body.trim();
    if (!trimmed) {
      setError("Message cannot be empty");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await createGuestbookEntry(username, { body: trimmed });
      setBody("");
      onCreated?.(data.entry);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to post message");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error ? (
        <div className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={`Leave a message for @${username}...`}
        className="min-h-[100px] w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
        maxLength={500}
      />

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Posting..." : "Sign Guestbook"}
      </button>
    </form>
  );
}

function GuestbookItem({ entry, isProfileOwner, isAuthor, onDeleted, onPinned }) {
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    try {
      setBusy(true);
      await deleteGuestbookEntry(entry._id);
      onDeleted?.(entry._id);
    } catch (err) {
      console.error("Delete guestbook entry failed:", err);
    } finally {
      setBusy(false);
    }
  }

  async function handlePinToggle() {
    try {
      setBusy(true);
      const data = await togglePinGuestbookEntry(entry._id);
      onPinned?.(data.entry);
    } catch (err) {
      console.error("Pin toggle failed:", err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <RemoteImage
            src={entry.authorId?.avatarUrl}
            alt={entry.authorId?.username || "User"}
            fallbackLabel={entry.authorId?.displayName || entry.authorId?.username || "U"}
            className="h-10 w-10 rounded-xl border border-slate-800 object-cover"
            fallbackClassName="h-10 w-10 rounded-xl border border-slate-800"
            textClassName="text-sm text-slate-500"
          />

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-100">
                {entry.authorId?.displayName || entry.authorId?.username || "User"}
              </span>
              {entry.isPinned ? (
                <span className="rounded-full border border-amber-700 bg-amber-950 px-2 py-0.5 text-[11px] text-amber-300">
                  Pinned
                </span>
              ) : null}
            </div>

            <div className="mt-1 text-xs text-slate-400">
              @{entry.authorId?.username || "unknown"} ·{" "}
              {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ""}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {isProfileOwner ? (
            <button
              onClick={handlePinToggle}
              disabled={busy}
              className="text-xs text-violet-300 hover:text-violet-200 disabled:opacity-50"
            >
              {entry.isPinned ? "Unpin" : "Pin"}
            </button>
          ) : null}

          {isProfileOwner || isAuthor ? (
            <button
              onClick={handleDelete}
              disabled={busy}
              className="text-xs text-red-300 hover:text-red-200 disabled:opacity-50"
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>

      <p className="whitespace-pre-wrap text-sm text-slate-200">{entry.body}</p>
    </div>
  );
}

export default function GuestbookSection({ username, profileOwnerId }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadEntries() {
      try {
        setLoading(true);
        setError("");

        const data = await listGuestbookEntries(username);
        setEntries(data.entries || []);
      } catch (err) {
        setError(err?.response?.data?.error?.message || "Failed to load guestbook");
      } finally {
        setLoading(false);
      }
    }

    if (username) {
      loadEntries();
    }
  }, [username]);

  function handleCreated(newEntry) {
    setEntries((prev) =>
      [newEntry, ...prev].sort((a, b) => {
        if (a.isPinned === b.isPinned) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        return a.isPinned ? -1 : 1;
      })
    );
  }

  function handleDeleted(entryId) {
    setEntries((prev) => prev.filter((entry) => entry._id !== entryId));
  }

  function handlePinned(updatedEntry) {
    setEntries((prev) =>
      prev
        .map((entry) => (entry._id === updatedEntry._id ? updatedEntry : entry))
        .sort((a, b) => {
          if (a.isPinned === b.isPinned) {
            return new Date(b.createdAt) - new Date(a.createdAt);
          }
          return a.isPinned ? -1 : 1;
        })
    );
  }

  const isProfileOwner = String(user?.id || "") === String(profileOwnerId || "");

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="mb-4 text-lg font-semibold">Guestbook</h2>

      <GuestbookComposer username={username} onCreated={handleCreated} />

      {loading ? <p className="mt-4 text-sm text-slate-400">Loading guestbook...</p> : null}
      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

      <div className="mt-6 space-y-4">
        {!loading && entries.length === 0 ? (
          <p className="text-sm text-slate-400">No messages yet. Be the first to sign it.</p>
        ) : null}

        {entries.map((entry) => (
          <GuestbookItem
            key={entry._id}
            entry={entry}
            isProfileOwner={isProfileOwner}
            isAuthor={String(entry.authorId?._id || "") === String(user?.id || "")}
            onDeleted={handleDeleted}
            onPinned={handlePinned}
          />
        ))}
      </div>
    </section>
  );
}  