import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import { listNotifications, markNotificationRead } from "../api/notifications";

function getDayBucket(dateString) {
  if (!dateString) return "Earlier";

  const now = new Date();
  const date = new Date(dateString);

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThatDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((startOfToday - startOfThatDay) / 86400000);

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return "Earlier";
}

function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const now = Date.now();
  const time = new Date(dateString).getTime();
  const diffMs = Math.max(0, now - time);

  const minute = 60000;
  const hour = 3600000;
  const day = 86400000;

  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  if (diffMs < day * 7) return `${Math.floor(diffMs / day)}d ago`;

  return new Date(dateString).toLocaleDateString();
}

function getNotificationMeta(notification) {
  const type = notification?.type || "general";
  const data = notification?.data || {};

  if (type === "friend_request") {
    return {
      label: "Friend request",
      tone: "border-pink-700/50 bg-pink-950/20 text-pink-200",
      href: "/friends",
      cta: "Open requests",
    };
  }

  if (type === "friend_accept") {
    return {
      label: "Friend update",
      tone: "border-emerald-700/50 bg-emerald-950/20 text-emerald-200",
      href: data?.acceptedByUsername ? `/u/${data.acceptedByUsername}` : "/friends",
      cta: "View profile",
    };
  }

  if (type === "direct_message") {
    return {
      label: "Message",
      tone: "border-violet-700/50 bg-violet-950/20 text-violet-200",
      href: "/inbox",
      cta: "Open inbox",
    };
  }

  if (type === "community_invite") {
    return {
      label: "Invite",
      tone: "border-sky-700/50 bg-sky-950/20 text-sky-200",
      href: data?.inviteCode ? `/invite/${data.inviteCode}` : "/discover",
      cta: "View invite",
    };
  }

  if (type === "community_post") {
    return {
      label: "Community activity",
      tone: "border-amber-700/50 bg-amber-950/20 text-amber-200",
      href: data?.communitySlug ? `/communities/${data.communitySlug}` : "/discover",
      cta: "Open community",
    };
  }

  return {
    label: "Activity",
    tone: "border-slate-700 bg-slate-950 text-slate-200",
    href: "/",
    cta: "Open app",
  };
}

function NotificationCard({ notification, onRead }) {
  const meta = getNotificationMeta(notification);
  const unread = !notification.readAt;

  return (
    <article
      className={`rounded-2xl border p-4 transition ${
        unread
          ? "border-violet-700/40 bg-violet-950/10"
          : "border-slate-800 bg-slate-900"
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${meta.tone}`}>
              {meta.label}
            </span>
            {unread ? (
              <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-200">
                Unread
              </span>
            ) : null}
          </div>

          <h2 className="text-base font-semibold text-slate-100">
            {notification.title || "New activity"}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-300">
            {notification.body || "You have a new notification."}
          </p>

          <p className="mt-3 text-xs text-slate-500">
            {formatRelativeTime(notification.createdAt)}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            to={meta.href}
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-950 hover:opacity-90"
            onClick={() => {
              if (unread) onRead(notification.id || notification._id);
            }}
          >
            {meta.cta}
          </Link>

          {unread ? (
            <button
              type="button"
              onClick={() => onRead(notification.id || notification._id)}
              className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Mark read
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const data = await listNotifications();
        setNotifications(data?.notifications || []);
      } catch (err) {
        setError(
          err?.response?.data?.error?.message || err.message || "Failed to load notifications"
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.readAt),
    [notifications]
  );

  const grouped = useMemo(() => {
    const buckets = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };

    for (const notification of notifications) {
      const bucket = getDayBucket(notification.createdAt);
      buckets[bucket].push(notification);
    }

    return buckets;
  }, [notifications]);

  async function handleMarkRead(notificationId) {
    try {
      await markNotificationRead(notificationId);

      setNotifications((prev) =>
        prev.map((item) =>
          String(item.id || item._id) === String(notificationId)
            ? {
                ...item,
                readAt: item.readAt || new Date().toISOString(),
              }
            : item
        )
      );
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
                Activity center
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-100">Notifications</h1>
              <p className="mt-2 text-sm text-slate-400">
                See what needs your attention and jump straight into the right place.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Unread</p>
              <p className="mt-1 text-2xl font-bold text-slate-100">
                {unreadNotifications.length}
              </p>
            </div>
          </div>
        </section>

        {loading ? <p className="text-slate-400">Loading notifications...</p> : null}
        {error ? <p className="text-red-300">{error}</p> : null}

        {!loading && !error && notifications.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-slate-100">No notifications yet</h2>
            <p className="mt-2 text-sm text-slate-400">
              Once people message you, send requests, or interact with your spaces, activity will show up here.
            </p>
          </div>
        ) : null}

        {!loading && !error && unreadNotifications.length > 0 ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Unread first</h2>
              <p className="text-sm text-slate-400">These are the items most likely to bring you back in right now.</p>
            </div>

            <div className="space-y-3">
              {unreadNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id || notification._id}
                  notification={notification}
                  onRead={handleMarkRead}
                />
              ))}
            </div>
          </section>
        ) : null}

        {!loading && !error ? (
          <section className="space-y-6">
            {Object.entries(grouped).map(([label, items]) => {
              if (!items.length) return null;

              return (
                <div key={label} className="space-y-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">{label}</h2>
                  </div>

                  {items.map((notification) => (
                    <NotificationCard
                      key={notification.id || notification._id}
                      notification={notification}
                      onRead={handleMarkRead}
                    />
                  ))}
                </div>
              );
            })}
          </section>
        ) : null}
      </div>
    </AppShell>
  );
} 