import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/layout/AppShell";
import { getMyProfile, updateMyProfile } from "../api/users";
import UploadField from "../components/common/UploadField";
import {
  DEFAULT_THEME,
  VIBE_PRESETS,
  getPresetTheme,
  resolveTheme,
} from "../lib/theme";

const DEFAULT_FORM = {
  avatarUrl: "",
  bannerUrl: "",
  displayName: "",
  bio: "",
  status: "",
  favoriteSong: {
    title: "",
    artist: "",
    url: "",
    mood: "",
    nowSpinning: "",
    lastPlayed: "",
    note: "",
  },
  photoShowcase: [
    { imageUrl: "", caption: "" },
    { imageUrl: "", caption: "" },
    { imageUrl: "", caption: "" },
    { imageUrl: "", caption: "" },
    { imageUrl: "", caption: "" },
    { imageUrl: "", caption: "" },
  ],
  interests: ["", "", "", "", "", ""],
  fandomTags: ["", "", "", "", "", ""],
  badges: [
    { label: "", color: "#c084fc" },
    { label: "", color: "#60a5fa" },
    { label: "", color: "#f472b6" },
    { label: "", color: "#34d399" },
  ],
  theme: {
    ...DEFAULT_THEME,
  },
};

function ColorField({ label, value, onChange, helperText }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <label className="mb-3 block text-sm font-medium text-slate-200">{label}</label>

      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-16 cursor-pointer rounded-lg border border-slate-700 bg-transparent"
        />

        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#c084fc"
          className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none"
        />
      </div>

      {helperText ? <p className="mt-2 text-xs text-slate-400">{helperText}</p> : null}
    </div>
  );
}

function PresetCard({ presetKey, preset, active, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(presetKey)}
      className="rounded-2xl border p-4 text-left transition hover:scale-[1.01]"
      style={{
        borderColor: active ? preset.accentColor : "#334155",
        backgroundColor: active ? `${preset.accentColor}14` : "#0f172a",
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className="h-4 w-4 rounded-full border border-white/10"
          style={{ backgroundColor: preset.accentColor }}
        />
        <h3 className="font-semibold text-slate-100">{preset.label}</h3>
      </div>

      <p className="mb-4 text-sm text-slate-400">{preset.description}</p>

      <div className="flex gap-2">
        <span
          className="h-7 flex-1 rounded-lg border border-white/10"
          style={{ backgroundColor: preset.backgroundColor }}
        />
        <span
          className="h-7 flex-1 rounded-lg border border-white/10"
          style={{ backgroundColor: preset.panelColor }}
        />
        <span
          className="h-7 w-10 rounded-lg border border-white/10"
          style={{ backgroundColor: preset.accentColor }}
        />
      </div>
    </button>
  );
}

function ThemePreview({ theme, displayName, status, bio }) {
  const resolvedTheme = resolveTheme(theme);

  return (
    <div
      className="overflow-hidden rounded-3xl border"
      style={{
        backgroundColor: resolvedTheme.backgroundColor,
        borderColor: `${resolvedTheme.accentColor}44`,
        color: resolvedTheme.textColor,
      }}
    >
      <div
        className="h-24 w-full"
        style={{
          background: `linear-gradient(135deg, ${resolvedTheme.accentColor}88, ${resolvedTheme.panelColor})`,
        }}
      />

      <div className="p-5">
        <div className="-mt-10 flex items-end gap-4">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 text-xl font-bold"
            style={{
              backgroundColor: resolvedTheme.panelColor,
              borderColor: resolvedTheme.backgroundColor,
              color: resolvedTheme.accentColor,
            }}
          >
            {(displayName || "S").slice(0, 1).toUpperCase()}
          </div>

          <div className="pb-2">
            <h3 className="text-xl font-bold">
              {displayName || "Your Display Name"}
            </h3>
            <p style={{ color: resolvedTheme.accentColor }}>
              {status || "your status goes here"}
            </p>
          </div>
        </div>

        <div
          className="mt-5 rounded-2xl border p-4"
          style={{
            backgroundColor: resolvedTheme.panelColor,
            borderColor: `${resolvedTheme.accentColor}33`,
          }}
        >
          <p className="mb-2 text-sm font-semibold" style={{ color: resolvedTheme.accentColor }}>
            About Preview
          </p>
          <p className="text-sm" style={{ color: resolvedTheme.textColor }}>
            {bio || "This is how your colors will look across your profile."}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: `${resolvedTheme.accentColor}22`,
              color: resolvedTheme.accentColor,
              border: `1px solid ${resolvedTheme.accentColor}44`,
            }}
          >
            Accent
          </span>
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: resolvedTheme.panelColor,
              color: resolvedTheme.textColor,
              border: `1px solid ${resolvedTheme.accentColor}33`,
            }}
          >
            Panel
          </span>
        </div>
      </div>
    </div>
  );
}

