import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/layout/AppShell";
import { listMyMedia } from "../api/media";

function formatBytes(bytes = 0) {
  if (!bytes) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return "";
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${secs}s`;
}

function StatusBadge({ status }) {
  const styles = {
    active: "border-emerald-700/50 bg-emerald-950/30 text-emerald-200",
    replaced: "border-amber-700/50 bg-amber-950/30 text-amber-200",
    deleted: "border-red-700/50 bg-red-950/30 text-red-200",
  };

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
        styles[status] || "border-slate-700 bg-slate-950 text-slate-300"
      }`}
    >
      {status}
    </span>
  );
}

function KindBadge({ kind }) {
  return (
    <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
      {kind}
    </span>
  );
}

function MediaPreview({ asset, onOpen }) {
  if (asset.mediaType === "video") {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="relative block w-full overflow-hidden rounded-t-2xl bg-slate-950 text-left"
      >
        <video
          src={asset.url}
          className="h-56 w-full object-cover"
          muted
          playsInline
        />
        <div className="absolute bottom-3 right-3 rounded-full bg-black/70 px-2 py-1 text-xs text-white">
          {formatDuration(asset.duration) || "Video"}
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full overflow-hidden rounded-t-2xl bg-slate-950 text-left"
    >
      <img
        src={asset.url}
        alt={asset.originalName || asset.kind}
        className="h-56 w-full object-cover"
      />
    </button>
  );
}

function AssetCard({ asset, onPreview }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(asset.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  }

  const activeUsages = (asset.usages || []).filter((usage) => usage.isActive);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <MediaPreview asset={asset} onOpen={() => onPreview(asset)} />

      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={asset.status} />
          <KindBadge kind={asset.kind} />
          <KindBadge kind={asset.mediaType} />
        </div>

        <div>
          <p className="truncate text-sm font-semibold text-slate-100">
            {asset.originalName || `${asset.kind}.${asset.mediaType === "video" ? "mp4" : "jpg"}`}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Uploaded {asset.createdAt ? new Date(asset.createdAt).toLocaleString() : "—"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
          <div>
            <span className="text-slate-500">Size:</span> {formatBytes(asset.bytes)}
          </div>
          <div>
            <span className="text-slate-500">Type:</span> {asset.mimeType || "—"}
          </div>
          <div>
            <span className="text-slate-500">Dimensions:</span>{" "}
            {asset.width && asset.height ? `${asset.width}×${asset.height}` : "—"}
          </div>
          <div>
            <span className="text-slate-500">Duration:</span>{" "}
            {asset.mediaType === "video" ? formatDuration(asset.duration) || "—" : "—"}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Active usage
          </p>

          {activeUsages.length === 0 ? (
            <p className="text-xs text-slate-500">No active usage</p>
          ) : (
            <div className="space-y-1">
              {activeUsages.slice(0, 3).map((usage, index) => (
                <p key={index} className="text-xs text-slate-300">
                  {usage.entityType} · {usage.field}
                </p>
              ))}
              {activeUsages.length > 3 ? (
                <p className="text-xs text-slate-500">
                  +{activeUsages.length - 3} more
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 hover:bg-slate-800"
          >
            {copied ? "Copied" : "Copy URL"}
          </button>

          <a
            href={asset.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 hover:bg-slate-800"
          >
            Open
          </a>
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ asset, onClose }) {
  if (!asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-3xl border border-slate-800 bg-slate-950 p-4">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-100">
              {asset.originalName || "Media Preview"}
            </h2>
            <p className="text-sm text-slate-400">{asset.url}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900"
          >
            Close
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-black">
          {asset.mediaType === "video" ? (
            <video
              src={asset.url}
              controls
              className="max-h-[75vh] w-full object-contain"
            />
          ) : (
            <img
              src={asset.url}
              alt={asset.originalName || "Media preview"}
              className="max-h-[75vh] w-full object-contain"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function MediaLibraryPage() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("active");
  const [typeFilter, setTypeFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [previewAsset, setPreviewAsset] = useState(null);

  useEffect(() => {
    async function loadAssets() {
      try {
        setLoading(true);
        setError("");

        const params = {};
        if (statusFilter !== "all") params.status = statusFilter;
        if (typeFilter !== "all") params.mediaType = typeFilter;
        if (kindFilter !== "all") params.kind = kindFilter;

        const data = await listMyMedia(params);
        setAssets(data.assets || []);
      } catch (err) {
        setError(
          err?.response?.data?.error?.message ||
            err.message ||
            "Failed to load media library"
        );
      } finally {
        setLoading(false);
      }
    }

    loadAssets();
  }, [statusFilter, typeFilter, kindFilter]);

  const counts = useMemo(() => {
    return {
      total: assets.length,
      images: assets.filter((asset) => asset.mediaType === "image").length,
      videos: assets.filter((asset) => asset.mediaType === "video").length,
    };
  }, [assets]);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-100">Media Library</h1>
          <p className="mt-2 text-sm text-slate-400">
            Browse everything you’ve uploaded across profiles, communities, and posts.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Assets</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{counts.total}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Images</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{counts.images}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Videos</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{counts.videos}</p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm text-slate-300">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="replaced">Replaced</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Media Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
              >
                <option value="all">All</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Kind</label>
              <select
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
              >
                <option value="all">All</option>
                <option value="avatar">Avatar</option>
                <option value="banner">Banner</option>
                <option value="cover">Cover</option>
                <option value="showcase">Showcase</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="media">Media</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? <p className="text-slate-400">Loading media library...</p> : null}
        {error ? <p className="text-red-300">{error}</p> : null}

        {!loading && !error && assets.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-slate-300">No media found for these filters.</p>
            <p className="mt-2 text-sm text-slate-500">
              Upload something in your profile editor, community settings, or posts.
            </p>
          </div>
        ) : null}

        {!loading && !error && assets.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onPreview={setPreviewAsset}
              />
            ))}
          </div>
        ) : null}
      </div>

      <PreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} />
    </AppShell>
  );
} 