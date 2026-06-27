const { nanoid } = require("nanoid");
const {
  uploadBufferToCloudinary,
  buildCloudinaryFolder,
  createMediaAssetRecord,
} = require("../utils/media");

const uploadSingle = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: { message: "No file uploaded" },
    });
  }

  const kind = req.params.kind || "media";
  const userId = req.user?.sub || "anonymous";

  const folder = buildCloudinaryFolder("users", userId, kind);
  const filenameBase = `${kind}-${Date.now()}-${nanoid(8)}`;

  const result = await uploadBufferToCloudinary({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    folder,
    filenameBase,
  });

  const asset = await createMediaAssetRecord({
    ownerUserId: userId,
    uploadedByUserId: userId,
    kind,
    uploadResult: result,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
  });

  res.status(201).json({
    ok: true,
    file: {
      id: asset._id,
      url: asset.url,
      publicId: asset.publicId,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      size: asset.bytes,
      mediaType: asset.mediaType,
      width: asset.width,
      height: asset.height,
      duration: asset.duration,
      createdAt: asset.createdAt,
    },
  });
};

module.exports = {
  uploadSingle,
};  