import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import ChannelList from "../components/chat/ChannelList";
import MessageList from "../components/chat/MessageList";
import MessageInput from "../components/chat/MessageInput";
import PostComposer from "../components/posts/PostComposer";
import PostList from "../components/posts/PostList";
import TierList from "../components/tiers/TierList";
import { listChannels } from "../api/channels";
import { listMessages } from "../api/messages";
import { getCommunityBySlug, joinCommunity } from "../api/communities";
import { listTiers } from "../api/tiers";
import {
  listProposals,
  createProposal,
  voteOnProposal,
  closeProposal,
} from "../api/governance";
import { getSocket } from "../lib/socket";
import RemoteImage, { RemoteCover } from "../components/common/RemoteImage";

function formatDate(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString();
}

function formatRelativeTime(dateString) {
  if (!dateString) return "No recent activity";
  const now = Date.now();
  const time = new Date(dateString).getTime();
  const diffMs = Math.max(0, now - time);

  const hour = 3600000;
  const day = 86400000;

  if (diffMs < hour) return "Active this hour";
  if (diffMs < day) return "Active today";
  if (diffMs < day * 2) return "Active yesterday";
  if (diffMs < day * 7) return "Active this week";
  return "Quiet lately";
}

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

function getViewStorageKey(slug) {
  return `sanctum:community:${slug}:view`;
}

function getChannelStorageKey(slug) {
  return `sanctum:community:${slug}:channel`;
}

