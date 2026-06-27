const path = require("path");
const cloudinary = require("../lib/cloudinary");
const env = require("../config/env");
const MediaAsset = require("../models/MediaAsset");

function getResourceTypeFromMime(mimeType = "") {
  return mimeType.startsWith("video/") ? "video" : "image";
}

function getResourceTypeFromUrl(url = "") {
  const normalized = String(url || "").toLowerCase();

  if (
    normalized.includes("/video/upload/") ||
    /\.(mp4|webm|mov|mkv)(\?|$)/i.test(normalized)
  ) {
    return "video";
  }

  return "image";
}

function isCloudinaryUrl(url = "") {
  return /res\.cloudinary\.com/i.test(String(url || ""));
}

function extractPublicIdFromCloudinaryUrl(url = "") {
  if (!isCloudinaryUrl(url)) return null;

  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);

    const uploadIndex = parts.findIndex((part) => part === "upload");
    if (uploadIndex === -1) return null;

    let assetParts = parts.slice(uploadIndex + 1);

    if (assetParts[0] && /^v\d+$/.test(assetParts[0])) {
      assetParts = assetParts.slice(1);
    }

    if (assetParts.length === 0) return null;

    const joined = assetParts.join("/");
    const ext = path.extname(joined);
    return ext ? joined.slice(0, -ext.length) : joined;
  } catch {
    return null;
  }
}

async function uploadBufferToCloudinary({
  buffer,
  mimeType,
  folder,
  filenameBase,
}) {
  const resourceType = getResourceTypeFromMime(mimeType);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: filenameBase,
        overwrite: false,
        use_filename: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(buffer);
  });
}

async function deleteCloudinaryAssetByUrl(url) {
  if (!isCloudinaryUrl(url)) return { skipped: true };

  const publicId = extractPublicIdFromCloudinaryUrl(url);
  if (!publicId) return { skipped: true };

  const resourceType = getResourceTypeFromUrl(url);

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });

  return result;
}

function buildCloudinaryFolder(...parts) {
  return [env.CLOUDINARY_FOLDER, ...parts]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join("/");
}

function normalizeUrl(url = "") {
  return String(url || "").trim();
}

async function createMediaAssetRecord({
  ownerUserId,
  uploadedByUserId,
  kind,
  uploadResult,
  originalName = "",
  mimeType = "",
  size = 0,
}) {
  const mediaType =
    uploadResult.resource_type === "video" ? "video" : "image";

  const asset = await MediaAsset.create({
    ownerUserId,
    uploadedByUserId,
    provider: "cloudinary",
    kind: kind || "media",
    mediaType,
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    originalName,
    mimeType,
    bytes: size || uploadResult.bytes || 0,
    width: uploadResult.width || null,
    height: uploadResult.height || null,
    duration: uploadResult.duration || null,
    folder: uploadResult.folder || "",
    status: "active",
  });

  return asset;
}

function usageMatches(usage, target) {
  return (
    usage.entityType === target.entityType &&
    usage.entityId === String(target.entityId) &&
    usage.field === target.field
  );
}

async function registerMediaUsageByUrl(url, usageTarget) {
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl || !isCloudinaryUrl(normalizedUrl)) return null;

  const asset = await MediaAsset.findOne({ url: normalizedUrl });
  if (!asset) return null;

  const existingIndex = asset.usages.findIndex((usage) =>
    usageMatches(usage, usageTarget)
  );

  if (existingIndex >= 0) {
    asset.usages[existingIndex].isActive = true;
    asset.usages[existingIndex].removedAt = null;
    if (!asset.usages[existingIndex].addedAt) {
      asset.usages[existingIndex].addedAt = new Date();
    }
  } else {
    asset.usages.push({
      entityType: usageTarget.entityType,
      entityId: String(usageTarget.entityId),
      field: usageTarget.field,
      isActive: true,
      addedAt: new Date(),
      removedAt: null,
    });
  }

  if (asset.status === "replaced" || asset.status === "deleted") {
    asset.status = "active";
    asset.deletedAt = null;
    asset.deletedReason = "";
  }

  await asset.save();
  return asset;
}

async function unregisterMediaUsageByUrl(
  url,
  usageTarget,
  { deleteIfUnused = true, replacedByAssetId = null, reason = "" } = {}
) {
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl || !isCloudinaryUrl(normalizedUrl)) return null;

  const asset = await MediaAsset.findOne({ url: normalizedUrl });
  if (!asset) return null;

  let changed = false;

  asset.usages = asset.usages.map((usage) => {
    if (usageMatches(usage, usageTarget) && usage.isActive) {
      changed = true;
      return {
        ...usage.toObject?.() || usage,
        isActive: false,
        removedAt: new Date(),
      };
    }
    return usage;
  });

  if (!changed) {
    return asset;
  }

  const hasActiveUsages = asset.usages.some((usage) => usage.isActive);

  if (!hasActiveUsages) {
    if (replacedByAssetId) {
      asset.status = "replaced";
      asset.replacedByAssetId = replacedByAssetId;
      asset.deletedReason = reason || "replaced";
    } else {
      asset.status = "deleted";
      asset.deletedAt = new Date();
      asset.deletedReason = reason || "removed";
    }

    if (deleteIfUnused) {
      try {
        await deleteCloudinaryAssetByUrl(asset.url);
      } catch (error) {
        console.error("Failed to delete Cloudinary asset:", error.message);
      }
    }
  }

  await asset.save();
  return asset;
}

async function replaceMediaUsage({
  oldUrl,
  newUrl,
  usageTarget,
}) {
  const normalizedOld = normalizeUrl(oldUrl);
  const normalizedNew = normalizeUrl(newUrl);

  let newAsset = null;

  if (normalizedNew) {
    newAsset = await registerMediaUsageByUrl(normalizedNew, usageTarget);
  }

  if (normalizedOld && normalizedOld !== normalizedNew) {
    await unregisterMediaUsageByUrl(normalizedOld, usageTarget, {
      deleteIfUnused: true,
      replacedByAssetId: newAsset?._id || null,
      reason: "replaced",
    });
  }

  return newAsset;
}

async function syncMediaSetUsages({
  oldUrls = [],
  newUrls = [],
  usageTarget,
}) {
  const oldSet = new Set(oldUrls.map(normalizeUrl).filter(Boolean));
  const newSet = new Set(newUrls.map(normalizeUrl).filter(Boolean));

  const removed = [...oldSet].filter((url) => !newSet.has(url));
  const added = [...newSet].filter((url) => !oldSet.has(url));

  await Promise.all(added.map((url) => registerMediaUsageByUrl(url, usageTarget)));
  await Promise.all(
    removed.map((url) =>
      unregisterMediaUsageByUrl(url, usageTarget, {
        deleteIfUnused: true,
        reason: "removed_from_set",
      })
    )
  );
}

module.exports = {
  isCloudinaryUrl,
  extractPublicIdFromCloudinaryUrl,
  uploadBufferToCloudinary,
  deleteCloudinaryAssetByUrl,
  buildCloudinaryFolder,
  createMediaAssetRecord,
  registerMediaUsageByUrl,
  unregisterMediaUsageByUrl,
  replaceMediaUsage,
  syncMediaSetUsages,
}; 