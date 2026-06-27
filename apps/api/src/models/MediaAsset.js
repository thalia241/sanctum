const mongoose = require("mongoose");

const mediaUsageSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ["user", "community", "post"],
      required: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    field: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    removedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const mediaAssetSchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    uploadedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["cloudinary"],
      default: "cloudinary",
      index: true,
    },

    kind: {
      type: String,
      enum: [
        "avatar",
        "banner",
        "cover",
        "showcase",
        "image",
        "video",
        "media",
      ],
      default: "media",
      index: true,
    },

    mediaType: {
      type: String,
      enum: ["image", "video"],
      required: true,
      index: true,
    },

    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
      unique: true,
    },

    publicId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
      unique: true,
      index: true,
    },

    originalName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 255,
    },

    mimeType: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },

    bytes: {
      type: Number,
      default: 0,
      min: 0,
    },

    width: {
      type: Number,
      default: null,
      min: 0,
    },

    height: {
      type: Number,
      default: null,
      min: 0,
    },

    duration: {
      type: Number,
      default: null,
      min: 0,
    },

    folder: {
      type: String,
      default: "",
      trim: true,
      maxlength: 255,
    },

    status: {
      type: String,
      enum: ["active", "replaced", "deleted"],
      default: "active",
      index: true,
    },

    replacedByAssetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MediaAsset",
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },

    usages: {
      type: [mediaUsageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

mediaAssetSchema.index({ ownerUserId: 1, createdAt: -1 });
mediaAssetSchema.index({ "usages.entityType": 1, "usages.entityId": 1, "usages.field": 1 });

module.exports = mongoose.model("MediaAsset", mediaAssetSchema); 