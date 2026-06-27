import { useState } from "react";

function getInitial(label = "?") {
  return String(label || "?").trim().charAt(0).toUpperCase() || "?";
}

export function RemoteCover({
  src,
  alt = "",
  className = "",
  fallbackClassName = "",
  fallbackLabel = "?",
  children = null,
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-900 ${className} ${fallbackClassName}`}
      >
        {children || (
          <span className="text-3xl font-bold text-slate-600">
            {getInitial(fallbackLabel)}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

export default function RemoteImage({
  src,
  alt = "",
  className = "",
  fallbackLabel = "?",
  fallbackClassName = "",
  textClassName = "text-slate-500",
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-900 ${className} ${fallbackClassName}`}
      >
        <span className={`font-bold ${textClassName}`}>
          {getInitial(fallbackLabel)}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
} 