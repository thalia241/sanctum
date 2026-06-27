const mongoose = require("mongoose");

const communitySettingsSchema = new mongoose.Schema(
  {
    communityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      unique: true,
      index: true,
    },

    charter: {
      type: String,
      default: "",
      maxlength: 5000,
    },

    requireCharterAck: {
      type: Boolean,
      default: false,
    },

    transparencyNote: {
      type: String,
      default: "",
      maxlength: 2000,
    },

    onboardingMessage: {
      type: String,
      default: "",
      maxlength: 2000,
    },

    description: {
      type: String,
      default: "",
      maxlength: 500,
    },

    isDiscoverable: {
      type: Boolean,
      default: false,
      index: true,
    },

    isPublicFeed: {
      type: Boolean,
      default: false,
      index: true,
    },

    bannerUrl: {
      type: String,
      default: "",
      maxlength: 500,
    },

    avatarUrl: {
      type: String,
      default: "",
      maxlength: 500,
    },

    brandHeadline: {
      type: String,
      default: "",
      maxlength: 120,
    },

    accentColor: {
      type: String,
      default: "#c084fc",
      maxlength: 20,
    },

    themeVibe: {
      type: String,
      default: "dreamy",
      maxlength: 40,
    },

    backgroundColor: {
      type: String,
      default: "#020617",
      maxlength: 20,
    },

    panelColor: {
      type: String,
      default: "#0f172a",
      maxlength: 20,
    },

    textColor: {
      type: String,
      default: "#e2e8f0",
      maxlength: 20,
    },

    featuredPerks: [
      {
        type: String,
        trim: true,
        maxlength: 80,
      },
    ],

    pinnedAnnouncement: {
      title: {
        type: String,
        default: "",
        maxlength: 120,
      },
      body: {
        type: String,
        default: "",
        maxlength: 500,
      },
      ctaLabel: {
        type: String,
        default: "",
        maxlength: 40,
      },
      ctaUrl: {
        type: String,
        default: "",
        maxlength: 500,
      },
    },
  },
  { timestamps: true }
);

communitySettingsSchema.index({
  description: "text",
  onboardingMessage: "text",
  transparencyNote: "text",
  brandHeadline: "text",
});

module.exports = mongoose.model("CommunitySettings", communitySettingsSchema);   