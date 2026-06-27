export default function MessageList({ messages }) {
  return (
    <div className="space-y-3">
      {messages.map((message) => {
        const authorName =
          message.userId?.username ||
          message.author?.username ||
          message.username ||
          "User";

        return (
          <div key={message._id || message.id || `${message.createdAt}-${message.content}`} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <div className="mb-1 text-xs text-slate-400">{authorName}</div>
            <div className="text-sm text-slate-100">
              {message.redacted ? <em className="text-slate-500">Deleted message</em> : message.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}  