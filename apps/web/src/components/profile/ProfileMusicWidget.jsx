function getYouTubeEmbedUrl(url) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.pathname.replace("/", "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (
      parsed.hostname.includes("youtube.com") &&
      (parsed.pathname === "/watch" || parsed.pathname.startsWith("/watch"))
    ) {
      const videoId = parsed.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    return null;
  } catch {
    return null;
  }
}

function getSpotifyEmbedUrl(url) {
  try {
    const parsed = new URL(url);

    if (!parsed.hostname.includes("spotify.com")) return null;

    const path = parsed.pathname.replace(/\/+$/, "");
    if (!path) return null;

    return `https://open.spotify.com/embed${path}`;
  } catch {
    return null;
  }
}

function getSoundCloudEmbedUrl(url) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("soundcloud.com")) return null;

    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(
      url
    )}&color=%23c084fc&auto_play=false&hide_related=false&show_comments=false&show_user=true&show_reposts=false&show_teaser=true`;
  } catch {
    return null;
  }
}

function getEmbedInfo(url) {
  if (!url) return null;

  const youtube = getYouTubeEmbedUrl(url);
  if (youtube) return { type: "youtube", src: youtube };

  const spotify = getSpotifyEmbedUrl(url);
  if (spotify) return { type: "spotify", src: spotify };

  const soundcloud = getSoundCloudEmbedUrl(url);
  if (soundcloud) return { type: "soundcloud", src: soundcloud };

  return null;
}

function MetaPill({ label, value, accentColor }) {
  if (!value) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium" style={{ color: accentColor }}>
        {value}
      </p>
    </div>
  );
}

export default function ProfileMusicWidget({ favoriteSong, accentColor = "#c084fc" }) {
  const title = favoriteSong?.title || "";
  const artist = favoriteSong?.artist || "";
  const url = favoriteSong?.url || "";
  const mood = favoriteSong?.mood || "";
  const nowSpinning = favoriteSong?.nowSpinning || "";
  const lastPlayed = favoriteSong?.lastPlayed || "";
  const note = favoriteSong?.note || "";

  const hasSong = Boolean(
    title || artist || url || mood || nowSpinning || lastPlayed || note
  );

  if (!hasSong) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-3 text-lg font-semibold">Currently Listening</h2>
        <p className="text-sm text-slate-400">No featured track yet.</p>
      </section>
    );
  }

  const embed = getEmbedInfo(url);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
          style={{ backgroundColor: accentColor, color: "#020617" }}
        >
          ♫
        </div>

        <div>
          <h2 className="text-lg font-semibold">Currently Listening</h2>
          <p className="text-sm text-slate-400">Soundtrack of the moment.</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm font-semibold text-slate-100">
          {title || "Untitled"}
        </p>
        <p className="text-sm text-slate-400">
          {artist || "Unknown artist"}
        </p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <MetaPill label="Mood" value={mood} accentColor={accentColor} />
        <MetaPill label="Now spinning" value={nowSpinning} accentColor={accentColor} />
        <MetaPill label="Last played" value={lastPlayed} accentColor={accentColor} />
      </div>

      {note ? (
        <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Note</p>
          <p className="mt-2 text-sm text-slate-300">{note}</p>
        </div>
      ) : null}

      {embed?.type === "youtube" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <iframe
            width="100%"
            height="220"
            src={embed.src}
            title={`${title || "Song"} by ${artist || "Unknown artist"}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="block w-full"
          />
        </div>
      ) : null}

      {embed?.type === "spotify" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <iframe
            src={embed.src}
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title={`${title || "Song"} by ${artist || "Unknown artist"}`}
            className="block w-full"
          />
        </div>
      ) : null}

      {embed?.type === "soundcloud" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <iframe
            width="100%"
            height="166"
            scrolling="no"
            frameBorder="0"
            allow="autoplay"
            src={embed.src}
            title={`${title || "Song"} by ${artist || "Unknown artist"}`}
            className="block w-full"
          />
        </div>
      ) : null}

      {!embed && url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-violet-300 hover:bg-slate-800 hover:underline"
        >
          Open Track
        </a>
      ) : null}
    </section>
  );
}  