import { useState } from "react";
import CommentsSection from "./CommentsSection";
import RemoteImage from "../common/RemoteImage";
import MediaEmbed from "../common/MediaEmbed";

function PostBadge({ children, tone = "default" }) {
  const toneClassMap = {
    default: "border-slate-700 text-slate-300 bg-slate-950",
    creator: "border-violet-700/60 text-violet-200 bg-violet-950/40",
    subscribers: "border-amber-700/60 text-amber-200 bg-amber-950/40",
    public: "border-emerald-700/60 text-emerald-200 bg-emerald-950/30",
    pinned: "border-sky-700/60 text-sky-200 bg-sky-950/30",
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

function AuthorAvatar({ author }) {
  return (
    <RemoteImage
      src={author?.avatarUrl}
      alt={author?.username || "User"}
      fallbackLabel={author?.displayName || author?.username || "U"}
      className="h-11 w-11 rounded-2xl border border-slate-800 object-cover"
      fallbackClassName="h-11 w-11 rounded-2xl border border-slate-800"
      textClassName="text-sm text-slate-500"
    />
  );
}

export default function PostItem({ post, compact = false }) {
  const [showComments, setShowComments] = useState(false);

  const author = post.authorId || null;
  const isCreatorUpdate = post.postType === "creator_update";
  const isSubscribersOnly = post.visibility === "subscribers";
  const isPublic = post.visibility === "public";
  const isPinned = Boolean(post.isPinned);

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isCreatorUpdate
          ? "border-violet-800/60 bg-gradient-to-br from-slate-900 to-violet-950/25"
          : "border-slate-800 bg-slate-900"
      }`}
    >
      {post.coverImageUrl ? (
        <div className="mb-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className={`w-full object-cover ${compact ? "max-h-[220px]" : "max-h-[360px]"}`}
          />
        </div>
      ) : null}

      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <AuthorAvatar author={author} />

          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {isCreatorUpdate ? (
                <PostBadge tone="creator">Creator Update</PostBadge>
              ) : (
                <PostBadge>Community Post</PostBadge>
              )}

              {isSubscribersOnly ? (
                <PostBadge tone="subscribers">
                  Subscriber Only{post.accessTierLabel ? ` · ${post.accessTierLabel}` : ""}
                </PostBadge>
              ) : null}

              {isPublic ? <PostBadge tone="public">Public</PostBadge> : null}

              {!isPublic && !isSubscribersOnly ? (
                <PostBadge>Members Only</PostBadge>
              ) : null}

              {isPinned ? <PostBadge tone="pinned">Pinned</PostBadge> : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-slate-100">
                {author?.displayName || author?.username || "Unknown user"}
              </span>
              {author?.username ? (
                <span className="text-slate-500">@{author.username}</span>
              ) : null}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              {post.createdAt ? new Date(post.createdAt).toLocaleString() : ""}
            </div>
          </div>
        </div>
      </div>

      <h3 className="mb-2 text-xl font-semibold text-slate-100">{post.title}</h3>

      {isCreatorUpdate ? (
        <div className="mb-3 rounded-xl border border-violet-800/40 bg-violet-950/20 px-3 py-2 text-sm text-violet-200">
          A direct update from the creator or community leadership.
        </div>
      ) : null}

      {isSubscribersOnly ? (
        <div className="mb-3 rounded-xl border border-amber-800/40 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">
          Supporter content for active subscribers
          {post.accessTierLabel ? ` · ${post.accessTierLabel}` : ""}.
        </div>
      ) : null}

      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{post.body}</p>

      {post.embedUrl ? (
        <div className="mt-4">
          <MediaEmbed url={post.embedUrl} title={post.title} />
        </div>
      ) : null}

      {!compact ? (
        <>
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-800 pt-4">
            <div className="text-xs text-slate-400">
              {isCreatorUpdate
                ? "Creator-first announcement style"
                : "Community discussion post"}
            </div>

            <button
              onClick={() => setShowComments((prev) => !prev)}
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
            >
              {showComments ? "Hide Comments" : "Show Comments"}
            </button>
          </div>

          {showComments ? <CommentsSection postId={post._id} /> : null}
        </>
      ) : null}
    </div>
  );
}  