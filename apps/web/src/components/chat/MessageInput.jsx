import { useState } from "react";

export default function MessageInput({ onSend, disabled }) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    const trimmed = content.trim();
    if (!trimmed || disabled || sending) return;

    try {
      setSending(true);
      await onSend(trimmed);
      setContent("");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex gap-3">
      <input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type a message..."
        disabled={disabled || sending}
        className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none"
      />
      <button
        type="submit"
        disabled={disabled || sending}
        className="rounded-xl bg-slate-100 px-4 py-3 font-medium text-slate-950 disabled:opacity-50"
      >
        {sending ? "Sending..." : "Send"}
      </button>
    </form>
  );
} 