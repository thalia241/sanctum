import { useRef, useState } from "react";
import { uploadFile } from "../../api/uploads";

function detectVideo(value = "", accept = "") {
  const normalized = String(value || "").toLowerCase();
  return (
    accept.includes("video") ||
    normalized.endsWith(".mp4") ||
    normalized.endsWith(".webm") ||
    normalized.endsWith(".mov") ||
    normalized.includes("/video/upload/")
  );
}

function Preview({ value, label, accept }) {
  if (!value) {
    return (
      <div className="flex h-40 w-full items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950 text-sm text-slate-500">
        No file uploaded yet
      </div>
    );
  }

  if (detectVideo(value, accept)) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
        <video src={value} controls className="h-40 w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
      <img src={value} alt={label} className="h-40 w-full object-cover" />
    </div>
  );
}

export default function UploadField({
  label,
  kind = "media",
  accept = "image/*",
  value,
  onUploaded,
  helperText = "",
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError("");

      const data = await uploadFile(file, kind);
      onUploaded?.(data.file?.url || "");
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
          err.message ||
          "Upload failed"
      );
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800 disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload File"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      <Preview value={value} label={label} accept={accept} />

      <input
        value={value || ""}
        onChange={(e) => onUploaded?.(e.target.value)}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
        placeholder="Or paste a direct URL"
      />

      {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}  