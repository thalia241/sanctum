import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import { listDiscoverableCommunities } from "../api/discovery";
import { joinCommunity } from "../api/communities";

function formatRelativeActivity(dateString) {
  if (!dateString) return "No recent activity";
  const now = Date.now();
  const time = new Date(dateString).getTime();
  const diffMs = Math.max(0, now - time);

  const minute = 60000;
  const hour = 3600000;
  const day = 86400000;

  if (diffMs < hour) return "Active this hour";
  if (diffMs < day) return "Active today";
  if (diffMs < day * 2) return "Active yesterday";
  if (diffMs < day * 7) return "Active this week";
  return "Quiet lately";
}

function sortCommunities(items, sortBy) {
  const next = [...items];

  if (sortBy === "trending") {
    return next.sort((a, b) => {
      if ((b.recentPostCount || 0) !== (a.recentPostCount || 0)) {
        return (b.recentPostCount || 0) - (a.recentPostCount || 0);
      }
      return (b.memberCount || 0) - (a.memberCount || 0);
    });
  }

  if (sortBy === "members") {
    return next.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
  }

  if (sortBy === "new") {
    return next.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  return next.sort(
    (a, b) =>
      new Date(b.latestActivityAt || b.createdAt).getTime() -
      new Date(a.latestActivityAt || a.createdAt).getTime()
  );
}

function FilterChip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-sm transition ${
        active
          ? "border-violet-500 bg-violet-950/30 text-violet-200"
          : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function DiscoveryCard({ community, joiningSlug, onJoin, onOpenPreview }) {
  const isJoining = joiningSlug === community.slug;
  const previewSnippet = community.previewPost?.body
    ? community.previewPost.body.length > 120
      ? `${community.previewPost.body.slice(0, 120)}...`
      : community.previewPost.body
    : "";

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
      {community.bannerUrl ? (
        <div className="h-32 w-full overflow-hidden border-b border-slate-800 bg-slate-950">
          <img
            src={community.bannerUrl}
            alt={community.name}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div
          className="h-32 border-b border-slate-800"
          style={{
            background: `linear-gradient(135deg, ${community.accentColor || "#c084fc"}22, #0f172a)`,
          }}
        />
      )}

      <div className="p-5">
        <div className="mb-3 flex flex-wrap gap-2">
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

        <div className="flex items-start gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-sm font-bold text-slate-200"
            style={{ boxShadow: `0 0 0 1px ${(community.accentColor || "#c084fc")}33 inset` }}
          >
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
            <h2 className="text-lg font-semibold text-slate-100">{community.name}</h2>
            <p className="mt-1 text-sm text-slate-500">@{community.slug}</p>
            {community.brandHeadline ? (
              <p className="mt-2 text-sm font-medium text-slate-300">
                {community.brandHeadline}
              </p>
            ) : null}
          </div>
        </div>

        <p className="mt-4 min-h-[48px] text-sm leading-6 text-slate-300">
          {community.description || "No description yet."}
        </p>

        {previewSnippet ? (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Preview from the community
            </p>
            <p className="mt-2 text-sm text-slate-300">{previewSnippet}</p>
          </div>
        ) : null}

        {!!community.featuredPerks?.length && (
          <div className="mt-4 flex flex-wrap gap-2">
            {community.featuredPerks.slice(0, 3).map((perk) => (
              <span
                key={perk}
                className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300"
              >
                {perk}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-500">
          <span>{community.memberCount || 0} members</span>
          <span>{community.tierCount || 0} tiers</span>
          <span>{community.recentPostCount || 0} posts this week</span>
          <span>{formatRelativeActivity(community.latestActivityAt)}</span>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onJoin(community.slug)}
            disabled={isJoining}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
          >
            {isJoining ? "Joining..." : "Join now"}
          </button>

          <button
            type="button"
            onClick={() => onOpenPreview(community.slug)}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Preview
          </button>

          <Link
            to={`/communities/${community.slug}`}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Open
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function DiscoveryPage() {
  const navigate = useNavigate();

  const [communities, setCommunities] = useState([]);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("active");
  const [loading, setLoading] = useState(true);
  const [joiningSlug, setJoiningSlug] = useState("");
  const [error, setError] = useState("");

  async function loadCommunities() {
    try {
      setLoading(true);
      setError("");

      const data = await listDiscoverableCommunities();
      setCommunities(data?.communities || []);
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
          err.message ||
          "Failed to load discoverable communities"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCommunities();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const base = !q
      ? communities
      : communities.filter((community) => {
          return (
            community.name?.toLowerCase().includes(q) ||
            community.slug?.toLowerCase().includes(q) ||
            community.description?.toLowerCase().includes(q) ||
            community.brandHeadline?.toLowerCase().includes(q)
          );
        });

    return sortCommunities(base, sortBy);
  }, [query, communities, sortBy]);

  async function handleJoin(slug) {
    try {
      setJoiningSlug(slug);
      setError("");

      await joinCommunity(slug);

      navigate(`/communities/${slug}`);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to join community");
    } finally {
      setJoiningSlug("");
    }
  }

  function handleOpenPreview(slug) {
    navigate(`/c/${slug}`);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
                Growth layer
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-100">
                Discover communities worth joining
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Find active spaces, preview what they’re about, and jump straight into the ones
                that already feel alive.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Available now</p>
              <p className="mt-1 text-2xl font-bold text-slate-100">{communities.length}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
          <div className="flex flex-col gap-4 lg:flex-row">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search communities..."
              className="flex-1 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none"
            />

            <div className="flex flex-wrap gap-2">
              <FilterChip active={sortBy === "active"} onClick={() => setSortBy("active")}>
                Recently active
              </FilterChip>
              <FilterChip active={sortBy === "trending"} onClick={() => setSortBy("trending")}>
                Trending
              </FilterChip>
              <FilterChip active={sortBy === "members"} onClick={() => setSortBy("members")}>
                Most members
              </FilterChip>
              <FilterChip active={sortBy === "new"} onClick={() => setSortBy("new")}>
                New
              </FilterChip>
            </div>
          </div>
        </section>

        {loading ? <p className="text-slate-400">Loading communities...</p> : null}
        {error ? <p className="text-red-300">{error}</p> : null}

        {!loading && !error && filtered.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-slate-100">No matching communities</h2>
            <p className="mt-2 text-sm text-slate-400">
              Try a different keyword or switch sort modes to surface a better fit.
            </p>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          {filtered.map((community) => (
            <DiscoveryCard
              key={community._id}
              community={community}
              joiningSlug={joiningSlug}
              onJoin={handleJoin}
              onOpenPreview={handleOpenPreview}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
} 