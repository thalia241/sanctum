const asyncHandler = require("../utils/asyncHandler");
const MediaAsset = require("../models/MediaAsset");

function sanitizeMediaAsset(asset) {
  return {
    id: asset._id,
    ownerUserId: asset.ownerUserId,
    uploadedByUserId: asset.uploadedByUserId,
    provider: asset.provider,
    kind: asset.kind,
    mediaType: asset.mediaType,
    url: asset.url,
    publicId: asset.publicId,
    originalName: asset.originalName,
    mimeType: asset.mimeType,
    bytes: asset.bytes,
    width: asset.width,
    height: asset.height,
    duration: asset.duration,
    folder: asset.folder,
    status: asset.status,
    replacedByAssetId: asset.replacedByAssetId,
    deletedAt: asset.deletedAt,
    deletedReason: asset.deletedReason,
    usages: (asset.usages || []).map((usage) => ({
      entityType: usage.entityType,
      entityId: usage.entityId,
      field: usage.field,
      isActive: usage.isActive,
      addedAt: usage.addedAt,
      removedAt: usage.removedAt,
    })),
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

const listMyMedia = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const status = String(req.query.status || "").trim();
  const kind = String(req.query.kind || "").trim();
  const mediaType = String(req.query.mediaType || "").trim();
  const limit = Math.min(Number(req.query.limit || 50), 100);

  const filter = {
    ownerUserId: userId,
  };

  if (status && ["active", "replaced", "deleted"].includes(status)) {
    filter.status = status;
  }

  if (
    kind &&
    ["avatar", "banner", "cover", "showcase", "image", "video", "media"].includes(
      kind
    )
  ) {
    filter.kind = kind;
  }

  if (mediaType && ["image", "video"].includes(mediaType)) {
    filter.mediaType = mediaType;
  }

  const assets = await MediaAsset.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({
    ok: true,
    assets: assets.map(sanitizeMediaAsset),
  });
});

module.exports = {
  listMyMedia,
}; 