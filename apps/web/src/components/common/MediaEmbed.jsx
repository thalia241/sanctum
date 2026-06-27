function isDirectImage(url) {
  return /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(url || "") || (url || "").includes("/uploads/images/");
}

function isDirectVideo(url) {
  return /\.(mp4|webm|mov|mkv)$/i.test(url || "") || (url || "").includes("/uploads/videos/") || (url || "").includes("/uploads/media/");
}

function getYouTubeEmbedUrl(url) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.pathname.replace("/", "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (parsed.hostname.includes("youtube.com")) {
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
    return `https://open.spotify.com/embed${parsed.pathname}`;
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

function resolveEmbed(url) {
  if (!url) return null;

  if (isDirectImage(url)) {
    return { type: "image", src: url };
  }

  if (isDirectVideo(url)) {
    return { type: "video", src: url };
  }

  const youtube = getYouTubeEmbedUrl(url);
  if (youtube) return { type: "youtube", src: youtube };

  const spotify = getSpotifyEmbedUrl(url);
  if (spotify) return { type: "spotify", src: spotify };

  const soundcloud = getSoundCloudEmbedUrl(url);
  if (soundcloud) return { type: "soundcloud", src: soundcloud };

  return { type: "link", src: url };
}

export default function MediaEmbed({ url, title = "Embedded media" }) {
  const embed = resolveEmbed(url);

  if (!embed) return null;

  if (embed.type === "image") {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
        <img
          src={embed.src}
          alt={title}
          className="max-h-[420px] w-full object-cover"
        />
      </div>
    );
  }

  if (embed.type === "video") {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
        <video
          src={embed.src}
          controls
          className="max-h-[420px] w-full object-cover"
        />
      </div>
    );
  }

  if (embed.type === "youtube") {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
        <iframe
          width="100%"
          height="320"
          src={embed.src}
          title={title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="block w-full"
        />
      </div>
    );
  }

  if (embed.type === "spotify") {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
        <iframe
          src={embed.src}
          width="100%"
          height="152"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title={title}
          className="block w-full"
        />
      </div>
    );
  }

  if (embed.type === "soundcloud") {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
        <iframe
          width="100%"
          height="166"
          scrolling="no"
          frameBorder="0"
          allow="autoplay"
          src={embed.src}
          title={title}
          className="block w-full"
        />
      </div>
    );
  }

  return (
    <a
      href={embed.src}
      target="_blank"
      rel="noreferrer"
      className="inline-flex rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-violet-300 hover:bg-slate-800 hover:underline"
    >
      Open Attached Link
    </a>
  );
} 