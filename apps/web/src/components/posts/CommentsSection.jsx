import { useEffect, useMemo, useState } from "react";
import { createComment, deleteComment, listComments } from "../../api/comments";

function CommentComposer({
  postId,
  parentCommentId = null,
  placeholder = "Write a comment...",
  onCreated,
  compact = false,
}) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    const trimmed = body.trim();
    if (!trimmed) {
      setError("Comment cannot be empty");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await createComment(postId, {
        body: trimmed,
        parentCommentId,
      });

      const comment = data.comment || data;
      setBody("");

      if (onCreated) {
        onCreated(comment);
      }
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || "Failed to create comment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? "mt-3 space-y-2" : "mt-4 space-y-3"}>
      {error ? (
        <div className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none ${
          compact ? "min-h-[80px]" : "min-h-[100px]"
        }`}
        maxLength={5000}
      />

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Posting..." : parentCommentId ? "Reply" : "Comment"}
      </button>
    </form>
  );
}

function CommentItem({ comment, replies, postId, onDeleted, onReplyCreated, depth = 0 }) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const maxDepthClass = depth > 0 ? "ml-6" : "";

  async function handleDelete() {
    try {
      setDeleting(true);
      await deleteComment(comment._id);
      if (onDeleted) onDeleted(comment._id);
    } catch (err) {
      console.error("Delete comment failed:", err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-950 p-3 ${maxDepthClass}`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-slate-400">
            {comment.authorId?.username || comment.username || "User"}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ""}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowReplyBox((prev) => !prev)}
            className="text-xs text-slate-300 hover:text-white"
          >
            {showReplyBox ? "Cancel" : "Reply"}
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-red-300 hover:text-red-200 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      <p className="whitespace-pre-wrap text-sm text-slate-200">{comment.body}</p>

      {showReplyBox ? (
        <CommentComposer
          postId={postId}
          parentCommentId={comment._id}
          placeholder="Write a reply..."
          compact
          onCreated={(newReply) => {
            setShowReplyBox(false);
            if (onReplyCreated) onReplyCreated(newReply);
          }}
        />
      ) : null}

      {replies?.length ? (
        <div className="mt-4 space-y-3">
          {replies.map((reply) => (
            <CommentItem
              key={reply._id}
              comment={reply}
              replies={[]}
              postId={postId}
              onDeleted={onDeleted}
              onReplyCreated={onReplyCreated}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function CommentsSection({ postId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadComments() {
    try {
      setLoading(true);
      setError("");

      const data = await listComments(postId);
      setComments(data.comments || []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || "Failed to load comments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadComments();
  }, [postId]);

  const grouped = useMemo(() => {
    const topLevel = [];
    const repliesByParent = new Map();

    for (const comment of comments) {
      const parentId = comment.parentCommentId || null;

      if (!parentId) {
        topLevel.push(comment);
      } else {
        const key = String(parentId);
        const arr = repliesByParent.get(key) || [];
        arr.push(comment);
        repliesByParent.set(key, arr);
      }
    }

    return { topLevel, repliesByParent };
  }, [comments]);

  function handleCommentCreated(newComment) {
    setComments((prev) => [...prev, newComment]);
  }

  function handleCommentDeleted(commentId) {
    setComments((prev) => prev.filter((c) => c._id !== commentId));
  }

  return (
    <div className="mt-4 border-t border-slate-800 pt-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-200">Comments</h4>

      <CommentComposer
        postId={postId}
        onCreated={handleCommentCreated}
      />

      {loading ? <p className="mt-4 text-sm text-slate-400">Loading comments...</p> : null}
      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

      <div className="mt-4 space-y-4">
        {grouped.topLevel.length === 0 && !loading ? (
          <p className="text-sm text-slate-400">No comments yet.</p>
        ) : null}

        {grouped.topLevel.map((comment) => (
          <CommentItem
            key={comment._id}
            comment={comment}
            replies={grouped.repliesByParent.get(String(comment._id)) || []}
            postId={postId}
            onDeleted={handleCommentDeleted}
            onReplyCreated={handleCommentCreated}
          />
        ))}
      </div>
    </div>
  );
} 