import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getPublicCommunityProfile } from "../api/discovery";
import { joinCommunity } from "../api/communities";

function formatDate(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString();
}

export default function PublicCommunityPreviewPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const data = await getPublicCommunityProfile(slug);
        setCommunity(data?.community || null);
      } catch (err) {
        setError(
          err?.response?.data?.error?.message || err.message || "Failed to load preview"
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  async function handleJoin() {
    try {
      setJoining(true);
      setError("");

      await joinCommunity(slug);
      navigate(`/communities/${slug}`);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to join community");
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-300">
        <div className="mx-auto max-w-6xl">Loading community preview...</div>
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-300">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="text-2xl font-semibold text-slate-100">Community preview unavailable</h1>
          <p className="mt-2 text-sm text-slate-400">{error || "This preview could not be loaded."}</p>
          <Link
            to="/discover"
            className="mt-4 inline-flex rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Back to discover
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link to="/discover" className="text-sm text-slate-400 hover:text-slate-200">
            ← Back to discover
          </Link>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleJoin}
              disabled={joining}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
            >
              {joining ? "Joining..." : "Join community"}
            </button>

            <Link
              to="/register"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Create account
            </Link>
          </div>
        </div>

        <section className="overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900">
          {community.bannerUrl ? (
            <div className="h-56 w-full overflow-hidden border-b border-slate-800 bg-slate-950">
              <img
                src={community.bannerUrl}
                alt={community.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div
              className="h-56 border-b border-slate-800"
              style={{
                background: `linear-gradient(135deg, ${(community.accentColor || "#c084fc")}22, #020617)`,
              }}
            />
          )}

          <div className="p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-2xl font-bold">
                  {community.avatarUrl ? (
                    <img
                      src={community.avatarUrl}
                      alt={community.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    community.name?.slice(0, 1)?.toUpperCase() || "C"
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    {(community.labels || []).map((label) => (
                      <span
                        key={label}
                        className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300"
                      >
                        {label}
                      </span>
                    ))}
                    {community.isPublicFeed ? (
                      <span className="rounded-full border border-emerald-700/50 bg-emerald-950/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
                        Public feed
                      </span>
                    ) : null}
                  </div>

                  <h1 className="mt-3 text-3xl font-bold">{community.name}</h1>
                  <p className="mt-1 text-sm text-slate-500">@{community.slug}</p>

                  {community.brandHeadline ? (
                    <p className="mt-4 text-lg text-slate-300">{community.brandHeadline}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid shrink-0 grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Members</p>
                  <p className="mt-1 text-2xl font-bold">{community.memberCount || 0}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Tiers</p>
                  <p className="mt-1 text-2xl font-bold">{community.tierCount || 0}</p>
                </div>
              </div>
            </div>

            <p className="mt-6 max-w-3xl text-sm leading-7 text-slate-300">
              {community.description || "No public description yet."}
            </p>

            {!!community.featuredPerks?.length && (
              <div className="mt-6">
                <h2 className="text-lg font-semibold">Why people join</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {community.featuredPerks.map((perk) => (
                    <span
                      key={perk}
                      className="rounded-full border border-slate-700 px-3 py-1.5 text-sm text-slate-300"
                    >
                      {perk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(community.pinnedAnnouncement?.title || community.pinnedAnnouncement?.body) && (
              <div className="mt-6 rounded-2xl border border-violet-700/30 bg-violet-950/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">
                  Pinned announcement
                </p>
                {community.pinnedAnnouncement.title ? (
                  <h3 className="mt-2 text-lg font-semibold">{community.pinnedAnnouncement.title}</h3>
                ) : null}
                {community.pinnedAnnouncement.body ? (
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {community.pinnedAnnouncement.body}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold">Public preview</h2>
              <p className="mt-2 text-sm text-slate-400">
                Get a feel for the kind of activity inside before you join.
              </p>
            </div>

            {!community.recentPublicPosts?.length ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <h3 className="text-lg font-semibold">No public posts yet</h3>
                <p className="mt-2 text-sm text-slate-400">
                  This community may still be active privately, but there is no public feed preview right now.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {community.recentPublicPosts.map((post) => (
                  <article
                    key={post.id}
                    className="rounded-3xl border border-slate-800 bg-slate-900 p-5"
                  >
                    {post.coverImageUrl ? (
                      <div className="mb-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                        <img
                          src={post.coverImageUrl}
                          alt={post.title}
                          className="max-h-[280px] w-full object-cover"
                        />
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                        {post.postType === "creator_update" ? "Creator update" : "Post"}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDate(post.createdAt)}
                      </span>
                    </div>

                    <h3 className="mt-3 text-xl font-semibold">{post.title}</h3>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                      {post.body?.length > 240 ? `${post.body.slice(0, 240)}...` : post.body}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-lg font-semibold">Why this matters</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-400">
                <p>• Public previews make communities shareable.</p>
                <p>• Better previews improve join conversion.</p>
                <p>• Communities feel like real destinations, not just internal pages.</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-lg font-semibold">Created</h2>
              <p className="mt-2 text-sm text-slate-400">{formatDate(community.createdAt)}</p>

              <button
                type="button"
                onClick={handleJoin}
                disabled={joining}
                className="mt-5 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
              >
                {joining ? "Joining..." : "Join this community"}
              </button>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
} 