export default function EditProfilePage() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const previewTheme = useMemo(() => resolveTheme(form.theme), [form.theme]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const data = await getMyProfile();

        setForm({
          ...DEFAULT_FORM,
          ...data.user,
          favoriteSong: {
            ...DEFAULT_FORM.favoriteSong,
            ...(data.user?.favoriteSong || {}),
          },
          photoShowcase: Array.from({ length: 6 }, (_, index) => ({
            imageUrl: data.user?.photoShowcase?.[index]?.imageUrl || "",
            caption: data.user?.photoShowcase?.[index]?.caption || "",
          })),
          interests: Array.from(
            { length: 6 },
            (_, index) => data.user?.interests?.[index] || ""
          ),
          fandomTags: Array.from(
            { length: 6 },
            (_, index) => data.user?.fandomTags?.[index] || ""
          ),
          badges: Array.from({ length: 4 }, (_, index) => ({
            label: data.user?.badges?.[index]?.label || "",
            color:
              data.user?.badges?.[index]?.color || DEFAULT_FORM.badges[index].color,
          })),
          theme: {
            ...DEFAULT_FORM.theme,
            ...(data.user?.theme || {}),
          },
        });
      } catch (err) {
        setError(err?.response?.data?.error?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateSongField(key, value) {
    setForm((prev) => ({
      ...prev,
      favoriteSong: {
        ...prev.favoriteSong,
        [key]: value,
      },
    }));
  }

  function updatePhotoField(index, key, value) {
    setForm((prev) => ({
      ...prev,
      photoShowcase: prev.photoShowcase.map((item, i) =>
        i === index ? { ...item, [key]: value } : item
      ),
    }));
  }

  function updateInterest(index, value) {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.map((item, i) => (i === index ? value : item)),
    }));
  }

  function updateFandomTag(index, value) {
    setForm((prev) => ({
      ...prev,
      fandomTags: prev.fandomTags.map((item, i) => (i === index ? value : item)),
    }));
  }

  function updateBadge(index, key, value) {
    setForm((prev) => ({
      ...prev,
      badges: prev.badges.map((badge, i) =>
        i === index ? { ...badge, [key]: value } : badge
      ),
    }));
  }

  function updateThemeField(key, value) {
    setForm((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        [key]: value,
      },
    }));
  }

  function applyPreset(vibe) {
    setForm((prev) => ({
      ...prev,
      theme: {
        ...getPresetTheme(vibe),
      },
    }));
  }

  function resetTheme() {
    setForm((prev) => ({
      ...prev,
      theme: {
        ...DEFAULT_THEME,
      },
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      await updateMyProfile({
        avatarUrl: form.avatarUrl,
        bannerUrl: form.bannerUrl,
        displayName: form.displayName,
        bio: form.bio,
        status: form.status,
        favoriteSong: form.favoriteSong,
        photoShowcase: form.photoShowcase.filter(
          (item) => item.imageUrl.trim() || item.caption.trim()
        ),
        interests: form.interests.filter((item) => item.trim()),
        fandomTags: form.fandomTags.filter((item) => item.trim()),
        badges: form.badges.filter((badge) => badge.label.trim()),
        theme: resolveTheme(form.theme),
      });

      setMessage("Profile updated.");
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <h1 className="mb-6 text-2xl font-semibold">Edit Profile</h1>

        {loading ? <p className="text-slate-400">Loading...</p> : null}
        {message ? <p className="mb-4 text-emerald-300">{message}</p> : null}
        {error ? <p className="mb-4 text-red-300">{error}</p> : null}

        {!loading ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm text-slate-300">Display Name</label>
              <input
                value={form.displayName}
                onChange={(e) => updateField("displayName", e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                placeholder="How your name appears on your profile"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Status</label>
              <input
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                placeholder="currently rebuilding the internet"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Bio</label>
              <textarea
                rows={5}
                value={form.bio}
                onChange={(e) => updateField("bio", e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                placeholder="Say something about yourself, your vibe, your interests, or what you're up to."
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <UploadField
                label="Profile Picture"
                kind="avatar"
                accept="image/*"
                value={form.avatarUrl}
                onUploaded={(url) => updateField("avatarUrl", url)}
                helperText="Upload a real image file or paste a direct image URL."
              />

              <UploadField
                label="Profile Banner"
                kind="banner"
                accept="image/*"
                value={form.bannerUrl}
                onUploaded={(url) => updateField("bannerUrl", url)}
                helperText="Wide banner image for the top of your profile."
              />
            </div>

            <div className="rounded-2xl border border-slate-800 p-4">
              <h2 className="mb-4 text-lg font-semibold">Currently Listening</h2>
              <p className="mb-4 text-sm text-slate-400">
                Add a YouTube, Spotify, or SoundCloud link and give it some personality.
              </p>

              <div className="space-y-4">
                <input
                  value={form.favoriteSong.title}
                  onChange={(e) => updateSongField("title", e.target.value)}
                  placeholder="Song title"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                />

                <input
                  value={form.favoriteSong.artist}
                  onChange={(e) => updateSongField("artist", e.target.value)}
                  placeholder="Artist"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                />

                <input
                  value={form.favoriteSong.url}
                  onChange={(e) => updateSongField("url", e.target.value)}
                  placeholder="Track URL"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    value={form.favoriteSong.mood}
                    onChange={(e) => updateSongField("mood", e.target.value)}
                    placeholder="Mood"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                  />

                  <input
                    value={form.favoriteSong.nowSpinning}
                    onChange={(e) => updateSongField("nowSpinning", e.target.value)}
                    placeholder="Now spinning"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                  />
                </div>

                <input
                  value={form.favoriteSong.lastPlayed}
                  onChange={(e) => updateSongField("lastPlayed", e.target.value)}
                  placeholder="Last played"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                />

                <textarea
                  rows={3}
                  value={form.favoriteSong.note}
                  onChange={(e) => updateSongField("note", e.target.value)}
                  placeholder="Optional note or caption"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 p-4">
              <h2 className="mb-4 text-lg font-semibold">Photo Showcase</h2>
              <p className="mb-4 text-sm text-slate-400">
                Upload up to 6 images to decorate your profile.
              </p>

              <div className="space-y-6">
                {form.photoShowcase.map((photo, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                  >
                    <p className="mb-3 text-sm font-medium text-slate-300">
                      Image Slot {index + 1}
                    </p>

                    <div className="space-y-3">
                      <UploadField
                        label={`Showcase Image ${index + 1}`}
                        kind="showcase"
                        accept="image/*"
                        value={photo.imageUrl}
                        onUploaded={(url) => updatePhotoField(index, "imageUrl", url)}
                        helperText="Upload an image or paste a direct image URL."
                      />

                      <input
                        value={photo.caption}
                        onChange={(e) =>
                          updatePhotoField(index, "caption", e.target.value)
                        }
                        placeholder="Caption"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 p-4">
              <h2 className="mb-4 text-lg font-semibold">Interests</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {form.interests.map((interest, index) => (
                  <input
                    key={index}
                    value={interest}
                    onChange={(e) => updateInterest(index, e.target.value)}
                    placeholder={`Interest ${index + 1}`}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                  />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 p-4">
              <h2 className="mb-4 text-lg font-semibold">Fandom Tags</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {form.fandomTags.map((tag, index) => (
                  <input
                    key={index}
                    value={tag}
                    onChange={(e) => updateFandomTag(index, e.target.value)}
                    placeholder={`Fandom Tag ${index + 1}`}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                  />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 p-4">
              <h2 className="mb-4 text-lg font-semibold">Profile Badges</h2>

              <div className="space-y-4">
                {form.badges.map((badge, index) => (
                  <div
                    key={index}
                    className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-[1fr_180px]"
                  >
                    <input
                      value={badge.label}
                      onChange={(e) => updateBadge(index, "label", e.target.value)}
                      placeholder={`Badge ${index + 1} label`}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none"
                    />

                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={badge.color}
                        onChange={(e) => updateBadge(index, "color", e.target.value)}
                        className="h-12 w-16 cursor-pointer rounded-lg border border-slate-700 bg-transparent"
                      />
                      <input
                        value={badge.color}
                        onChange={(e) => updateBadge(index, "color", e.target.value)}
                        placeholder="#c084fc"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Theme</h2>
                  <p className="text-sm text-slate-400">
                    Pick a style first, then fine-tune the colors if you want.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetTheme}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                >
                  Reset Theme
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Object.entries(VIBE_PRESETS).map(([presetKey, preset]) => (
                  <PresetCard
                    key={presetKey}
                    presetKey={presetKey}
                    preset={preset}
                    active={form.theme.vibe === presetKey}
                    onClick={applyPreset}
                  />
                ))}
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Theme Style</label>
                    <select
                      value={form.theme.vibe}
                      onChange={(e) => applyPreset(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                    >
                      {Object.entries(VIBE_PRESETS).map(([key, preset]) => (
                        <option key={key} value={key}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <ColorField
                      label="Accent Color"
                      value={previewTheme.accentColor}
                      onChange={(value) => updateThemeField("accentColor", value)}
                      helperText="Buttons, highlights, and active pieces."
                    />

                    <ColorField
                      label="Background Color"
                      value={previewTheme.backgroundColor}
                      onChange={(value) => updateThemeField("backgroundColor", value)}
                      helperText="Main profile background."
                    />

                    <ColorField
                      label="Panel Color"
                      value={previewTheme.panelColor}
                      onChange={(value) => updateThemeField("panelColor", value)}
                      helperText="Cards, boxes, and sections."
                    />

                    <ColorField
                      label="Text Color"
                      value={previewTheme.textColor}
                      onChange={(value) => updateThemeField("textColor", value)}
                      helperText="Main text color."
                    />
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-sm font-medium text-slate-200">Live Preview</p>
                  <ThemePreview
                    theme={previewTheme}
                    displayName={form.displayName}
                    status={form.status}
                    bio={form.bio}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-slate-100 px-5 py-3 font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </form>
        ) : null}
      </div>
    </AppShell>
  );
}  