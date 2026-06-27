import { useEffect, useMemo, useState } from "react";
import { listPosts } from "../../api/posts";
import PostItem from "./PostItem";

function PinnedCreatorUpdates({ posts }) {
  if (posts.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border border-violet-800/50 bg-violet-950/20 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-100">
          Pinned Creator Updates
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          Official announcements and important updates from the creator side of the community.
        </p>
      </div>

      <div className="space-y-4">
        {posts.map((post) => (
          <PostItem key={post._id} post={post} compact />
        ))}
      </div>
    </section>
  );
}

export default function PostList({ slug, refreshKey = 0 }) {
  const [posts, setPosts] = useState([]);
  const [viewer, setViewer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPosts() {
      try {
        setLoading(true);
        setError("");

        const data = await listPosts(slug);
        setPosts(data.posts || []);
        setViewer(data.viewer || null);
      } catch (err) {
        setError(
          err?.response?.data?.error?.message ||
            err.message ||
            "Failed to load posts"
        );
      } finally {
        setLoading(false);
      }
    }

    loadPosts();
  }, [slug, refreshKey]);

  const pinnedCreatorUpdates = useMemo(() => {
    return posts.filter(
      (post) => post.isPinned && post.postType === "creator_update"
    );
  }, [posts]);

  const regularFeed = useMemo(() => {
    return posts.filter(
      (post) => !(post.isPinned && post.postType === "creator_update")
    );
  }, [posts]);

  if (loading) {
    return <p className="text-sm text-slate-400">Loading posts...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-300">{error}</p>;
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-sm text-slate-300">No posts yet.</p>
        <p className="mt-1 text-sm text-slate-500">
          Creator updates, supporter drops, and community posts will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {viewer ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
          <span className="font-medium text-slate-100">Your access:</span>{" "}
          {viewer.isSubscriber
            ? "Member + active subscriber"
            : viewer.role
            ? `Member (${viewer.role})`
            : "Member"}
        </div>
      ) : null}

      <PinnedCreatorUpdates posts={pinnedCreatorUpdates} />

      {regularFeed.length > 0 ? (
        regularFeed.map((post) => <PostItem key={post._id} post={post} />)
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-300">Nothing else in the feed right now.</p>
        </div>
      )}
    </div>
  );
}   