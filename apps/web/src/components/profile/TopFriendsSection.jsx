import { Link } from "react-router-dom";
import RemoteImage from "../common/RemoteImage";

function FriendCard({ friend }) {
  return (
    <Link
      to={`/u/${friend.username}`}
      className="group rounded-2xl border border-slate-800 bg-slate-950 p-4 transition hover:border-slate-700 hover:bg-slate-900"
    >
      <div className="flex items-center gap-3">
        <RemoteImage
          src={friend.avatarUrl}
          alt={friend.username}
          fallbackLabel={friend.displayName || friend.username}
          className="h-14 w-14 rounded-2xl border border-slate-800 object-cover"
          fallbackClassName="h-14 w-14 rounded-2xl border border-slate-800"
          textClassName="text-lg text-slate-500"
        />

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100 group-hover:text-white">
            {friend.displayName || friend.username}
          </p>
          <p className="truncate text-xs text-slate-400">@{friend.username}</p>
          {friend.status ? (
            <p className="mt-1 truncate text-xs text-slate-300">{friend.status}</p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export default function TopFriendsSection({ topFriends = [] }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Top Friends</h2>
          <p className="text-sm text-slate-400">
            A curated circle featured on this profile.
          </p>
        </div>
      </div>

      {topFriends.length === 0 ? (
        <p className="text-sm text-slate-400">No top friends chosen yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {topFriends.map((friend) => (
            <FriendCard key={friend.id} friend={friend} />
          ))}
        </div>
      )}
    </section>
  );
} 