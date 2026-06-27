import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "../components/layout/AppShell";
import {
  listDirectConversations,
  getDirectMessages,
  sendDirectMessage,
} from "../api/directMessages";
import { listFriends } from "../api/friends";
import { useAuth } from "../context/AuthContext";

const STORAGE_KEY = "sanctum:last-open-conversation-id";

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

function getConversationTitle(conversation) {
  if (conversation.title) return conversation.title;
  if (conversation.isGroup) return "Group Chat";

  const other = conversation.otherParticipants?.[0];
  return other?.displayName || other?.username || "Direct Message";
}

function getConversationSubtitle(conversation, currentUserId) {
  const latest = conversation.latestMessage;
  if (!latest) return "No messages yet.";

  const authorName =
    String(latest.userId) === String(currentUserId)
      ? "You"
      : latest.author?.displayName || latest.author?.username || "Someone";

  const text = latest.content || "Sent a message";
  return conversation.isGroup ? `${authorName}: ${text}` : text;
}

function sortConversations(items) {
  return [...items].sort((a, b) => {
    if ((b.unreadCount || 0) !== (a.unreadCount || 0)) {
      return (b.unreadCount || 0) - (a.unreadCount || 0);
    }

    const aTime = new Date(a.lastMessageAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.lastMessageAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

function ConversationListItem({ conversation, active, currentUserId, onClick }) {
  const title = getConversationTitle(conversation);
  const subtitle = getConversationSubtitle(conversation, currentUserId);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        active
          ? "border-violet-600 bg-violet-950/30"
          : "border-slate-800 bg-slate-900 hover:bg-slate-800"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-slate-100">{title}</h3>
            {conversation.unreadCount > 0 ? (
              <span className="rounded-full bg-violet-400 px-2 py-0.5 text-xs font-semibold text-slate-950">
                {conversation.unreadCount}
              </span>
            ) : null}
          </div>

          <p className="mt-1 line-clamp-2 text-sm text-slate-400">{subtitle}</p>
        </div>

        <span className="shrink-0 text-xs text-slate-500">
          {formatRelativeTime(conversation.lastMessageAt || conversation.createdAt)}
        </span>
      </div>
    </button>
  );
}

function MessageBubble({ message, currentUserId }) {
  const mine = String(message.userId) === String(currentUserId);

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          mine
            ? "bg-violet-500 text-slate-950"
            : "bg-slate-800 text-slate-100"
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-6">
          {message.content || (message.isDeleted ? "Message deleted" : "")}
        </p>
        <p className={`mt-2 text-[11px] ${mine ? "text-slate-900/70" : "text-slate-400"}`}>
          {formatRelativeTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

export default function InboxPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const scrollerRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        setLoadingConversations(true);
        setError("");

        const [conversationData, friendsData] = await Promise.all([
          listDirectConversations(),
          listFriends(),
        ]);

        const sorted = sortConversations(conversationData?.conversations || []);
        setConversations(sorted);
        setFriends(friendsData?.friends || []);

        const rememberedId = localStorage.getItem(STORAGE_KEY);
        const rememberedStillExists = sorted.some((item) => item.id === rememberedId);

        const firstUnread = sorted.find((item) => item.unreadCount > 0);
        const fallback =
          (rememberedStillExists && rememberedId) ||
          firstUnread?.id ||
          sorted[0]?.id ||
          "";

        setSelectedConversationId(fallback);
      } catch (err) {
        setError(
          err?.response?.data?.error?.message || err.message || "Failed to load inbox"
        );
      } finally {
        setLoadingConversations(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    if (!selectedConversationId) return;

    localStorage.setItem(STORAGE_KEY, selectedConversationId);

    async function loadMessages() {
      try {
        setLoadingMessages(true);
        setError("");

        const data = await getDirectMessages(selectedConversationId);
        setMessages(data?.messages || []);

        setConversations((prev) =>
          prev.map((item) =>
            item.id === selectedConversationId
              ? { ...item, unreadCount: 0 }
              : item
          )
        );
      } catch (err) {
        setError(
          err?.response?.data?.error?.message || err.message || "Failed to load messages"
        );
      } finally {
        setLoadingMessages(false);
      }
    }

    loadMessages();
  }, [selectedConversationId]);

  useEffect(() => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages]);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!selectedConversationId || !draft.trim()) return;

    try {
      setSending(true);
      setError("");

      const data = await sendDirectMessage(selectedConversationId, {
        content: draft.trim(),
      });

      const nextMessage = data?.message;
      if (nextMessage) {
        setMessages((prev) => [...prev, nextMessage]);

        setConversations((prev) =>
          sortConversations(
            prev.map((item) =>
              item.id === selectedConversationId
                ? {
                    ...item,
                    latestMessage: nextMessage,
                    lastMessageAt: nextMessage.createdAt,
                  }
                : item
            )
          )
        );
      }

      setDraft("");
    } catch (err) {
      setError(
        err?.response?.data?.error?.message || err.message || "Failed to send message"
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
            <h1 className="text-2xl font-semibold text-slate-100">Inbox</h1>
            <p className="mt-2 text-sm text-slate-400">
              Jump back into conversations quickly. Unread chats stay at the top.
            </p>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
            {loadingConversations ? <p className="text-slate-400">Loading conversations...</p> : null}
            {error ? <p className="text-red-300">{error}</p> : null}

            {!loadingConversations && !error && conversations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-5">
                <h2 className="text-lg font-semibold text-slate-100">No conversations yet</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Your inbox gets sticky once you start messaging people.
                </p>
                <p className="mt-3 text-sm text-slate-500">
                  {friends.length
                    ? "You already have friends — start a message from their profile or onboarding."
                    : "Add a friend first so you can start your first DM."}
                </p>
              </div>
            ) : null}

            <div className="space-y-3">
              {conversations.map((conversation) => (
                <ConversationListItem
                  key={conversation.id}
                  conversation={conversation}
                  currentUserId={user?.id}
                  active={conversation.id === selectedConversationId}
                  onClick={() => setSelectedConversationId(conversation.id)}
                />
              ))}
            </div>
          </section>
        </aside>

        <section className="rounded-3xl border border-slate-800 bg-slate-950">
          {!selectedConversation ? (
            <div className="p-8">
              <h2 className="text-xl font-semibold text-slate-100">Select a conversation</h2>
              <p className="mt-2 text-sm text-slate-400">
                Pick a chat on the left to continue where you left off.
              </p>
            </div>
          ) : (
            <>
              <div className="border-b border-slate-800 px-6 py-5">
                <h2 className="text-xl font-semibold text-slate-100">
                  {getConversationTitle(selectedConversation)}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {selectedConversation.unreadCount > 0
                    ? `${selectedConversation.unreadCount} unread message(s)`
                    : "All caught up"}
                </p>
              </div>

              <div
                ref={scrollerRef}
                className="h-[520px] space-y-4 overflow-y-auto px-6 py-5"
              >
                {loadingMessages ? <p className="text-slate-400">Loading messages...</p> : null}

                {!loadingMessages && messages.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-5">
                    <h3 className="text-lg font-semibold text-slate-100">No messages yet</h3>
                    <p className="mt-2 text-sm text-slate-400">
                      Start the conversation so this thread becomes a place to come back to.
                    </p>
                  </div>
                ) : null}

                {!loadingMessages &&
                  messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      currentUserId={user?.id}
                    />
                  ))}
              </div>

              <form
                onSubmit={handleSendMessage}
                className="border-t border-slate-800 px-6 py-5"
              >
                <div className="flex flex-col gap-3 md:flex-row">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a message..."
                    className="min-h-[56px] flex-1 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none"
                  />

                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}