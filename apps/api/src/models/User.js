const mongoose = require("mongoose");

const onboardingActionSchema = new mongoose.Schema(
  {
    profileSavedAt: {
      type: Date,
      default: null,
    },
    themeChosenAt: {
      type: Date,
      default: null,
    },
    joinedCommunityAt: {
      type: Date,
      default: null,
    },
    sentFriendRequestAt: {
      type: Date,
      default: null,
    },
    createdPostAt: {
      type: Date,
      default: null,
    },
    sentDmAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const onboardingSchema = new mongoose.Schema(
  {
    completedAt: {
      type: Date,
      default: null,
    },
    dismissedAt: {
      type: Date,
      default: null,
    },
    lastCompletedStep: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "",
    },
    actions: {
      type: onboardingActionSchema,
      default: () => ({}),
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 32,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },

    avatarUrl: {
      type: String,
      default: "",
    },
    bannerUrl: {
      type: String,
      default: "",
    },

    displayName: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "",
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 280,
      default: "",
    },
    status: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },

    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    favoriteSong: {
      title: { type: String, trim: true, maxlength: 120, default: "" },
      artist: { type: String, trim: true, maxlength: 120, default: "" },
      url: { type: String, trim: true, maxlength: 500, default: "" },
      mood: { type: String, trim: true, maxlength: 60, default: "" },
      nowSpinning: { type: String, trim: true, maxlength: 120, default: "" },
      lastPlayed: { type: String, trim: true, maxlength: 120, default: "" },
      note: { type: String, trim: true, maxlength: 180, default: "" },
    },

    photoShowcase: [
      {
        imageUrl: {
          type: String,
          trim: true,
          maxlength: 500,
          default: "",
        },
        caption: {
          type: String,
          trim: true,
          maxlength: 120,
          default: "",
        },
      },
    ],

    interests: [
      {
        type: String,
        trim: true,
        maxlength: 40,
      },
    ],

    fandomTags: [
      {
        type: String,
        trim: true,
        maxlength: 40,
      },
    ],

    badges: [
      {
        label: {
          type: String,
          trim: true,
          maxlength: 40,
          required: true,
        },
        color: {
          type: String,
          trim: true,
          maxlength: 20,
          default: "#c084fc",
        },
      },
    ],

    theme: {
      accentColor: { type: String, default: "#c084fc" },
      backgroundColor: { type: String, default: "#020617" },
      panelColor: { type: String, default: "#0f172a" },
      textColor: { type: String, default: "#e2e8f0" },
      vibe: {
        type: String,
        enum: [
          "dreamy",
          "cyber",
          "goth",
          "neon",
          "soft",
          "classic",
          "sunset",
          "forest",
        ],
        default: "dreamy",
      },
    },

    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    topFriends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    onboarding: {
      type: onboardingSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema); 