import { useEffect, useState } from "react";
import {
  getFriendshipStatus,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
} from "../../api/friends";

export default function FriendActionBar({ username, isOwnProfile = false }) {
  const [relationship, setRelationship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRelationship() {
      if (!username || isOwnProfile) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const data = await getFriendshipStatus(username);
        setRelationship(data.relationship);
      } catch (err) {
        setError(err?.response?.data?.error?.message || "Failed to load friendship");
      } finally {
        setLoading(false);
      }
    }

    loadRelationship();
  }, [username, isOwnProfile]);

  async function handleSendRequest() {
    try {
      setBusy(true);
      const data = await sendFriendRequest(username);
      setRelationship({
        status: "outgoing_pending",
        requestId: data.request?._id,
      });
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to send request");
    } finally {
      setBusy(false);
    }
  }

  async function handleAccept() {
    try {
      setBusy(true);
      await acceptFriendRequest(relationship.requestId);
      setRelationship({ status: "friends" });
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to accept request");
    } finally {
      setBusy(false);
    }
  }

  async function handleDecline() {
    try {
      setBusy(true);
      await declineFriendRequest(relationship.requestId);
      setRelationship({ status: "none" });
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to decline request");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    try {
      setBusy(true);
      await cancelFriendRequest(relationship.requestId);
      setRelationship({ status: "none" });
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to cancel request");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveFriend() {
    try {
      setBusy(true);
      await removeFriend(username);
      setRelationship({ status: "none" });
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to remove friend");
    } finally {
      setBusy(false);
    }
  }

  if (isOwnProfile) return null;

  return (
    <div className="mt-3 flex flex-col gap-3">
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-400">Loading friendship...</p> : null}

      {!loading && relationship?.status === "none" ? (
        <button
          onClick={handleSendRequest}
          disabled={busy}
          className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Sending..." : "Add Friend"}
        </button>
      ) : null}

      {!loading && relationship?.status === "outgoing_pending" ? (
        <button
          onClick={handleCancel}
          disabled={busy}
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? "Canceling..." : "Cancel Request"}
        </button>
      ) : null}

      {!loading && relationship?.status === "incoming_pending" ? (
        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            disabled={busy}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Working..." : "Accept"}
          </button>
          <button
            onClick={handleDecline}
            disabled={busy}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800 disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      ) : null}

      {!loading && relationship?.status === "friends" ? (
        <button
          onClick={handleRemoveFriend}
          disabled={busy}
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? "Removing..." : "Remove Friend"}
        </button>
      ) : null}
    </div>
  );
} 