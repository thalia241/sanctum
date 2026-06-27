const multer = require("multer");

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
]);

const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
]);

function resolveUploadConfig(kind) {
  switch (kind) {
    case "avatar":
    case "banner":
    case "cover":
    case "showcase":
    case "image":
      return {
        allowImage: true,
        allowVideo: false,
        maxSize: 10 * 1024 * 1024,
      };
    case "video":
      return {
        allowImage: false,
        allowVideo: true,
        maxSize: 150 * 1024 * 1024,
      };
    case "media":
    default:
      return {
        allowImage: true,
        allowVideo: true,
        maxSize: 150 * 1024 * 1024,
      };
  }
}

function createUploader() {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 150 * 1024 * 1024,
    },
    fileFilter(req, file, cb) {
      const kind = req.params.kind || "media";
      const config = resolveUploadConfig(kind);

      const isImage = IMAGE_MIME_TYPES.has(file.mimetype);
      const isVideo = VIDEO_MIME_TYPES.has(file.mimetype);

      const allowed =
        (config.allowImage && isImage) || (config.allowVideo && isVideo);

      if (!allowed) {
        return cb(
          new Error(
            config.allowImage && config.allowVideo
              ? "Only image or video uploads are allowed for this field."
              : config.allowImage
              ? "Only image uploads are allowed for this field."
              : "Only video uploads are allowed for this field."
          )
        );
      }

      req.uploadConfig = config;
      cb(null, true);
    },
  });
}

module.exports = {
  createUploader,
  resolveUploadConfig,
};  