import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import {
  listFriends,
  listFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  updateTopFriends,
} from "../api/friends";
import { usePresence } from "../context/PresenceContext";
import PresencePill from "../components/common/PresencePill";

function UserCard({ user, action, presence }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <Link
              to={`/u/${user.username}`}
              className="text-sm font-semibold text-slate-100 hover:underline"
            >
              {user.displayName || user.username}
            </Link>
            <PresencePill presence={presence} />
          </div>

          <p className="text-xs text-slate-400">@{user.username}</p>
          {user.status ? (
            <p className="mt-1 truncate text-sm text-slate-300">{user.status}</p>
          ) : null}
        </div>

        {action ? <div>{action}</div> : null}
      </div>
    </div>
  );
}

export default function FriendsPage() {
  const [friends, setFriends] = useState([]);
  const [topFriends, setTopFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingTop, setSavingTop] = useState(false);
  const [error, setError] = useState("");

  const { refreshPresence, getUserPresence } = usePresence();

  async function loadPage() {
    try {
      setLoading(true);
      setError("");

      const [friendsData, requestsData] = await Promise.all([
        listFriends(),
        listFriendRequests(),
      ]);

      const nextFriends = friendsData.friends || [];
      const nextTopFriends = friendsData.topFriends || [];
      const nextIncoming = requestsData.incoming || [];
      const nextOutgoing = requestsData.outgoing || [];

      setFriends(nextFriends);
      setTopFriends(nextTopFriends);
      setIncoming(nextIncoming);
      setOutgoing(nextOutgoing);

      const ids = [
        ...nextFriends.map((friend) => friend.id),
        ...nextTopFriends.map((friend) => friend.id),
        ...nextIncoming.map((request) => request.fromUserId?._id),
        ...nextOutgoing.map((request) => request.toUserId?._id),
      ].filter(Boolean);

      await refreshPresence(ids);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load friends");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  function toggleTopFriend(friend) {
    setTopFriends((prev) => {
      const exists = prev.some((item) => item.id === friend.id);
      if (exists) {
        return prev.filter((item) => item.id !== friend.id);
      }
      if (prev.length >= 8) return prev;
      return [...prev, friend];
    });
  }

  async function handleSaveTopFriends() {
    try {
      setSavingTop(true);
      const data = await updateTopFriends(topFriends.map((friend) => friend.id));
      const nextTopFriends = data.topFriends || [];
      setTopFriends(nextTopFriends);
      await refreshPresence(nextTopFriends.map((friend) => friend.id));
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to save top friends");
    } finally {
      setSavingTop(false);
    }
  }

  async function handleAccept(requestId) {
    try {
      await acceptFriendRequest(requestId);
      await loadPage();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to accept request");
    }
  }

  async function handleDecline(requestId) {
    try {
      await declineFriendRequest(requestId);
      await loadPage();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to decline request");
    }
  }

  async function handleCancel(requestId) {
    try {
      await cancelFriendRequest(requestId);
      await loadPage();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to cancel request");
    }
  }

  const topFriendIds = new Set(topFriends.map((friend) => friend.id));

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">Friends</h1>
          <p className="mt-1 text-sm text-slate-400">
            Build your circle and curate your top friends.
          </p>
        </div>

        {loading ? <p className="text-slate-400">Loading friends...</p> : null}
        {error ? <p className="text-red-300">{error}</p> : null}

        {!loading ? (
          <>
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Top Friends</h2>
                  <p className="text-sm text-slate-400">Choose up to 8.</p>
                </div>

                <button
                  onClick={handleSaveTopFriends}
                  disabled={savingTop}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
                >
                  {savingTop ? "Saving..." : "Save Top Friends"}
                </button>
              </div>

              {friends.length === 0 ? (
                <p className="text-sm text-slate-400">No friends yet.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {friends.map((friend) => {
                    const selected = topFriendIds.has(friend.id);

                    return (
                      <UserCard
                        key={friend.id}
                        user={friend}
                        presence={getUserPresence(friend.id)}
                        action={
                          <button
                            onClick={() => toggleTopFriend(friend)}
                            className={`rounded-lg px-3 py-1 text-xs ${
                              selected
                                ? "bg-violet-400 text-slate-950"
                                : "border border-slate-700 text-slate-200"
                            }`}
                          >
                            {selected ? "Top Friend" : "Add to Top"}
                          </button>
                        }
                      />
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="mb-4 text-lg font-semibold">Incoming Requests</h2>

              {incoming.length === 0 ? (
                <p className="text-sm text-slate-400">No incoming requests.</p>
              ) : (
                <div className="space-y-4">
                  {incoming.map((request) => {
                    const requestUser = {
                      id: request.fromUserId?._id,
                      username: request.fromUserId?.username,
                      displayName: request.fromUserId?.displayName,
                      avatarUrl: request.fromUserId?.avatarUrl,
                      status: request.fromUserId?.status,
                    };

                    return (
                      <UserCard
                        key={request._id}
                        user={requestUser}
                        presence={getUserPresence(requestUser.id)}
                        action={
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAccept(request._id)}
                              className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-950"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleDecline(request._id)}
                              className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200"
                            >
                              Decline
                            </button>
                          </div>
                        }
                      />
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="mb-4 text-lg font-semibold">Outgoing Requests</h2>

              {outgoing.length === 0 ? (
                <p className="text-sm text-slate-400">No outgoing requests.</p>
              ) : (
                <div className="space-y-4">
                  {outgoing.map((request) => {
                    const requestUser = {
                      id: request.toUserId?._id,
                      username: request.toUserId?.username,
                      displayName: request.toUserId?.displayName,
                      avatarUrl: request.toUserId?.avatarUrl,
                      status: request.toUserId?.status,
                    };

                    return (
                      <UserCard
                        key={request._id}
                        user={requestUser}
                        presence={getUserPresence(requestUser.id)}
                        action={
                          <button
                            onClick={() => handleCancel(request._id)}
                            className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200"
                          >
                            Cancel
                          </button>
                        }
                      />
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="mb-4 text-lg font-semibold">All Friends</h2>

              {friends.length === 0 ? (
                <p className="text-sm text-slate-400">No friends yet.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {friends.map((friend) => (
                    <UserCard
                      key={friend.id}
                      user={friend}
                      presence={getUserPresence(friend.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
} 