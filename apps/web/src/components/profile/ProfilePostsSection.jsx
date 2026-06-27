import { useEffect, useState } from "react";
import {
  listProfilePosts,
  createProfilePost,
  togglePinProfilePost,
  deleteProfilePost,
} from "../../api/profilePosts";
import RemoteImage from "../common/RemoteImage";

function VisibilityBadge({ visibility }) {
  const label = visibility === "friends" ? "Friends Only" : "Public";

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
        visibility === "friends"
          ? "border-amber-700/60 bg-amber-950/30 text-amber-200"
          : "border-emerald-700/60 bg-emerald-950/30 text-emerald-200"
      }`}
    >
      {label}
    </span>
  );
}

function Composer({
  username,
  canPost,
  onCreated,
}) {
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    try {
      setSubmitting(true);
      setError("");

      const data = await createProfilePost(username, {
        body: trimmed,
        visibility,
      });

      setBody("");
      setVisibility("public");
      onCreated?.(data.post);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to post update");
    } finally {
      setSubmitting(false);
    }
  }

  if (!canPost) return null;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Profile Posts</h2>
        <p className="text-sm text-slate-400">
          Leave an update on this profile.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Say something..."
          className="min-h-[110px] w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none"
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
          >
            <option value="public">Public</option>
            <option value="friends">Friends only</option>
          </select>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-400 disabled:opacity-60"
          >
            {submitting ? "Posting..." : "Post update"}
          </button>
        </div>
      </form>
    </section>
  );
}

function PostCard({
  post,
  isOwnProfile,
  currentUsername,
  onDelete,
  onTogglePin,
}) {
  const canDelete =
    currentUsername &&
    (post.author?.username === currentUsername || isOwnProfile);

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <RemoteImage
            src={post.author?.avatarUrl}
            alt={post.author?.username || "User"}
            fallbackLabel={post.author?.displayName || post.author?.username || "U"}
            className="h-12 w-12 rounded-2xl border border-slate-800 object-cover"
            fallbackClassName="h-12 w-12 rounded-2xl border border-slate-800"
            textClassName="text-sm text-slate-500"
          />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-100">
                {post.author?.displayName || post.author?.username || "Unknown user"}
              </span>

              {post.author?.username ? (
                <span className="text-sm text-slate-500">@{post.author.username}</span>
              ) : null}

              <VisibilityBadge visibility={post.visibility} />

              {post.isPinned ? (
                <span className="rounded-full border border-sky-700/60 bg-sky-950/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-200">
                  Pinned
                </span>
              ) : null}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              {post.createdAt ? new Date(post.createdAt).toLocaleString() : ""}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOwnProfile ? (
            <button
              onClick={() => onTogglePin(post)}
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
            >
              {post.isPinned ? "Unpin" : "Pin"}
            </button>
          ) : null}

          {canDelete ? (
            <button
              onClick={() => onDelete(post)}
              className="rounded-lg border border-red-800 px-3 py-1 text-xs text-red-200 hover:bg-red-950"
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-200">
        {post.body}
      </p>
    </article>
  );
}

export default function ProfilePostsSection({
  username,
  isOwnProfile,
  currentUsername,
  canPost,
}) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadPosts() {
    try {
      setLoading(true);
      setError("");
      const data = await listProfilePosts(username);
      setPosts(data.posts || []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load profile posts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (username) {
      loadPosts();
    }
  }, [username]);

  function handleCreated(post) {
    setPosts((prev) => [post, ...prev.filter((item) => item.id !== post.id)]);
  }

  async function handleDelete(post) {
    try {
      await deleteProfilePost(post.id);
      setPosts((prev) => prev.filter((item) => item.id !== post.id));
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to delete profile post");
    }
  }

  async function handleTogglePin(post) {
    try {
      const data = await togglePinProfilePost(post.id, !post.isPinned);
      const updated = data.post;

      setPosts((prev) => {
        const next = prev.map((item) => {
          if (item.id === updated.id) return updated;
          if (updated.isPinned && item.id !== updated.id) {
            return { ...item, isPinned: false };
          }
          return item;
        });

        return [...next].sort((a, b) => {
          if (a.isPinned === b.isPinned) {
            return new Date(b.createdAt) - new Date(a.createdAt);
          }
          return a.isPinned ? -1 : 1;
        });
      });
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to update pin");
    }
  }

  return (
    <div className="space-y-6">
      <Composer username={username} canPost={canPost} onCreated={handleCreated} />

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Profile Feed</h2>
          <p className="text-sm text-slate-400">
            Personal updates, friend notes, and profile activity.
          </p>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-400">Loading profile posts...</p>
        ) : !posts.length ? (
          <p className="text-sm text-slate-400">No profile posts yet.</p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isOwnProfile={isOwnProfile}
                currentUsername={currentUsername}
                onDelete={handleDelete}
                onTogglePin={handleTogglePin}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
} 