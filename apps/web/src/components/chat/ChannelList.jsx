export default function ChannelList({ channels, selectedChannelId, onSelect }) {
  return (
    <div className="space-y-2">
      {channels.map((channel) => {
        const active = selectedChannelId === channel._id;

        return (
          <button
            key={channel._id}
            onClick={() => onSelect(channel)}
            className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
              active
                ? "bg-slate-200 text-slate-950"
                : "bg-slate-900 text-slate-200 hover:bg-slate-800"
            }`}
          >
            # {channel.name}
          </button>
        );
      })}
    </div>
  );
} 