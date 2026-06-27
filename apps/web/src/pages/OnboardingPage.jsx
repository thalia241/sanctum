import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import { useAuth } from "../context/AuthContext";
import { getMyProfile, updateMyProfile, searchUsers } from "../api/users";
import { VIBE_PRESETS, getPresetTheme } from "../lib/theme";
import { listDiscoverableCommunities } from "../api/discovery";
import { joinCommunity, listMyCommunities } from "../api/communities";
import {
  sendFriendRequest,
  listFriends,
  listFriendRequests,
} from "../api/friends";
import { createProfilePost, listProfilePosts } from "../api/profilePosts";
import {
  createDirectConversation,
  sendDirectMessage,
  listDirectConversations,
} from "../api/directMessages";

const REQUIRED_STEPS = ["profile", "theme", "community", "people", "post"];
const ALL_STEPS = ["profile", "theme", "community", "people", "post", "dm"];

function StepPill({ active, complete, label, index, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
        active
          ? "border-violet-500 bg-violet-950/40"
          : complete
          ? "border-emerald-700/50 bg-emerald-950/20"
          : "border-slate-800 bg-slate-950 hover:bg-slate-900"
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
          complete
            ? "bg-emerald-400 text-slate-950"
            : active
            ? "bg-violet-400 text-slate-950"
            : "bg-slate-800 text-slate-200"
        }`}
      >
        {complete ? "✓" : index + 1}
      </div>
      <div className="min-w-0">
        <p className="font-medium text-slate-100">{label}</p>
        <p className="text-xs text-slate-400">
          {complete ? "Done" : active ? "Current step" : "Not done yet"}
        </p>
      </div>
    </button>
  );
}

function EmptyState({ title, body, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-5">
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function getKeywordPool(user, selectedVibe) {
  const parts = [
    ...(user?.interests || []),
    ...(user?.fandomTags || []),
    user?.bio || "",
    user?.status || "",
    selectedVibe || "",
  ];

  return Array.from(
    new Set(
      parts
        .join(" ")
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .map((item) => item.trim())
        .filter((item) => item.length >= 3)
    )
  );
}

function getRecommendedCommunities(communities, user, selectedVibe, joinedSlugs) {
  const keywords = getKeywordPool(user, selectedVibe);
  const joinedSet = new Set(joinedSlugs);

  const scored = (communities || []).map((community) => {
    const haystack =
      `${community.name || ""} ${community.slug || ""} ${community.description || ""}`.toLowerCase();

    let score = 0;
    for (const keyword of keywords) {
      if (haystack.includes(keyword)) score += 3;
    }

    if (selectedVibe && haystack.includes(selectedVibe)) score += 2;
    if ((community.memberCount || 0) > 0) score += 1;
    if (community.description) score += 1;
    if (joinedSet.has(community.slug)) score -= 100;

    return {
      ...community,
      recommendationScore: score,
    };
  });

  const sorted = [...scored].sort((a, b) => {
    if (b.recommendationScore !== a.recommendationScore) {
      return b.recommendationScore - a.recommendationScore;
    }
    return (b.memberCount || 0) - (a.memberCount || 0);
  });

  return sorted.slice(0, 6);
}

function getCompletionState({
  joinedSlugs,
  friends,
  outgoingRequests,
  profilePosts,
  directConversations,
  onboardingState,
}) {
  const actions = onboardingState?.actions || {};

  const profileDone = Boolean(actions.profileSavedAt);
  const themeDone = Boolean(actions.themeChosenAt);
  const communityDone = Boolean(actions.joinedCommunityAt || joinedSlugs.length > 0);
  const peopleDone = Boolean(
    actions.sentFriendRequestAt || friends.length > 0 || outgoingRequests.length > 0
  );
  const postDone = Boolean(actions.createdPostAt || profilePosts.length > 0);
  const dmDone = Boolean(actions.sentDmAt || directConversations.length > 0);

  const completeMap = {
    profile: profileDone,
    theme: themeDone,
    community: communityDone,
    people: peopleDone,
    post: postDone,
    dm: dmDone,
  };

  const completedRequiredCount = REQUIRED_STEPS.filter((step) => completeMap[step]).length;

  return {
    completeMap,
    completedRequiredCount,
    readyToFinish: REQUIRED_STEPS.every((step) => completeMap[step]),
    percent: Math.round((completedRequiredCount / REQUIRED_STEPS.length) * 100),
  };
}

function firstIncompleteStep(completeMap) {
  return ALL_STEPS.find((step) => !completeMap[step]) || "profile";
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, updateCurrentUser, refreshMe } = useAuth();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [joiningSlug, setJoiningSlug] = useState("");
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [sendingRequestTo, setSendingRequestTo] = useState("");
  const [posting, setPosting] = useState(false);
  const [startingDm, setStartingDm] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [profileForm, setProfileForm] = useState({
    displayName: "",
    status: "",
    bio: "",
  });

  const [selectedVibe, setSelectedVibe] = useState("dreamy");
  const [communities, setCommunities] = useState([]);
  const [joinedSlugs, setJoinedSlugs] = useState([]);
  const [friends, setFriends] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [profilePosts, setProfilePosts] = useState([]);
  const [directConversations, setDirectConversations] = useState([]);

  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [postBody, setPostBody] = useState(
    "Hey, I just joined Sanctum. Excited to start building my space here."
  );
  const [dmBody, setDmBody] = useState("Hey! I just got set up on Sanctum.");
  const [selectedFriendId, setSelectedFriendId] = useState("");
  const [currentStep, setCurrentStep] = useState("profile");
  const [onboardingState, setOnboardingState] = useState({
    completedAt: null,
    dismissedAt: null,
    lastCompletedStep: "",
    actions: {},
  });

  useEffect(() => {
    if (user?.onboarding?.completedAt) {
      navigate("/", { replace: true });
    }
  }, [user?.onboarding?.completedAt, navigate]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const [
          profileData,
          discoveryData,
          myCommunitiesData,
          friendsData,
          friendRequestsData,
          profilePostsData,
          conversationsData,
        ] = await Promise.all([
          getMyProfile(),
          listDiscoverableCommunities(),
          listMyCommunities(),
          listFriends(),
          listFriendRequests(),
          listProfilePosts(user?.username),
          listDirectConversations(),
        ]);

        const me = profileData?.user || user || {};

        if (me?.onboarding?.completedAt) {
          updateCurrentUser(me);
          navigate("/", { replace: true });
          return;
        }

        setProfileForm({
          displayName: me.displayName || "",
          status: me.status || "",
          bio: me.bio || "",
        });

        setSelectedVibe(me.theme?.vibe || "dreamy");
        setCommunities(discoveryData?.communities || []);
        setJoinedSlugs((myCommunitiesData?.communities || []).map((item) => item.slug));

        const friendItems = friendsData?.friends || [];
        setFriends(friendItems);
        setSelectedFriendId(friendItems[0]?.id || "");

        setOutgoingRequests(friendRequestsData?.outgoing || []);
        setProfilePosts(profilePostsData?.posts || []);
        setDirectConversations(conversationsData?.conversations || []);
        setOnboardingState(
          me.onboarding || {
            completedAt: null,
            dismissedAt: null,
            lastCompletedStep: "",
            actions: {},
          }
        );

        const nextCompletion = getCompletionState({
          joinedSlugs: (myCommunitiesData?.communities || []).map((item) => item.slug),
          friends: friendItems,
          outgoingRequests: friendRequestsData?.outgoing || [],
          profilePosts: profilePostsData?.posts || [],
          directConversations: conversationsData?.conversations || [],
          onboardingState:
            me.onboarding || {
              completedAt: null,
              dismissedAt: null,
              lastCompletedStep: "",
              actions: {},
            },
        });

        setCurrentStep(firstIncompleteStep(nextCompletion.completeMap));
      } catch (err) {
        setError(err?.response?.data?.error?.message || "Failed to load onboarding");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user?.username, navigate, updateCurrentUser]);

  const completion = useMemo(() => {
    return getCompletionState({
      joinedSlugs,
      friends,
      outgoingRequests,
      profilePosts,
      directConversations,
      onboardingState,
    });
  }, [joinedSlugs, friends, outgoingRequests, profilePosts, directConversations, onboardingState]);

  useEffect(() => {
    if (onboardingState?.completedAt) {
      navigate("/", { replace: true });
    }
  }, [onboardingState?.completedAt, navigate]);

  const recommendationProfile = useMemo(() => {
    return {
      ...(user || {}),
      displayName: profileForm.displayName,
      bio: profileForm.bio,
      status: profileForm.status,
      theme: {
        ...(user?.theme || {}),
        vibe: selectedVibe,
      },
    };
  }, [user, profileForm, selectedVibe]);

  const recommendedCommunities = useMemo(() => {
    return getRecommendedCommunities(
      communities,
      recommendationProfile,
      selectedVibe,
      joinedSlugs
    );
  }, [communities, recommendationProfile, selectedVibe, joinedSlugs]);

  function setField(key, value) {
    setProfileForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSaveProfile() {
    try {
      setSavingProfile(true);
      setError("");
      setMessage("");

      const data = await updateMyProfile(profileForm);
      updateCurrentUser(data.user);
      setOnboardingState(
        data?.user?.onboarding || {
          completedAt: null,
          dismissedAt: null,
          lastCompletedStep: "",
          actions: {},
        }
      );

      setMessage("Profile saved. Nice — now your page feels personal.");

      const nextMap = {
        ...completion.completeMap,
        profile: true,
      };
      jumpToNextIncomplete(nextMap);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSelectVibe(vibe) {
    try {
      setSelectedVibe(vibe);
      setSavingTheme(true);
      setError("");
      setMessage("");

      const theme = getPresetTheme(vibe);
      const data = await updateMyProfile({ theme });
      updateCurrentUser(data.user);
      setOnboardingState(
        data?.user?.onboarding || {
          completedAt: null,
          dismissedAt: null,
          lastCompletedStep: "",
          actions: {},
        }
      );

      setMessage("Theme updated. Your space already feels more like you.");

      const nextMap = {
        ...completion.completeMap,
        theme: true,
      };
      jumpToNextIncomplete(nextMap);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to save theme");
    } finally {
      setSavingTheme(false);
    }
  }

  async function handleJoinCommunity(slug) {
    try {
      setJoiningSlug(slug);
      setError("");
      setMessage("");

      await joinCommunity(slug);
      setJoinedSlugs((prev) => (prev.includes(slug) ? prev : [...prev, slug]));
      await refreshMe();

      setMessage("Community joined. Your feed should start feeling more alive now.");

      const nextMap = {
        ...completion.completeMap,
        community: true,
      };
      jumpToNextIncomplete(nextMap);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to join community");
    } finally {
      setJoiningSlug("");
    }
  }

  async function handleUserSearch(e) {
    e.preventDefault();
    if (!userQuery.trim()) return;

    try {
      setSearchingUsers(true);
      setError("");

      const data = await searchUsers(userQuery.trim());
      setUserResults(data?.users || []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to search people");
    } finally {
      setSearchingUsers(false);
    }
  }

  async function handleSendRequest(username) {
    try {
      setSendingRequestTo(username);
      setError("");
      setMessage("");

      const data = await sendFriendRequest(username);

      setUserResults((prev) =>
        prev.map((item) =>
          item.username === username
            ? {
                ...item,
                relationship: {
                  ...(item.relationship || {}),
                  status: "outgoing_pending",
                },
              }
            : item
        )
      );

      setOutgoingRequests((prev) => [...prev, data?.request].filter(Boolean));
      await refreshMe();

      setMessage("Friend request sent. Nice — now the social loop is starting.");

      const nextMap = {
        ...completion.completeMap,
        people: true,
      };
      jumpToNextIncomplete(nextMap);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to send friend request");
    } finally {
      setSendingRequestTo("");
    }
  }

  async function handleCreatePost() {
    try {
      setPosting(true);
      setError("");
      setMessage("");

      const data = await createProfilePost(user.username, {
        body: postBody,
        visibility: "public",
      });

      setProfilePosts((prev) => [data?.post, ...prev].filter(Boolean));
      await refreshMe();

      setMessage("First post published. Your profile now has activity.");

      const nextMap = {
        ...completion.completeMap,
        post: true,
      };
      jumpToNextIncomplete(nextMap);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to create post");
    } finally {
      setPosting(false);
    }
  }

  async function handleStartDm() {
    if (!selectedFriendId || !dmBody.trim()) return;

    try {
      setStartingDm(true);
      setError("");
      setMessage("");

      const conversationData = await createDirectConversation({
        participantIds: [selectedFriendId],
      });

      const conversationId = conversationData?.conversation?.id;
      if (!conversationId) {
        throw new Error("Conversation was not created");
      }

      await sendDirectMessage(conversationId, { content: dmBody.trim() });

      setDirectConversations((prev) => {
        const nextConversation = conversationData?.conversation;
        if (!nextConversation) return prev;
        const exists = prev.some((item) => item.id === nextConversation.id);
        return exists ? prev : [nextConversation, ...prev];
      });

      await refreshMe();

      setMessage("First DM sent. Messaging loop is live.");

      const nextMap = {
        ...completion.completeMap,
        dm: true,
      };
      jumpToNextIncomplete(nextMap);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || "Failed to send DM");
    } finally {
      setStartingDm(false);
    }
  }

  function jumpToNextIncomplete(nextCompleteMap) {
    const next = firstIncompleteStep(nextCompleteMap);
    setCurrentStep(next);
  }

  if (loading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-6xl text-slate-400">Loading onboarding...</div>
      </AppShell>
    );
  }

  const stepTitles = {
    profile: "Personalize your profile",
    theme: "Pick your vibe",
    community: "Join a community",
    people: "Connect with people",
    post: "Make your first post",
    dm: "Send your first DM",
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-violet-700/40 bg-gradient-to-br from-violet-950/50 to-slate-900 p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
                First-time setup
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-100">
                Turn Sanctum into a real home in a few steps
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-300">
                Your onboarding now completes automatically once the core activation
                steps are truly done.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-5 py-4 text-center">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Core activation
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-100">{completion.percent}%</p>
              <p className="mt-1 text-sm text-slate-400">
                {completion.completedRequiredCount} of {REQUIRED_STEPS.length} required steps done
              </p>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-2xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
            {message}
          </div>
        ) : null}

        {completion.readyToFinish ? (
          <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/30 px-5 py-4">
            <h2 className="text-lg font-semibold text-emerald-200">You’re activated.</h2>
            <p className="mt-2 text-sm text-emerald-100/80">
              Your core onboarding steps are done. You’ll be redirected automatically as
              soon as the completion state refreshes.
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90"
              >
                Go to dashboard
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-3">
            {ALL_STEPS.map((step, index) => (
              <StepPill
                key={step}
                index={index}
                label={stepTitles[step]}
                active={currentStep === step}
                complete={completion.completeMap[step]}
                onClick={() => setCurrentStep(step)}
              />
            ))}

            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="text-lg font-semibold text-slate-100">Why this matters</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-400">
                <p>• Better onboarding means better activation.</p>
                <p>• Better activation means stronger retention.</p>
                <p>• This is the bridge from feature set to real product.</p>
              </div>
            </div>
          </aside>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            {currentStep === "profile" ? (
              <div>
                <h2 className="text-2xl font-semibold text-slate-100">Personalize your profile</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Give people a reason to connect when they land on your page.
                </p>

                {!completion.completeMap.profile ? (
                  <>
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <input
                        value={profileForm.displayName}
                        onChange={(e) => setField("displayName", e.target.value)}
                        placeholder="Display name"
                        className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                      />
                      <input
                        value={profileForm.status}
                        onChange={(e) => setField("status", e.target.value)}
                        placeholder="Current status"
                        className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                      />
                    </div>

                    <textarea
                      value={profileForm.bio}
                      onChange={(e) => setField("bio", e.target.value)}
                      placeholder="Write a quick bio"
                      className="mt-4 min-h-32 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                    />

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
                      >
                        {savingProfile ? "Saving..." : "Save and continue"}
                      </button>

                      <Link
                        to="/me/edit"
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                      >
                        Open full profile editor
                      </Link>
                    </div>
                  </>
                ) : (
                  <EmptyState
                    title="Profile step completed"
                    body="You already saved your profile, so this step is done."
                    action={
                      <button
                        type="button"
                        onClick={() => jumpToNextIncomplete(completion.completeMap)}
                        className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90"
                      >
                        Continue
                      </button>
                    }
                  />
                )}
              </div>
            ) : null}

            {currentStep === "theme" ? (
              <div>
                <h2 className="text-2xl font-semibold text-slate-100">Pick your vibe</h2>
                <p className="mt-2 text-sm text-slate-400">
                  A strong theme makes Sanctum feel personal immediately.
                </p>

                {!completion.completeMap.theme ? (
                  <>
                    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {Object.entries(VIBE_PRESETS).map(([key, preset]) => {
                        const active = selectedVibe === key;

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleSelectVibe(key)}
                            className="rounded-2xl border p-4 text-left transition hover:scale-[1.01]"
                            style={{
                              borderColor: active ? preset.accentColor : "#334155",
                              backgroundColor: active ? `${preset.accentColor}14` : "#020617",
                            }}
                          >
                            <div className="mb-3 flex items-center gap-2">
                              <span
                                className="h-4 w-4 rounded-full"
                                style={{ backgroundColor: preset.accentColor }}
                              />
                              <h3 className="font-semibold text-slate-100">{preset.label}</h3>
                            </div>
                            <p className="text-sm text-slate-400">{preset.description}</p>
                          </button>
                        );
                      })}
                    </div>

                    {savingTheme ? (
                      <p className="mt-4 text-sm text-slate-400">Saving theme...</p>
                    ) : null}
                  </>
                ) : (
                  <EmptyState
                    title="Theme step completed"
                    body="Your theme choice is already saved."
                    action={
                      <button
                        type="button"
                        onClick={() => jumpToNextIncomplete(completion.completeMap)}
                        className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90"
                      >
                        Continue
                      </button>
                    }
                  />
                )}
              </div>
            ) : null}

            {currentStep === "community" ? (
              <div>
                <h2 className="text-2xl font-semibold text-slate-100">Join a community</h2>
                <p className="mt-2 text-sm text-slate-400">
                  This is the fastest way to make the app feel alive.
                </p>

                {joinedSlugs.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {joinedSlugs.map((slug) => (
                      <span
                        key={slug}
                        className="rounded-full border border-emerald-700/60 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-200"
                      >
                        Joined @{slug}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5">
                    <EmptyState
                      title="Your feed is still empty because you haven't joined anywhere yet."
                      body="Join one community and your dashboard instantly has a better chance of feeling active."
                    />
                  </div>
                )}

                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-violet-300">
                    Recommended for your profile
                  </h3>

                  {!recommendedCommunities.length ? (
                    <EmptyState
                      title="No recommendations yet"
                      body="We couldn't confidently match communities yet, so use discovery to browse more."
                      action={
                        <Link
                          to="/discover"
                          className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                        >
                          Open discovery
                        </Link>
                      }
                    />
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {recommendedCommunities.map((community) => {
                        const joined = joinedSlugs.includes(community.slug);

                        return (
                          <div
                            key={community._id}
                            className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-semibold text-slate-100">{community.name}</h3>
                                <p className="mt-1 text-xs text-slate-500">@{community.slug}</p>
                                <p className="mt-2 text-sm text-slate-300">
                                  {community.description || "No description yet."}
                                </p>
                                <p className="mt-3 text-xs text-slate-500">
                                  {community.memberCount || 0} members
                                </p>
                              </div>

                              <button
                                type="button"
                                disabled={joined || joiningSlug === community.slug}
                                onClick={() => handleJoinCommunity(community.slug)}
                                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
                              >
                                {joined
                                  ? "Joined"
                                  : joiningSlug === community.slug
                                  ? "Joining..."
                                  : "Join"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {currentStep === "people" ? (
              <div>
                <h2 className="text-2xl font-semibold text-slate-100">Connect with people</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Friends and requests are one of the biggest retention levers.
                </p>

                {friends.length === 0 && outgoingRequests.length === 0 ? (
                  <div className="mt-5">
                    <EmptyState
                      title="You haven't started your social graph yet."
                      body="Search for someone and send one request. That single action helps the app feel much less empty."
                    />
                  </div>
                ) : null}

                <form onSubmit={handleUserSearch} className="mt-6 flex flex-col gap-3 md:flex-row">
                  <input
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Search for people"
                    className="flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={searchingUsers}
                    className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
                  >
                    {searchingUsers ? "Searching..." : "Search"}
                  </button>
                </form>

                <div className="mt-5 space-y-3">
                  {userResults.map((person) => (
                    <div
                      key={person.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-slate-100">
                          {person.displayName || person.username}
                        </p>
                        <p className="text-sm text-slate-400">@{person.username}</p>
                        {person.status ? (
                          <p className="mt-1 text-sm text-slate-500">{person.status}</p>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        disabled={
                          person.relationship?.status !== "none" ||
                          sendingRequestTo === person.username
                        }
                        onClick={() => handleSendRequest(person.username)}
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                      >
                        {person.relationship?.status === "friends"
                          ? "Already friends"
                          : person.relationship?.status === "outgoing_pending"
                          ? "Request sent"
                          : sendingRequestTo === person.username
                          ? "Sending..."
                          : "Send request"}
                      </button>
                    </div>
                  ))}

                  {!userResults.length ? (
                    <p className="text-sm text-slate-500">
                      Search for a few people you know or want to follow.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {currentStep === "post" ? (
              <div>
                <h2 className="text-2xl font-semibold text-slate-100">Make your first post</h2>
                <p className="mt-2 text-sm text-slate-400">
                  A first post gives your profile life on day one.
                </p>

                {profilePosts.length === 0 ? (
                  <div className="mt-5">
                    <EmptyState
                      title="Your profile is still quiet."
                      body="One simple post makes your space feel real instead of brand new."
                    />
                  </div>
                ) : null}

                <textarea
                  value={postBody}
                  onChange={(e) => setPostBody(e.target.value)}
                  className="mt-6 min-h-36 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                />

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={posting || !postBody.trim()}
                    onClick={handleCreatePost}
                    className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
                  >
                    {posting ? "Posting..." : "Publish post"}
                  </button>

                  <Link
                    to={`/u/${user?.username}`}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                  >
                    View profile
                  </Link>
                </div>
              </div>
            ) : null}

            {currentStep === "dm" ? (
              <div>
                <h2 className="text-2xl font-semibold text-slate-100">Send your first DM</h2>
                <p className="mt-2 text-sm text-slate-400">
                  This step is optional, but it activates your messaging loop.
                </p>

                {!friends.length ? (
                  <div className="mt-5">
                    <EmptyState
                      title="You need at least one friend first."
                      body="Once someone accepts your request, come back here and send your first message."
                      action={
                        <button
                          type="button"
                          onClick={() => setCurrentStep("people")}
                          className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90"
                        >
                          Go to people step
                        </button>
                      }
                    />
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    <select
                      value={selectedFriendId}
                      onChange={(e) => setSelectedFriendId(e.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                    >
                      {friends.map((friend) => (
                        <option key={friend.id} value={friend.id}>
                          {friend.displayName || friend.username} (@{friend.username})
                        </option>
                      ))}
                    </select>

                    <textarea
                      value={dmBody}
                      onChange={(e) => setDmBody(e.target.value)}
                      className="min-h-28 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                    />

                    <button
                      type="button"
                      disabled={startingDm || !selectedFriendId || !dmBody.trim()}
                      onClick={handleStartDm}
                      className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
                    >
                      {startingDm ? "Sending..." : "Send first DM"}
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-6">
              <div className="text-sm text-slate-400">
                Current step: <span className="text-slate-200">{stepTitles[currentStep]}</span>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                >
                  Exit for now
                </button>

                <button
                  type="button"
                  onClick={() => jumpToNextIncomplete(completion.completeMap)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90"
                >
                  Next step
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
} 