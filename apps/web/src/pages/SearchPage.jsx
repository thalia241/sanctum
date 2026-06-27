import { useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import { searchUsers } from "../api/users";
import { searchDiscoverableCommunities } from "../api/discovery";
import { usePresence } from "../context/PresenceContext";
import PresencePill from "../components/common/PresencePill";

function UserCard({ user, presence }) {
  return (
    <Link
      to={`/u/${user.username}`}
      className="block rounded-2xl border border-slate-800 bg-slate-900 p-4 transition hover:bg-slate-800"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <p className="font-semibold text-slate-100">
              {user.displayName || user.username}
            </p>
            <PresencePill presence={presence} />
          </div>

          <p className="text-sm text-slate-400">@{user.username}</p>
          {user.status ? (
            <p className="mt-1 truncate text-sm text-slate-300">{user.status}</p>
          ) : null}
        </div>

        {user.isFriend ? (
          <span className="rounded-full border border-emerald-700/60 bg-emerald-950/30 px-3 py-1 text-xs text-emerald-200">
            Friend
          </span>
        ) : (
          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
            View Profile
          </span>
        )}
      </div>
    </Link>
  );
}

function CommunityCard({ community }) {
  return (
    <Link
      to={`/communities/${community.slug}`}
      className="block rounded-2xl border border-slate-800 bg-slate-900 p-4 transition hover:bg-slate-800"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-slate-100">{community.name}</p>
          <p className="text-sm text-slate-400">@{community.slug}</p>
          <p className="mt-1 truncate text-sm text-slate-300">
            {community.description || "No description yet."}
          </p>
        </div>

        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
          {community.memberCount || 0} members
        </span>
      </div>
    </Link>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const { refreshPresence, getUserPresence } = usePresence();

  async function handleSearch(e) {
    e.preventDefault();

    const trimmed = query.trim();
    if (!trimmed) {
      setUsers([]);
      setCommunities([]);
      setSearched(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSearched(true);

      const [usersData, communitiesData] = await Promise.all([
        searchUsers(trimmed),
        searchDiscoverableCommunities(trimmed),
      ]);

      const nextUsers = usersData?.users || [];
      setUsers(nextUsers);
      setCommunities(communitiesData?.communities || []);

      await refreshPresence(nextUsers.map((user) => user.id));
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="text-2xl font-semibold text-slate-100">Search</h1>
          <p className="mt-2 text-slate-400">
            Find people and discover communities.
          </p>

          <form onSubmit={handleSearch} className="mt-5 flex gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people or communities..."
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-slate-100 px-5 py-3 font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </form>

          {error ? <p className="mt-4 text-red-300">{error}</p> : null}
        </div>

        {searched ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-100">People</h2>

              {!users.length ? (
                <p className="text-sm text-slate-400">No people found.</p>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      presence={getUserPresence(user.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-100">Communities</h2>

              {!communities.length ? (
                <p className="text-sm text-slate-400">No communities found.</p>
              ) : (
                <div className="space-y-3">
                  {communities.map((community) => (
                    <CommunityCard key={community._id} community={community} />
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}