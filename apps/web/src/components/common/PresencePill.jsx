function formatLastSeen(lastActiveAt) {
  if (!lastActiveAt) return "Offline";

  const date = new Date(lastActiveAt);
  if (Number.isNaN(date.getTime())) return "Offline";

  return `Last seen ${date.toLocaleString()}`;
}

export default function PresencePill({ presence }) {
  const isOnline = Boolean(presence?.isOnline);

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        isOnline
          ? "border-emerald-700/60 bg-emerald-950/30 text-emerald-200"
          : "border-slate-700 bg-slate-900 text-slate-300"
      }`}
      title={isOnline ? "Online now" : formatLastSeen(presence?.lastActiveAt)}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          isOnline ? "bg-emerald-400" : "bg-slate-500"
        }`}
      />
      {isOnline ? "Online" : "Offline"}
    </span>
  );
} 