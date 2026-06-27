import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import { useAuth } from "../context/AuthContext";
import { listMyCommunities } from "../api/communities";
import { getFeed } from "../api/feed";
import { listDirectConversations } from "../api/directMessages";
import { listFriendRequests } from "../api/friends";
import RemoteImage from "../components/common/RemoteImage";

function FeedBadge({ children, tone = "default" }) {
  const toneClassMap = {
    default: "border-slate-700 text-slate-300 bg-slate-950",
    profile: "border-pink-700/60 text-pink-200 bg-pink-950/30",
    community: "border-violet-700/60 text-violet-200 bg-violet-950/30",
    public: "border-emerald-700/60 text-emerald-200 bg-emerald-950/30",
    friends: "border-amber-700/60 text-amber-200 bg-amber-950/30",
    creator: "border-sky-700/60 text-sky-200 bg-sky-950/30",
    pinned: "border-cyan-700/60 text-cyan-200 bg-cyan-950/30",
    relevant: "border-fuchsia-700/60 text-fuchsia-200 bg-fuchsia-950/30",
    newjoin: "border-orange-700/60 text-orange-200 bg-orange-950/30",
  };

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
        toneClassMap[tone] || toneClassMap.default
      }`}
    >
      {children}
    </span>
  );
}

function FeedActor({ actor }) {
  return (
    <div className="flex items-start gap-3">
      <RemoteImage
        src={actor?.avatarUrl}
        alt={actor?.username || "User"}
        fallbackLabel={actor?.displayName || actor?.username || "U"}
        className="h-11 w-11 rounded-2xl border border-slate-800 object-cover"
        fallbackClassName="h-11 w-11 rounded-2xl border border-slate-800"
        textClassName="text-sm text-slate-500"
      />

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-100">
            {actor?.displayName || actor?.username || "Unknown user"}
          </span>
          {actor?.username ? (
            <span className="text-sm text-slate-500">@{actor.username}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FeedReasonBadges({ item }) {
  const score = item?.scoreBreakdown || {};
  const badges = [];

  if (score.friendAuthor || score.friendProfileOwner) {
    badges.push(<FeedBadge key="friend" tone="relevant">Friend activity</FeedBadge>);
  }

  if (score.recentlyJoinedCommunity) {
    badges.push(<FeedBadge key="recentjoin" tone="newjoin">From a new join</FeedBadge>);
  }

  if (score.joinedCommunity) {
    badges.push(<FeedBadge key="joined" tone="relevant">From your communities</FeedBadge>);
  }

  if (!badges.length) return null;
  return <div className="mb-3 flex flex-wrap items-center gap-2">{badges}</div>;
}

function ProfileFeedCard({ item }) {
  const actor = item.actor;
  const profileOwner = item.profileOwner;
  const isOwnWall =
    actor?.username && profileOwner?.username && actor.username === profileOwner.username;

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <FeedReasonBadges item={item} />

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <FeedBadge tone="profile">Profile Post</FeedBadge>
            <FeedBadge tone={item.visibility === "friends" ? "friends" : "public"}>
              {item.visibility === "friends" ? "Friends Only" : "Public"}
            </FeedBadge>
            {item.isPinned ? <FeedBadge tone="pinned">Pinned</FeedBadge> : null}
          </div>

          <FeedActor actor={actor} />

          <p className="mt-2 text-xs text-slate-500">
            {isOwnWall ? (
              <>posted on their profile</>
            ) : (
              <>
                posted on{" "}
                <Link
                  to={`/u/${profileOwner?.username}`}
                  className="text-violet-300 hover:text-violet-200"
                >
                  {profileOwner?.displayName || profileOwner?.username || "a profile"}
                </Link>
                ’s profile
              </>
            )}
          </p>
        </div>

        <span className="shrink-0 text-xs text-slate-500">
          {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
        </span>
      </div>

      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{item.body}</p>
    </article>
  );
}

function CommunityFeedCard({ item }) {
  const actor = item.actor;
  const community = item.community;
  const snippet =
    item.body && item.body.length > 320 ? `${item.body.slice(0, 320)}...` : item.body;

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      {item.coverImageUrl ? (
        <div className="mb-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
          <img
            src={item.coverImageUrl}
            alt={item.title || "Post cover"}
            className="max-h-[300px] w-full object-cover"
          />
        </div>
      ) : null}

      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <FeedReasonBadges item={item} />

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <FeedBadge tone="community">Community Post</FeedBadge>

            <FeedBadge tone={item.visibility === "public" ? "public" : "default"}>
              {item.visibility === "public" ? "Public" : "Members Only"}
            </FeedBadge>

            {item.postType === "creator_update" ? (
              <FeedBadge tone="creator">Creator Update</FeedBadge>
            ) : null}

            {item.isPinned ? <FeedBadge tone="pinned">Pinned</FeedBadge> : null}
          </div>

          <FeedActor actor={actor} />

          <p className="mt-2 text-xs text-slate-500">
            posted in{" "}
            <Link
              to={`/communities/${community?.slug}`}
              className="text-violet-300 hover:text-violet-200"
            >
              {community?.name || "Community"}
            </Link>
          </p>
        </div>

        <span className="shrink-0 text-xs text-slate-500">
          {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
        </span>
      </div>

      <h2 className="mb-2 text-lg font-semibold text-slate-100">{item.title}</h2>
      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{snippet}</p>

      <div className="mt-4">
        <Link
          to={`/communities/${community?.slug}`}
          className="inline-flex rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          Open Community
        </Link>
      </div>
    </article>
  );
}

function FeedList({ items }) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Your Feed</h2>
        <p className="mt-2 text-sm text-slate-400">
          Your feed is quiet right now. Add friends, join communities, and start posting.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        if (item.itemType === "profile_post") {
          return <ProfileFeedCard key={item.id} item={item} />;
        }

        if (item.itemType === "community_post") {
          return <CommunityFeedCard key={item.id} item={item} />;
        }

        return null;
      })}
    </div>
  );
}

function getOnboardingProgress(user) {
  const actions = user?.onboarding?.actions || {};
  const core = [
    actions.profileSavedAt,
    actions.themeChosenAt,
    actions.joinedCommunityAt,
    actions.sentFriendRequestAt,
    actions.createdPostAt,
  ];
  const completed = core.filter(Boolean).length;
  return {
    completed,
    total: core.length,
    percent: Math.round((completed / core.length) * 100),
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [communities, setCommunities] = useState([]);
  const [feedItems, setFeedItems] = useState([]);
  const [feedMeta, setFeedMeta] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [friendRequests, setFriendRequests] = useState({ incoming: [], outgoing: [] });
  const [loadingCommunities, setLoadingCommunities] = useState(true);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [communityError, setCommunityError] = useState("");
  const [feedError, setFeedError] = useState("");

  const onboardingProgress = getOnboardingProgress(user);

  useEffect(() => {
    async function loadCommunities() {
      try {
        setLoadingCommunities(true);
        setCommunityError("");

        const data = await listMyCommunities();
        const items = data.communities || data.items || data || [];
        setCommunities(Array.isArray(items) ? items : []);
      } catch (err) {
        setCommunityError(
          err?.response?.data?.error?.message || err.message || "Failed to load communities"
        );
      } finally {
        setLoadingCommunities(false);
      }
    }

    async function loadFeed() {
      try {
        setLoadingFeed(true);
        setFeedError("");

        const [feedData, conversationData, requestData] = await Promise.all([
          getFeed({ limit: 30 }),
          listDirectConversations(),
          listFriendRequests(),
        ]);

        setFeedItems(feedData?.items || []);
        setFeedMeta(feedData?.meta || null);
        setConversations(conversationData?.conversations || []);
        setFriendRequests({
          incoming: requestData?.incoming || [],
          outgoing: requestData?.outgoing || [],
        });
      } catch (err) {
        setFeedError(
          err?.response?.data?.error?.message || err.message || "Failed to load feed"
        );
      } finally {
        setLoadingFeed(false);
      }
    }

    loadCommunities();
    loadFeed();
  }, []);

  const communityCountLabel = useMemo(() => {
    if (!communities.length) return "No communities yet";
    if (communities.length === 1) return "1 community";
    return `${communities.length} communities`;
  }, [communities]);

  const unreadConversations = useMemo(
    () => conversations.filter((item) => (item.unreadCount || 0) > 0),
    [conversations]
  );

  const firstUnreadConversation = unreadConversations[0] || null;
  const incomingRequestCount = friendRequests.incoming.length;

  const feedSummary = useMemo(() => {
    const friendDriven = feedItems.filter(
      (item) =>
        item?.scoreBreakdown?.friendAuthor || item?.scoreBreakdown?.friendProfileOwner
    ).length;

    const joinedCommunityDriven = feedItems.filter(
      (item) =>
        item?.scoreBreakdown?.joinedCommunity || item?.scoreBreakdown?.recentlyJoinedCommunity
    ).length;

    return {
      friendDriven,
      joinedCommunityDriven,
    };
  }, [feedItems]);

  return (
    <AppShell>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-6">
          {!user?.onboarding?.completedAt ? (
            <div className="rounded-3xl border border-violet-700/40 bg-gradient-to-r from-violet-950/50 to-slate-900 p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
                    Welcome flow
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-100">
                    Finish your first five activation steps
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-300">
                    Get your profile set, pick your vibe, join a community, connect with someone, and publish your first post.
                  </p>

                  <div className="mt-4 h-2 w-full max-w-xl overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-violet-400 transition-all"
                      style={{ width: `${onboardingProgress.percent}%` }}
                    />
                  </div>

                  <p className="mt-2 text-sm text-slate-400">
                    {onboardingProgress.completed} of {onboardingProgress.total} core steps done
                  </p>
                </div>

                <button
                  onClick={() => navigate("/welcome")}
                  className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-950 hover:opacity-90"
                >
                  Continue onboarding
                </button>
              </div>
            </div>
          ) : null}

          {(firstUnreadConversation || incomingRequestCount > 0) ? (
            <div className="rounded-3xl border border-emerald-700/30 bg-emerald-950/20 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Pick up where you left off
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {firstUnreadConversation ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <h3 className="font-semibold text-slate-100">Unread messages</h3>
                    <p className="mt-2 text-sm text-slate-400">
                      You have {firstUnreadConversation.unreadCount} unread in{" "}
                      {firstUnreadConversation.title ||
                        firstUnreadConversation.otherParticipants?.[0]?.displayName ||
                        firstUnreadConversation.otherParticipants?.[0]?.username ||
                        "a conversation"}
                      .
                    </p>
                    <button
                      onClick={() => navigate("/inbox")}
                      className="mt-4 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90"
                    >
                      Open inbox
                    </button>
                  </div>
                ) : null}

                {incomingRequestCount > 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <h3 className="font-semibold text-slate-100">Pending friend requests</h3>
                    <p className="mt-2 text-sm text-slate-400">
                      You have {incomingRequestCount} incoming friend request
                      {incomingRequestCount === 1 ? "" : "s"} waiting.
                    </p>
                    <button
                      onClick={() => navigate("/friends")}
                      className="mt-4 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                    >
                      Review requests
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold">Home Feed</h1>
                <p className="mt-1 text-sm text-slate-400">
                  Activity ranked around your friends, your communities, and what you joined most recently.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate("/communities/new")}
                  className="rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-950 hover:opacity-90"
                >
                  Create Community
                </button>

                <button
                  onClick={() => navigate("/discover")}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                >
                  Discover More
                </button>
              </div>
            </div>
          </div>

          {feedMeta ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                <span>{feedSummary.friendDriven} friend-relevant items surfaced</span>
                <span>{feedSummary.joinedCommunityDriven} community-relevant items surfaced</span>
                <span>
                  {feedMeta.totalProfileCandidates || 0} profile candidates scanned
                </span>
                <span>
                  {feedMeta.totalCommunityCandidates || 0} community candidates scanned
                </span>
              </div>
            </div>
          ) : null}

          {loadingFeed ? <p className="text-slate-400">Loading feed...</p> : null}
          {feedError ? <p className="text-red-300">{feedError}</p> : null}

          {!loadingFeed && !feedError ? <FeedList items={feedItems} /> : null}
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Your Communities</h2>
              <p className="text-sm text-slate-400">{communityCountLabel}</p>
            </div>

            {loadingCommunities ? <p className="text-slate-400">Loading...</p> : null}
            {communityError ? <p className="mb-4 text-red-300">{communityError}</p> : null}

            {!loadingCommunities && !communityError && communities.length === 0 ? (
              <p className="text-slate-400">No communities found yet.</p>
            ) : null}

            <div className="space-y-3">
              {communities.map((community) => (
                <Link
                  key={community._id}
                  to={`/communities/${community.slug}`}
                  className="block rounded-2xl border border-slate-800 bg-slate-900 p-4 hover:bg-slate-800"
                >
                  <h3 className="font-semibold text-slate-100">{community.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">{community.slug}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
            <h2 className="text-lg font-semibold">Why the feed feels better</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-400">
              <p>• Friend activity rises faster.</p>
              <p>• Posts from your communities get priority.</p>
              <p>• New community joins get an early boost.</p>
              <p>• Pinned and creator updates stand out more.</p>
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  );
} 