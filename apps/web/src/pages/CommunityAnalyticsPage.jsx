import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import { getCommunityBySlug } from "../api/communities";
import { listTiers } from "../api/tiers";
import { listPosts } from "../api/posts";

function formatRelativeTime(dateString) {
  if (!dateString) return "No recent activity";
  const now = Date.now();
  const time = new Date(dateString).getTime();
  const diffMs = Math.max(0, now - time);

  const hour = 3600000;
  const day = 86400000;

  if (diffMs < hour) return "Within the last hour";
  if (diffMs < day) return "Today";
  if (diffMs < day * 2) return "Yesterday";
  if (diffMs < day * 7) return "This week";

  return new Date(dateString).toLocaleDateString();
}

function StatCard({ label, value, subtext }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-100">{value}</p>
      {subtext ? <p className="mt-2 text-sm text-slate-400">{subtext}</p> : null}
    </div>
  );
}

function ChecklistItem({ complete, title, body, actionLabel, actionHref }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            complete
              ? "bg-emerald-400 text-slate-950"
              : "bg-slate-800 text-slate-300"
          }`}
        >
          {complete ? "✓" : "•"}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-100">{title}</p>
          <p className="mt-1 text-sm text-slate-400">{body}</p>

          {!complete && actionLabel && actionHref ? (
            <Link
              to={actionHref}
              className="mt-3 inline-flex rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              {actionLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ActionCard({ title, body, actionLabel, onClick, tone = "default" }) {
  const toneClass =
    tone === "primary"
      ? "border-violet-700/40 bg-violet-950/20"
      : "border-slate-800 bg-slate-950";

  return (
    <div className={`rounded-2xl border p-5 ${toneClass}`}>
      <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{body}</p>
      <button
        type="button"
        onClick={onClick}
        className="mt-4 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function RecentPostCard({ post }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
          {post.postType === "creator_update" ? "Creator update" : "Post"}
        </span>
        <span className="text-xs text-slate-500">
          {formatRelativeTime(post.createdAt)}
        </span>
      </div>

      <h3 className="mt-3 text-base font-semibold text-slate-100">
        {post.title || "Untitled post"}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        {post.body?.length > 140 ? `${post.body.slice(0, 140)}...` : post.body}
      </p>
    </div>
  );
}

export default function CommunityAnalyticsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [communityData, setCommunityData] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [communityResponse, tiersResponse, postsResponse] = await Promise.all([
        getCommunityBySlug(slug),
        listTiers(slug),
        listPosts(slug),
      ]);

      setCommunityData(communityResponse);
      setTiers(tiersResponse?.tiers || []);
      setPosts(postsResponse?.posts || []);
    } catch (err) {
      setError(
        err?.response?.data?.error?.message || "Failed to load community analytics"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [slug]);

  const community = communityData?.community || null;
  const membership = communityData?.membership || null;
  const settings = community?.settingsSummary || {};
  const activity = community?.activity || {};

  const creatorPosts = useMemo(
    () => posts.filter((post) => post.postType === "creator_update"),
    [posts]
  );

  const completionItems = useMemo(() => {
    return [
      {
        key: "branding",
        complete: Boolean(settings.brandHeadline || settings.bannerUrl || settings.avatarUrl),
        title: "Branding basics set",
        body: "Add a recognizable banner, avatar, or headline so the community feels intentional.",
        actionLabel: "Edit branding",
        actionHref: `/communities/${slug}/settings`,
      },
      {
        key: "welcome",
        complete: Boolean(settings.onboardingMessage),
        title: "Welcome message added",
        body: "Give new members immediate guidance when they land inside the space.",
        actionLabel: "Write welcome note",
        actionHref: `/communities/${slug}/settings`,
      },
      {
        key: "perks",
        complete: Boolean((settings.featuredPerks || []).length),
        title: "Featured perks configured",
        body: "Show why members join and what makes this space worth staying in.",
        actionLabel: "Add featured perks",
        actionHref: `/communities/${slug}/settings`,
      },
      {
        key: "announcement",
        complete: Boolean(
          settings.pinnedAnnouncement?.title || settings.pinnedAnnouncement?.body
        ),
        title: "Pinned announcement published",
        body: "Use a pinned callout for updates, launches, and important info.",
        actionLabel: "Create announcement",
        actionHref: `/communities/${slug}/settings`,
      },
      {
        key: "creatorUpdate",
        complete: creatorPosts.length > 0,
        title: "First creator update posted",
        body: "Creator updates help make the space feel alive and directed.",
        actionLabel: "Open community feed",
        actionHref: `/communities/${slug}`,
      },
      {
        key: "tier",
        complete: tiers.length > 0,
        title: "At least one tier created",
        body: "Premium tiers make the community feel monetizable and more serious.",
        actionLabel: "Manage tiers",
        actionHref: `/communities/${slug}/tiers/manage`,
      },
    ];
  }, [settings, creatorPosts.length, tiers.length, slug]);

  const completionProgress = useMemo(() => {
    const completeCount = completionItems.filter((item) => item.complete).length;
    return {
      completeCount,
      total: completionItems.length,
      percent: Math.round((completeCount / completionItems.length) * 100),
    };
  }, [completionItems]);

  const activeTierCount = useMemo(
    () => tiers.filter((tier) => tier.isActive !== false).length,
    [tiers]
  );

  const latestPosts = useMemo(() => posts.slice(0, 5), [posts]);

  if (loading) {
    return (
      <AppShell>
        <p className="text-slate-400">Loading analytics...</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
                Owner dashboard
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-100">
                {community?.name || "Community"} Analytics
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                See community health, setup progress, and the highest-value next actions.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate(`/communities/${slug}`)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Open Community
              </button>
              <button
                onClick={() => navigate(`/communities/${slug}/settings`)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90"
              >
                Edit Settings
              </button>
            </div>
          </div>
        </section>

        {error ? <p className="text-red-300">{error}</p> : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Members"
            value={community?.memberCount || 0}
            subtext={membership?.role ? `Your role: ${membership.role}` : "Owner access"}
          />
          <StatCard
            label="Posts this week"
            value={activity.postCount7d || 0}
            subtext={activity.activityLabel || "Growing"}
          />
          <StatCard
            label="Channels"
            value={activity.channelCount || 0}
            subtext="Conversation spaces"
          />
          <StatCard
            label="Active tiers"
            value={activeTierCount}
            subtext={`${tiers.length || 0} total tier configurations`}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-100">
                    Community completion
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    A stronger setup gives members more reasons to join, stay, and upgrade.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Progress</p>
                  <p className="mt-1 text-2xl font-bold text-slate-100">
                    {completionProgress.percent}%
                  </p>
                </div>
              </div>

              <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-violet-400 transition-all"
                  style={{ width: `${completionProgress.percent}%` }}
                />
              </div>

              <p className="mt-3 text-sm text-slate-400">
                {completionProgress.completeCount} of {completionProgress.total} setup goals completed
              </p>

              <div className="mt-6 space-y-3">
                {completionItems.map((item) => (
                  <ChecklistItem key={item.key} {...item} />
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold text-slate-100">Recent content momentum</h2>
              <p className="mt-2 text-sm text-slate-400">
                Recent posts help show whether the community feels directed and alive.
              </p>

              <div className="mt-5 space-y-3">
                {latestPosts.length ? (
                  latestPosts.map((post) => <RecentPostCard key={post._id || post.id} post={post} />)
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-5">
                    <h3 className="text-lg font-semibold text-slate-100">No posts yet</h3>
                    <p className="mt-2 text-sm text-slate-400">
                      Create a post or creator update so members see real momentum.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(`/communities/${slug}`)}
                      className="mt-4 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90"
                    >
                      Open community feed
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold text-slate-100">Action center</h2>
              <p className="mt-2 text-sm text-slate-400">
                These are the highest-value moves to improve activation, retention, and monetization.
              </p>

              <div className="mt-5 space-y-4">
                {!settings.onboardingMessage ? (
                  <ActionCard
                    title="Write a welcome message"
                    body="Help new members understand the vibe and what they should do first."
                    actionLabel="Open settings"
                    onClick={() => navigate(`/communities/${slug}/settings`)}
                    tone="primary"
                  />
                ) : null}

                {!creatorPosts.length ? (
                  <ActionCard
                    title="Publish a creator update"
                    body="A creator update makes the community feel actively led."
                    actionLabel="Open community"
                    onClick={() => navigate(`/communities/${slug}`)}
                  />
                ) : null}

                {!tiers.length ? (
                  <ActionCard
                    title="Create your first paid tier"
                    body="Premium tiers make the space feel more serious and monetizable."
                    actionLabel="Manage tiers"
                    onClick={() => navigate(`/communities/${slug}/tiers/manage`)}
                  />
                ) : null}

                {!settings.pinnedAnnouncement?.title &&
                !settings.pinnedAnnouncement?.body ? (
                  <ActionCard
                    title="Add a pinned announcement"
                    body="Use a pinned block for launches, reminders, or important context."
                    actionLabel="Edit landing"
                    onClick={() => navigate(`/communities/${slug}/settings`)}
                  />
                ) : null}

                {(settings.featuredPerks || []).length === 0 ? (
                  <ActionCard
                    title="Highlight community perks"
                    body="Featured perks make the value of joining clearer at a glance."
                    actionLabel="Add perks"
                    onClick={() => navigate(`/communities/${slug}/settings`)}
                  />
                ) : null}

                {settings.onboardingMessage &&
                creatorPosts.length > 0 &&
                tiers.length > 0 &&
                (settings.featuredPerks || []).length > 0 ? (
                  <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/20 p-5">
                    <h3 className="text-lg font-semibold text-emerald-200">
                      Strong setup so far
                    </h3>
                    <p className="mt-2 text-sm text-emerald-100/80">
                      Your community has the basics that make a creator-led space feel real.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold text-slate-100">Monetization snapshot</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <StatCard
                  label="Configured tiers"
                  value={tiers.length}
                  subtext="Premium structure"
                />
                <StatCard
                  label="Featured perks"
                  value={(settings.featuredPerks || []).length}
                  subtext="Visible reasons to upgrade"
                />
              </div>

              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-400">
                  The stronger your tiers, welcome flow, and creator updates are, the more
                  your community feels worth supporting.
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/communities/${slug}/tiers/manage`)}
                  className="mt-4 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                >
                  Improve monetization
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold text-slate-100">Quick links</h2>
              <div className="mt-4 grid gap-3">
                <Link
                  to={`/communities/${slug}/members`}
                  className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800"
                >
                  Manage members
                </Link>
                <Link
                  to={`/communities/${slug}/roles`}
                  className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800"
                >
                  Review roles
                </Link>
                <Link
                  to={`/communities/${slug}/billing`}
                  className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800"
                >
                  Check billing
                </Link>
                <Link
                  to={`/communities/${slug}/settings`}
                  className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800"
                >
                  Edit landing and branding
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
} 