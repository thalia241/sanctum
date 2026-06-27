import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import {
  banMember,
  demoteMember,
  kickMember,
  listBans,
  listMembers,
  promoteMember,
  unbanMember,
} from "../api/members";

function getMemberUserId(member) {
  return (
    member.userId?._id ||
    member.user?._id ||
    member.userId ||
    member._id ||
    member.id ||
    null
  );
}

function getMemberUsername(member) {
  return (
    member.userId?.username ||
    member.user?.username ||
    member.username ||
    member.email ||
    "Unknown User"
  );
}

function MemberRow({
  member,
  onPromote,
  onDemote,
  onKick,
  onBan,
  workingUserId,
}) {
  const userId = getMemberUserId(member);
  const username = getMemberUsername(member);

  const role = member.role || "member";
  const isWorking = workingUserId === String(userId);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-100">{username}</div>
          <div className="mt-1 text-xs text-slate-500">
            User ID: {userId ? String(userId) : "Unavailable"}
          </div>
          <div className="mt-2 inline-flex rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300">
            {role}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {role === "member" && userId ? (
            <button
              onClick={() => onPromote(userId)}
              disabled={isWorking}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs hover:bg-slate-800 disabled:opacity-50"
            >
              Promote
            </button>
          ) : null}

          {role === "mod" && userId ? (
            <button
              onClick={() => onDemote(userId)}
              disabled={isWorking}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs hover:bg-slate-800 disabled:opacity-50"
            >
              Demote
            </button>
          ) : null}

          {role !== "owner" && userId ? (
            <>
              <button
                onClick={() => onKick(userId)}
                disabled={isWorking}
                className="rounded-lg border border-yellow-800 px-3 py-2 text-xs text-yellow-300 hover:bg-yellow-950 disabled:opacity-50"
              >
                Kick
              </button>

              <button
                onClick={() => onBan(userId)}
                disabled={isWorking}
                className="rounded-lg border border-red-800 px-3 py-2 text-xs text-red-300 hover:bg-red-950 disabled:opacity-50"
              >
                Ban
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function getBanUserId(ban) {
  return ban.userId?._id || ban.user?._id || ban.userId || ban._id || ban.id || null;
}

function getBanUsername(ban) {
  return ban.userId?.username || ban.user?.username || ban.username || "Unknown User";
}

function BanRow({ ban, onUnban, workingUserId }) {
  const userId = getBanUserId(ban);
  const username = getBanUsername(ban);
  const isWorking = workingUserId === String(userId);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-100">{username}</div>
          <div className="mt-1 text-xs text-slate-500">
            User ID: {userId ? String(userId) : "Unavailable"}
          </div>
          {ban.reason ? (
            <div className="mt-2 text-xs text-slate-400">Reason: {ban.reason}</div>
          ) : null}
          <div className="mt-1 text-xs text-slate-500">
            {ban.createdAt ? new Date(ban.createdAt).toLocaleString() : ""}
          </div>
        </div>

        {userId ? (
          <button
            onClick={() => onUnban(userId)}
            disabled={isWorking}
            className="rounded-lg border border-green-800 px-3 py-2 text-xs text-green-300 hover:bg-green-950 disabled:opacity-50"
          >
            Unban
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function CommunityMembersPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [bans, setBans] = useState([]);

  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingBans, setLoadingBans] = useState(true);
  const [workingUserId, setWorkingUserId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [bansSupported, setBansSupported] = useState(true);

  async function loadMembers() {
    try {
      setLoadingMembers(true);
      const data = await listMembers(slug);
      setMembers(data.members || []);
    } finally {
      setLoadingMembers(false);
    }
  }

  async function loadBans() {
    try {
      setLoadingBans(true);
      const data = await listBans(slug);
      setBans(data.bans || []);
      setBansSupported(true);
    } catch (err) {
      // If bans route does not exist yet, don't break the whole page
      if (err?.response?.status === 404) {
        setBansSupported(false);
        setBans([]);
        return;
      }
      throw err;
    } finally {
      setLoadingBans(false);
    }
  }

  useEffect(() => {
    async function loadAll() {
      try {
        setError("");
        await loadMembers();
        await loadBans();
      } catch (err) {
        setError(
          err?.response?.data?.error?.message ||
            err.message ||
            "Failed to load members"
        );
      }
    }

    loadAll();
  }, [slug]);

  async function handlePromote(userId) {
    try {
      setWorkingUserId(String(userId));
      setError("");
      setSuccess("");

      await promoteMember(slug, userId);

      setMembers((prev) =>
        prev.map((m) => {
          const id = getMemberUserId(m);
          return String(id) === String(userId) ? { ...m, role: "mod" } : m;
        })
      );

      setSuccess("Member promoted successfully.");
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || "Failed to promote member");
    } finally {
      setWorkingUserId("");
    }
  }

  async function handleDemote(userId) {
    try {
      setWorkingUserId(String(userId));
      setError("");
      setSuccess("");

      await demoteMember(slug, userId);

      setMembers((prev) =>
        prev.map((m) => {
          const id = getMemberUserId(m);
          return String(id) === String(userId) ? { ...m, role: "member" } : m;
        })
      );

      setSuccess("Moderator demoted successfully.");
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || "Failed to demote member");
    } finally {
      setWorkingUserId("");
    }
  }

  async function handleKick(userId) {
    const confirmed = window.confirm("Kick this member from the community?");
    if (!confirmed) return;

    try {
      setWorkingUserId(String(userId));
      setError("");
      setSuccess("");

      await kickMember(slug, userId);

      setMembers((prev) =>
        prev.filter((m) => String(getMemberUserId(m)) !== String(userId))
      );

      setSuccess("Member kicked successfully.");
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || "Failed to kick member");
    } finally {
      setWorkingUserId("");
    }
  }

  async function handleBan(userId) {
    const reason = window.prompt("Ban reason (optional):", "") || "";
    const confirmed = window.confirm("Ban this member from the community?");
    if (!confirmed) return;

    try {
      setWorkingUserId(String(userId));
      setError("");
      setSuccess("");

      await banMember(slug, userId, reason);

      setMembers((prev) =>
        prev.filter((m) => String(getMemberUserId(m)) !== String(userId))
      );

      if (bansSupported) {
        await loadBans();
      }

      setSuccess("Member banned successfully.");
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || "Failed to ban member");
    } finally {
      setWorkingUserId("");
    }
  }

  async function handleUnban(userId) {
    try {
      setWorkingUserId(String(userId));
      setError("");
      setSuccess("");

      await unbanMember(slug, userId);

      setBans((prev) =>
        prev.filter((b) => String(getBanUserId(b)) !== String(userId))
      );

      setSuccess("Member unbanned successfully.");
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || "Failed to unban member");
    } finally {
      setWorkingUserId("");
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Member Management</h1>
            <p className="mt-2 text-sm text-slate-400">
              View members, manage roles, and moderate access.
            </p>
          </div>

          <button
            onClick={() => navigate(`/communities/${slug}`)}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
          >
            Back to Community
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 rounded-lg border border-green-800 bg-green-950 px-3 py-2 text-sm text-green-200">
            {success}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">Members</h2>

              <button
                onClick={loadMembers}
                disabled={loadingMembers}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
              >
                Refresh
              </button>
            </div>

            {loadingMembers ? (
              <p className="text-sm text-slate-400">Loading members...</p>
            ) : members.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                No members found.
              </div>
            ) : (
              <div className="space-y-4">
                {members.map((member, index) => (
                  <MemberRow
                    key={String(getMemberUserId(member) || index)}
                    member={member}
                    onPromote={handlePromote}
                    onDemote={handleDemote}
                    onKick={handleKick}
                    onBan={handleBan}
                    workingUserId={workingUserId}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">Bans</h2>

              <button
                onClick={loadBans}
                disabled={loadingBans || !bansSupported}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
              >
                Refresh
              </button>
            </div>

            {!bansSupported ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                Ban listing is not available from the backend yet.
              </div>
            ) : loadingBans ? (
              <p className="text-sm text-slate-400">Loading bans...</p>
            ) : bans.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                No banned users.
              </div>
            ) : (
              <div className="space-y-4">
                {bans.map((ban, index) => (
                  <BanRow
                    key={String(getBanUserId(ban) || index)}
                    ban={ban}
                    onUnban={handleUnban}
                    workingUserId={workingUserId}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}  