function StatCard({ label, value, subtext }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-100">{value}</p>
      {subtext ? <p className="mt-1 text-xs text-slate-500">{subtext}</p> : null}
    </div>
  );
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
    <span
      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${cls}`}
    >
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
        <span>
          {value} • {percent}%
        </span>
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
            Created by{" "}
            {proposal.createdByUserId?.displayName ||
              proposal.createdByUserId?.username ||
              "Staff"}{" "}
            • {new Date(proposal.createdAt).toLocaleString()}
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

function LandingHero({
  community,
  membership,
  onManageSettings,
  onOpenTiers,
  onJoinCommunity,
  joiningCommunity,
  onSetView,
}) {
  const summary = community?.settingsSummary || {};
  const owner = community?.owner || null;
  const announcement = summary.pinnedAnnouncement || {};
  const accentColor = summary.accentColor || "#c084fc";
  const featuredPerks = Array.isArray(summary.featuredPerks)
    ? summary.featuredPerks.filter(Boolean)
    : [];
  const tierPreview = Array.isArray(community?.tierPreview) ? community?.tierPreview : [];
  const activity = community?.activity || {};

  const heroDescription =
    summary.description || community?.description || "No description yet.";

  return (
    <div className="mb-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
      <RemoteCover
        src={summary.bannerUrl}
        alt={`${community.name} banner`}
        fallbackLabel={community.name}
        className="relative h-56 w-full object-cover"
        fallbackClassName="relative h-56 w-full"
      />

      <div className="relative -mt-56 h-56 bg-gradient-to-t from-slate-950 via-slate-950/60 to-black/20" />

      <div className="relative px-6 pb-6">
        <div className="-mt-12 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-end gap-4">
            <RemoteImage
              src={summary.avatarUrl}
              alt={community.name}
              fallbackLabel={community.name}
              className="h-24 w-24 rounded-3xl border-4 border-slate-950 object-cover"
              fallbackClassName="h-24 w-24 rounded-3xl border-4 border-slate-950"
              textClassName="text-3xl text-slate-600"
            />

            <div className="min-w-0 pb-2">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: `${accentColor}22`,
                    color: accentColor,
                    border: `1px solid ${accentColor}55`,
                  }}
                >
                  {membership ? "Member Space" : "Community Space"}
                </span>

                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                  {community.memberCount || 0} members
                </span>

                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                  {activity.activityLabel || "Growing"}
                </span>

                {tierPreview.length > 0 ? (
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                    {tierPreview.length}+ paid tiers
                  </span>
                ) : null}
              </div>

              <h1 className="truncate text-3xl font-bold text-slate-100">
                {community.name}
              </h1>
              <p className="mt-1 text-sm text-slate-400">@{community.slug}</p>

              {summary.brandHeadline ? (
                <p className="mt-3 text-sm font-medium" style={{ color: accentColor }}>
                  {summary.brandHeadline}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {!membership ? (
              <button
                onClick={onJoinCommunity}
                disabled={joiningCommunity}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
              >
                {joiningCommunity ? "Joining..." : "Join Community"}
              </button>
            ) : (
              <>
                <button
                  onClick={() => onSetView("chat")}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90"
                >
                  Jump into chat
                </button>
                <button
                  onClick={() => onSetView("posts")}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800"
                >
                  Open posts
                </button>
              </>
            )}

            {membership?.role === "owner" || membership?.role === "mod" ? (
              <button
                onClick={onManageSettings}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800"
              >
                Edit Landing
              </button>
            ) : null}

            {membership ? (
              <button
                onClick={onOpenTiers}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800"
              >
                View Tiers
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Members"
            value={community.memberCount || 0}
            subtext={membership?.joinedAt ? `You joined ${formatDate(membership.joinedAt)}` : "Grow the circle"}
          />
          <StatCard
            label="Channels"
            value={activity.channelCount || 0}
            subtext="Places to talk"
          />
          <StatCard
            label="Posts this week"
            value={activity.postCount7d || 0}
            subtext={formatRelativeTime(activity.latestPostAt)}
          />
          <StatCard
            label="Tiers"
            value={tierPreview.length || 0}
            subtext="Premium access options"
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="mb-2 text-lg font-semibold text-slate-100">
                About this community
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                {heroDescription}
              </p>

              {featuredPerks.length > 0 ? (
                <div className="mt-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Why members join
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {featuredPerks.map((perk, index) => (
                      <span
                        key={`${perk}-${index}`}
                        className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-200"
                      >
                        {perk}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {summary.onboardingMessage ? (
              <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                  Welcome note
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                  {summary.onboardingMessage}
                </p>
              </div>
            ) : null}

            {announcement.title || announcement.body ? (
              <div className="rounded-2xl border border-violet-800/50 bg-violet-950/25 p-5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-violet-400/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-200">
                    Pinned
                  </span>
                  <span className="text-xs text-slate-400">Announcement</span>
                </div>

                {announcement.title ? (
                  <h3 className="text-base font-semibold text-slate-100">
                    {announcement.title}
                  </h3>
                ) : null}

                {announcement.body ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                    {announcement.body}
                  </p>
                ) : null}

                {announcement.ctaLabel && announcement.ctaUrl ? (
                  <a
                    href={announcement.ctaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800"
                  >
                    {announcement.ctaLabel}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-100">
                Featured Creator
              </h2>

              {owner ? (
                <div className="flex items-start gap-4">
                  <RemoteImage
                    src={owner.avatarUrl}
                    alt={owner.username}
                    fallbackLabel={owner.displayName || owner.username}
                    className="h-14 w-14 rounded-2xl border border-slate-800 object-cover"
                    fallbackClassName="h-14 w-14 rounded-2xl border border-slate-800"
                    textClassName="text-lg text-slate-500"
                  />

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-100">
                      {owner.displayName || owner.username}
                    </p>
                    <p className="truncate text-xs text-slate-400">@{owner.username}</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Leading this space, shaping the vibe, and building the member experience.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Creator info unavailable.</p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="mb-3 text-lg font-semibold text-slate-100">What to do next</h2>
              <div className="space-y-3 text-sm text-slate-300">
                {!membership ? (
                  <>
                    <p>Join the community to unlock chat, posts, and member-only activity.</p>
                    <button
                      onClick={onJoinCommunity}
                      disabled={joiningCommunity}
                      className="rounded-xl bg-slate-100 px-4 py-2 font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
                    >
                      {joiningCommunity ? "Joining..." : "Join now"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => onSetView("chat")}
                      className="w-full rounded-xl border border-slate-700 px-4 py-3 text-left hover:bg-slate-900"
                    >
                      <span className="block font-medium text-slate-100">Start in chat</span>
                      <span className="block text-xs text-slate-500">
                        Best for quick interaction and return visits
                      </span>
                    </button>

                    <button
                      onClick={() => onSetView("posts")}
                      className="w-full rounded-xl border border-slate-700 px-4 py-3 text-left hover:bg-slate-900"
                    >
                      <span className="block font-medium text-slate-100">Catch up on posts</span>
                      <span className="block text-xs text-slate-500">
                        Best for creator updates and ongoing discussions
                      </span>
                    </button>

                    <button
                      onClick={() => onSetView("governance")}
                      className="w-full rounded-xl border border-slate-700 px-4 py-3 text-left hover:bg-slate-900"
                    >
                      <span className="block font-medium text-slate-100">Open governance</span>
                      <span className="block text-xs text-slate-500">
                        Vote on proposals and review community decisions
                      </span>
                    </button>

                    <button
                      onClick={onOpenTiers}
                      className="w-full rounded-xl border border-slate-700 px-4 py-3 text-left hover:bg-slate-900"
                    >
                      <span className="block font-medium text-slate-100">Explore membership tiers</span>
                      <span className="block text-xs text-slate-500">
                        See premium access and supporter perks
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {summary.transparencyNote ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <h2 className="mb-3 text-lg font-semibold text-slate-100">Community transparency</h2>
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {summary.transparencyNote}
                </p>
              </div>
            ) : null}

            {community.latestPostPreview ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <h2 className="mb-3 text-lg font-semibold text-slate-100">Latest activity</h2>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {community.latestPostPreview.postType === "creator_update"
                    ? "Creator update"
                    : "Recent post"}
                </p>
                <h3 className="mt-2 text-base font-semibold text-slate-100">
                  {community.latestPostPreview.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {community.latestPostPreview.body?.length > 140
                    ? `${community.latestPostPreview.body.slice(0, 140)}...`
                    : community.latestPostPreview.body}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  {formatRelativeTime(community.latestPostPreview.createdAt)}
                </p>
              </div>
            ) : null}

            {tierPreview.length > 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-200">
                    Membership Snapshot
                  </h3>
                  <button
                    onClick={onOpenTiers}
                    className="text-sm text-violet-300 hover:underline"
                  >
                    See all tiers
                  </button>
                </div>

                <div className="space-y-3">
                  {tierPreview.map((tier) => (
                    <div
                      key={tier._id}
                      className="rounded-xl border border-slate-800 bg-slate-900 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-100">
                          {tier.name}
                        </p>
                        {tier.monthlyPriceLabel ? (
                          <span className="text-xs font-medium text-violet-300">
                            {tier.monthlyPriceLabel}
                          </span>
                        ) : null}
                      </div>

                      {tier.highlightText ? (
                        <p className="mt-1 text-xs text-slate-400">
                          {tier.highlightText}
                        </p>
                      ) : null}

                      {(tier.perks || []).length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {tier.perks.slice(0, 2).map((perk, index) => (
                            <span
                              key={`${perk}-${index}`}
                              className="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-300"
                            >
                              {perk}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [view, setView] = useState(() => {
    const stored = localStorage.getItem(getViewStorageKey(slug));
    return stored || "chat";
  });

  const [communityData, setCommunityData] = useState(null);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [proposals, setProposals] = useState([]);

  const [loadingCommunity, setLoadingCommunity] = useState(true);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingGovernance, setLoadingGovernance] = useState(false);
  const [joiningCommunity, setJoiningCommunity] = useState(false);
  const [creatingProposal, setCreatingProposal] = useState(false);
  const [votingId, setVotingId] = useState("");
  const [closingId, setClosingId] = useState("");
  const [error, setError] = useState("");

  const [postsRefreshKey, setPostsRefreshKey] = useState(0);

  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalDescription, setProposalDescription] = useState("");
  const [proposalType, setProposalType] = useState("other");
  const [proposalDurationHours, setProposalDurationHours] = useState(24);

  const activeChannelIdRef = useRef(null);
  const socket = useMemo(() => getSocket(), []);

  function handleSetView(nextView) {
    setView(nextView);
    localStorage.setItem(getViewStorageKey(slug), nextView);
  }

  async function loadCommunityShell() {
    try {
      setLoadingCommunity(true);
      setError("");

      const [communityResponse, tiersResponse] = await Promise.all([
        getCommunityBySlug(slug),
        listTiers(slug),
      ]);

      setCommunityData({
        community: communityResponse.community,
        membership: communityResponse.membership,
      });
      setTiers(tiersResponse.tiers || []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load community");
    } finally {
      setLoadingCommunity(false);
    }
  }

  async function loadGovernance() {
    try {
      setLoadingGovernance(true);
      setError("");
      const data = await listProposals(slug);
      setProposals(data?.proposals || []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load governance");
    } finally {
      setLoadingGovernance(false);
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem(getViewStorageKey(slug));
    setView(stored || "chat");
    loadCommunityShell();
  }, [slug]);

  useEffect(() => {
    async function loadChannels() {
      if (!communityData?.membership) {
        setChannels([]);
        setSelectedChannel(null);
        setLoadingChannels(false);
        return;
      }

      setLoadingChannels(true);
      setError("");

      try {
        const data = await listChannels(slug);
        const items = data.channels || [];
        setChannels(items);

        const storedChannelId = localStorage.getItem(getChannelStorageKey(slug));
        const storedChannel = items.find((channel) => channel._id === storedChannelId);

        setSelectedChannel(storedChannel || items[0] || null);
      } catch (err) {
        setError(err?.response?.data?.error?.message || "Failed to load channels");
      } finally {
        setLoadingChannels(false);
      }
    }

    loadChannels();
  }, [slug, communityData?.membership]);

  useEffect(() => {
    if (selectedChannel?._id) {
      localStorage.setItem(getChannelStorageKey(slug), selectedChannel._id);
    }
  }, [selectedChannel, slug]);

  useEffect(() => {
    async function loadMessagesForChannel() {
      if (!selectedChannel?._id) {
        setMessages([]);
        return;
      }

      setLoadingMessages(true);
      setError("");
      activeChannelIdRef.current = selectedChannel._id;

      try {
        const data = await listMessages(selectedChannel._id);
        setMessages(data.messages || []);
      } catch (err) {
        setError(err?.response?.data?.error?.message || "Failed to load messages");
      } finally {
        setLoadingMessages(false);
      }
    }

    if (view === "chat" && communityData?.membership) {
      loadMessagesForChannel();
    }
  }, [selectedChannel, view, communityData?.membership]);

  useEffect(() => {
    if (view === "governance" && communityData?.membership) {
      loadGovernance();
    }
  }, [view, communityData?.membership, slug]);

  useEffect(() => {
    if (!socket) return;

    function onConnect() {
      console.log("Socket connected:", socket.id);
    }

    function onConnectError(err) {
      console.error("Socket connection error:", err?.message || err);
    }

    function onReceiveMessage(message) {
      const messageChannelId = String(message.channelId?._id || message.channelId || "");

      if (messageChannelId && messageChannelId === String(activeChannelIdRef.current)) {
        setMessages((prev) => [...prev, message]);
      }
    }

    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on("receiveMessage", onReceiveMessage);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("receiveMessage", onReceiveMessage);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !selectedChannel?._id || view !== "chat" || !communityData?.membership) {
      return;
    }

    socket.emit("joinChannel", { channelId: selectedChannel._id }, (response) => {
      if (response?.error) {
        setError(response.error);
      }
    });
  }, [socket, selectedChannel, view, communityData?.membership]);

  async function handleSend(content) {
    if (!selectedChannel?._id) return;

    await new Promise((resolve, reject) => {
      socket.emit(
        "sendMessage",
        {
          channelId: selectedChannel._id,
          content,
        },
        (response) => {
          if (response?.error) {
            reject(new Error(response.error));
            return;
          }
          resolve(response);
        }
      );
    });
  }

  async function handleJoinCommunity() {
    try {
      setJoiningCommunity(true);
      setError("");
      await joinCommunity(slug);
      await loadCommunityShell();
      handleSetView("chat");
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to join community");
    } finally {
      setJoiningCommunity(false);
    }
  }

  async function handleCreateProposal() {
    if (!proposalTitle.trim()) return;

    try {
      setCreatingProposal(true);
      setError("");

      await createProposal(slug, {
        title: proposalTitle,
        description: proposalDescription,
        proposalType,
        durationHours: proposalDurationHours,
      });

      setProposalTitle("");
      setProposalDescription("");
      setProposalType("other");
      setProposalDurationHours(24);
      await loadGovernance();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to create proposal");
    } finally {
      setCreatingProposal(false);
    }
  }

  async function handleVoteProposal(proposalId, vote) {
    try {
      setVotingId(proposalId);
      setError("");
      await voteOnProposal(slug, proposalId, vote);
      await loadGovernance();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to vote");
    } finally {
      setVotingId("");
    }
  }

  async function handleCloseProposal(proposalId) {
    try {
      setClosingId(proposalId);
      setError("");
      await closeProposal(slug, proposalId);
      await loadGovernance();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to close proposal");
    } finally {
      setClosingId("");
    }
  }

  function renderChatView() {
    if (!communityData?.membership) {
      return (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
          <h2 className="text-lg font-semibold text-slate-100">Join to access chat</h2>
          <p className="mt-2 text-sm text-slate-400">
            You need to join this community before you can view channels and send messages.
          </p>
        </div>
      );
    }

    return (
      <div className="grid min-h-[70vh] grid-cols-12 gap-6">
        <aside className="col-span-12 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:col-span-3">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-100">Channels</h2>
            <p className="mt-1 text-sm text-slate-500">
              Pick up where you left off. Your last channel stays remembered here.
            </p>
          </div>

          {loadingChannels ? (
            <p className="text-sm text-slate-400">Loading channels...</p>
          ) : (
            <ChannelList
              channels={channels}
              selectedChannelId={selectedChannel?._id}
              onSelect={setSelectedChannel}
            />
          )}
        </aside>

        <section className="col-span-12 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:col-span-9">
          <div className="mb-4 border-b border-slate-800 pb-3">
            <h2 className="text-lg font-semibold">
              {selectedChannel ? `# ${selectedChannel.name}` : "Select a channel"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Chat is one of the strongest reasons members come back daily.
            </p>
          </div>

          {error ? <p className="mb-4 text-red-300">{error}</p> : null}

          {loadingMessages ? (
            <p className="text-sm text-slate-400">Loading messages...</p>
          ) : (
            <MessageList messages={messages} />
          )}

          <MessageInput
            onSend={async (content) => {
              try {
                setError("");
                await handleSend(content);
              } catch (err) {
                setError(err.message || "Failed to send message");
              }
            }}
            disabled={!selectedChannel}
          />
        </section>
      </div>
    );
  }

  function renderPostsView() {
    if (!communityData?.membership) {
      return (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
          <h2 className="text-lg font-semibold text-slate-100">Join to access posts</h2>
          <p className="mt-2 text-sm text-slate-400">
            Become a member to participate in the community feed.
          </p>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-lg font-semibold text-slate-100">Community Feed</h2>
          <p className="mt-1 text-sm text-slate-400">
            Use creator updates for official announcements, standard posts for discussion,
            and subscriber-only posts for premium content.
          </p>
        </div>

        <PostComposer
          slug={slug}
          membershipRole={communityData?.membership?.role || "member"}
          onCreated={() => {
            setPostsRefreshKey((prev) => prev + 1);
            loadCommunityShell();
          }}
        />

        <PostList slug={slug} refreshKey={postsRefreshKey} />
      </div>
    );
  }

  function renderTiersView() {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Membership Tiers</h2>
            <p className="mt-2 text-sm text-slate-400">
              Subscribe to unlock premium access in this community.
            </p>
          </div>

          {communityData?.membership?.role === "owner" ||
          communityData?.membership?.role === "mod" ? (
            <button
              onClick={() => navigate(`/communities/${slug}/tiers/manage`)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
            >
              Manage Tiers
            </button>
          ) : null}
        </div>

        <TierList slug={slug} />
      </div>
    );
  }

  function renderGovernanceView() {
    if (!communityData?.membership) {
      return (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
          <h2 className="text-lg font-semibold text-slate-100">Join to access governance</h2>
          <p className="mt-2 text-sm text-slate-400">
            Become a member to vote on proposals and review council decisions.
          </p>
        </div>
      );
    }

    const openProposals = proposals.filter((p) => p.status === "open");
    const closedProposals = proposals.filter((p) => p.status === "closed");

    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
            Governance
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-100">Community Council</h2>
          <p className="mt-2 text-sm text-slate-400">
            Structured proposals, visible votes, and accountable decisions.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-xl font-semibold text-slate-100">Create proposal</h3>
          <p className="mt-2 text-sm text-slate-400">
            Use proposals for rule changes, announcements, and other structured decisions.
          </p>

          <div className="mt-5 grid gap-4">
            <input
              value={proposalTitle}
              onChange={(e) => setProposalTitle(e.target.value)}
              placeholder="Proposal title"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
            />

            <textarea
              value={proposalDescription}
              onChange={(e) => setProposalDescription(e.target.value)}
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
                value={proposalDurationHours}
                onChange={(e) => setProposalDurationHours(Number(e.target.value))}
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
                onClick={handleCreateProposal}
                disabled={creatingProposal || !proposalTitle.trim()}
                className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
              >
                {creatingProposal ? "Creating..." : "Create proposal"}
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-100">Open proposals</h3>
            <p className="mt-1 text-sm text-slate-400">
              These are active and still accepting votes.
            </p>
          </div>

          {loadingGovernance ? <p className="text-slate-400">Loading proposals...</p> : null}

          {!loadingGovernance && !openProposals.length ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">No open proposals right now.</p>
            </div>
          ) : null}

          <div className="space-y-4">
            {openProposals.map((proposal) => (
              <ProposalCard
                key={proposal._id}
                proposal={proposal}
                onVote={handleVoteProposal}
                onClose={handleCloseProposal}
                votingId={votingId}
                closingId={closingId}
              />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-100">Closed proposals</h3>
            <p className="mt-1 text-sm text-slate-400">
              Past decisions and outcomes stay visible for accountability.
            </p>
          </div>

          {!loadingGovernance && !closedProposals.length ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">No closed proposals yet.</p>
            </div>
          ) : null}

          <div className="space-y-4">
            {closedProposals.map((proposal) => (
              <ProposalCard
                key={proposal._id}
                proposal={proposal}
                onVote={handleVoteProposal}
                onClose={handleCloseProposal}
                votingId={votingId}
                closingId={closingId}
              />
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <AppShell>
      {loadingCommunity ? (
        <p className="mb-6 text-slate-400">Loading community...</p>
      ) : null}

      {communityData?.community ? (
        <LandingHero
          community={communityData.community}
          membership={communityData.membership}
          onManageSettings={() => navigate(`/communities/${slug}/settings`)}
          onOpenTiers={() => handleSetView("tiers")}
          onJoinCommunity={handleJoinCommunity}
          joiningCommunity={joiningCommunity}
          onSetView={handleSetView}
        />
      ) : null}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleSetView("chat")}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              view === "chat"
                ? "bg-slate-100 text-slate-950"
                : "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
            }`}
          >
            Chat
          </button>

          <button
            onClick={() => handleSetView("posts")}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              view === "posts"
                ? "bg-slate-100 text-slate-950"
                : "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
            }`}
          >
            Posts
          </button>

          <button
            onClick={() => handleSetView("tiers")}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              view === "tiers"
                ? "bg-slate-100 text-slate-950"
                : "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
            }`}
          >
            Tiers
          </button>

          <button
            onClick={() => handleSetView("governance")}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              view === "governance"
                ? "bg-slate-100 text-slate-950"
                : "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
            }`}
          >
            Governance
          </button>
        </div>

        {communityData?.membership ? (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate(`/communities/${slug}/members`)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Members
            </button>

            <button
              onClick={() => navigate(`/communities/${slug}/roles`)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Roles
            </button>

            <button
              onClick={() => navigate(`/communities/${slug}/moderation-logs`)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Moderation Log
            </button>

            <button
              onClick={() => navigate(`/communities/${slug}/appeals`)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Appeals
            </button>

            <button
              onClick={() => navigate(`/communities/${slug}/billing`)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Billing
            </button>

            <button
              onClick={() => navigate(`/communities/${slug}/analytics`)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Analytics
            </button>

            <button
              onClick={() => navigate(`/communities/${slug}/settings`)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Settings
            </button>
          </div>
        ) : null}
      </div>

      {error ? <p className="mb-4 text-red-300">{error}</p> : null}

      {view === "chat" && renderChatView()}
      {view === "posts" && renderPostsView()}
      {view === "tiers" && renderTiersView()}
      {view === "governance" && renderGovernanceView()}
    </AppShell>
  );
} 