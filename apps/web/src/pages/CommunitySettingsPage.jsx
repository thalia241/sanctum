import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import { getCommunityBySlug } from "../api/communities";
import { updateCommunitySettings } from "../api/communitySettings";

function FieldGroup({ label, description, children }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <h2 className="text-lg font-semibold text-slate-100">{label}</h2>
      {description ? <p className="mt-2 text-sm text-slate-400">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ProgressCard({ completeCount, total }) {
  const percent = total ? Math.round((completeCount / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">Landing completion</p>
      <p className="mt-2 text-3xl font-bold text-slate-100">{percent}%</p>
      <p className="mt-2 text-sm text-slate-400">
        {completeCount} of {total} creator-facing setup items completed
      </p>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-violet-400 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default function CommunitySettingsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [communityData, setCommunityData] = useState(null);
  const [form, setForm] = useState({
    description: "",
    bannerUrl: "",
    avatarUrl: "",
    brandHeadline: "",
    accentColor: "#c084fc",
    themeVibe: "dreamy",
    backgroundColor: "#020617",
    panelColor: "#0f172a",
    textColor: "#e2e8f0",
    featuredPerks: "",
    onboardingMessage: "",
    transparencyNote: "",
    charter: "",
    requireCharterAck: false,
    isPublicFeed: false,
    isDiscoverable: true,
    pinnedAnnouncementTitle: "",
    pinnedAnnouncementBody: "",
    pinnedAnnouncementCtaLabel: "",
    pinnedAnnouncementCtaUrl: "",
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const data = await getCommunityBySlug(slug);
      setCommunityData(data);

      const summary = data?.community?.settingsSummary || {};
      const announcement = summary.pinnedAnnouncement || {};

      setForm({
        description: summary.description || "",
        bannerUrl: summary.bannerUrl || "",
        avatarUrl: summary.avatarUrl || "",
        brandHeadline: summary.brandHeadline || "",
        accentColor: summary.accentColor || "#c084fc",
        themeVibe: summary.themeVibe || "dreamy",
        backgroundColor: summary.backgroundColor || "#020617",
        panelColor: summary.panelColor || "#0f172a",
        textColor: summary.textColor || "#e2e8f0",
        featuredPerks: (summary.featuredPerks || []).join("\n"),
        onboardingMessage: summary.onboardingMessage || "",
        transparencyNote: summary.transparencyNote || "",
        charter: summary.charter || "",
        requireCharterAck: Boolean(summary.requireCharterAck),
        isPublicFeed: Boolean(summary.isPublicFeed),
        isDiscoverable: Boolean(summary.isDiscoverable),
        pinnedAnnouncementTitle: announcement.title || "",
        pinnedAnnouncementBody: announcement.body || "",
        pinnedAnnouncementCtaLabel: announcement.ctaLabel || "",
        pinnedAnnouncementCtaUrl: announcement.ctaUrl || "",
      });
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [slug]);

  const setupChecklist = useMemo(() => {
    return [
      Boolean(form.brandHeadline || form.bannerUrl || form.avatarUrl),
      Boolean(form.description),
      Boolean(form.onboardingMessage),
      Boolean(form.featuredPerks.trim()),
      Boolean(form.pinnedAnnouncementTitle || form.pinnedAnnouncementBody),
      Boolean(form.transparencyNote),
    ];
  }, [form]);

  const completedCount = setupChecklist.filter(Boolean).length;

  function updateField(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSave(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await updateCommunitySettings(slug, {
        description: form.description,
        bannerUrl: form.bannerUrl,
        avatarUrl: form.avatarUrl,
        brandHeadline: form.brandHeadline,
        accentColor: form.accentColor,
        themeVibe: form.themeVibe,
        backgroundColor: form.backgroundColor,
        panelColor: form.panelColor,
        textColor: form.textColor,
        featuredPerks: form.featuredPerks
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        onboardingMessage: form.onboardingMessage,
        transparencyNote: form.transparencyNote,
        charter: form.charter,
        requireCharterAck: form.requireCharterAck,
        isPublicFeed: form.isPublicFeed,
        isDiscoverable: form.isDiscoverable,
        pinnedAnnouncement: {
          title: form.pinnedAnnouncementTitle,
          body: form.pinnedAnnouncementBody,
          ctaLabel: form.pinnedAnnouncementCtaLabel,
          ctaUrl: form.pinnedAnnouncementCtaUrl,
        },
      });

      setMessage("Community settings updated.");
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <p className="text-slate-400">Loading settings...</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
                Community setup
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-100">
                Landing & Branding Settings
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Shape how your community feels to new members and returning supporters.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate(`/communities/${slug}`)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Preview community
              </button>
              <button
                onClick={() => navigate(`/communities/${slug}/analytics`)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90"
              >
                Back to owner dashboard
              </button>
            </div>
          </div>
        </section>

        {error ? <p className="text-red-300">{error}</p> : null}
        {message ? <p className="text-emerald-300">{message}</p> : null}

        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <form onSubmit={handleSave} className="space-y-6">
            <FieldGroup
              label="Brand identity"
              description="This is the first impression of your community."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={form.brandHeadline}
                  onChange={(e) => updateField("brandHeadline", e.target.value)}
                  placeholder="Brand headline"
                  className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none"
                />
                <input
                  value={form.accentColor}
                  onChange={(e) => updateField("accentColor", e.target.value)}
                  placeholder="Accent color"
                  className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none"
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <input
                  value={form.bannerUrl}
                  onChange={(e) => updateField("bannerUrl", e.target.value)}
                  placeholder="Banner URL"
                  className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none"
                />
                <input
                  value={form.avatarUrl}
                  onChange={(e) => updateField("avatarUrl", e.target.value)}
                  placeholder="Avatar URL"
                  className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none"
                />
              </div>

              <textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Community description"
                className="mt-4 min-h-32 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none"
              />
            </FieldGroup>

            <FieldGroup
              label="Welcome experience"
              description="Help new members understand the vibe and what to do first."
            >
              <textarea
                value={form.onboardingMessage}
                onChange={(e) => updateField("onboardingMessage", e.target.value)}
                placeholder="Welcome message"
                className="min-h-32 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none"
              />
            </FieldGroup>

            <FieldGroup
              label="Featured perks"
              description="One perk per line. These make joining and upgrading feel more valuable."
            >
              <textarea
                value={form.featuredPerks}
                onChange={(e) => updateField("featuredPerks", e.target.value)}
                placeholder={`Members-only channels\nCreator updates\nPremium behind-the-scenes access`}
                className="min-h-32 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none"
              />
            </FieldGroup>

            <FieldGroup
              label="Pinned announcement"
              description="Use this for launches, reminders, promos, or important updates."
            >
              <div className="grid gap-4">
                <input
                  value={form.pinnedAnnouncementTitle}
                  onChange={(e) => updateField("pinnedAnnouncementTitle", e.target.value)}
                  placeholder="Announcement title"
                  className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none"
                />
                <textarea
                  value={form.pinnedAnnouncementBody}
                  onChange={(e) => updateField("pinnedAnnouncementBody", e.target.value)}
                  placeholder="Announcement body"
                  className="min-h-28 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    value={form.pinnedAnnouncementCtaLabel}
                    onChange={(e) => updateField("pinnedAnnouncementCtaLabel", e.target.value)}
                    placeholder="CTA label"
                    className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none"
                  />
                  <input
                    value={form.pinnedAnnouncementCtaUrl}
                    onChange={(e) => updateField("pinnedAnnouncementCtaUrl", e.target.value)}
                    placeholder="CTA URL"
                    className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none"
                  />
                </div>
              </div>
            </FieldGroup>

            <FieldGroup
              label="Transparency & community trust"
              description="Use these to make the space feel intentional and creator-led."
            >
              <textarea
                value={form.transparencyNote}
                onChange={(e) => updateField("transparencyNote", e.target.value)}
                placeholder="Transparency note"
                className="min-h-28 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none"
              />

              <textarea
                value={form.charter}
                onChange={(e) => updateField("charter", e.target.value)}
                placeholder="Community charter"
                className="mt-4 min-h-32 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none"
              />

              <label className="mt-4 flex items-center gap-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={form.requireCharterAck}
                  onChange={(e) => updateField("requireCharterAck", e.target.checked)}
                />
                Require members to acknowledge the charter
              </label>
            </FieldGroup>

            <FieldGroup
              label="Visibility"
              description="Control how open and shareable the community feels from the outside."
            >
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.isDiscoverable}
                    onChange={(e) => updateField("isDiscoverable", e.target.checked)}
                  />
                  Show this community in discovery
                </label>

                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.isPublicFeed}
                    onChange={(e) => updateField("isPublicFeed", e.target.checked)}
                  />
                  Allow a public post preview
                </label>
              </div>
            </FieldGroup>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save settings"}
              </button>

              <button
                type="button"
                onClick={() => navigate(`/communities/${slug}`)}
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm text-slate-200 hover:bg-slate-800"
              >
                Back to community
              </button>
            </div>
          </form>

          <aside className="space-y-6">
            <ProgressCard completeCount={completedCount} total={6} />

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="text-lg font-semibold text-slate-100">Setup guidance</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-400">
                <p>• A strong headline makes the community feel intentional.</p>
                <p>• A welcome note improves activation for new members.</p>
                <p>• Featured perks improve join and upgrade conversion.</p>
                <p>• A pinned announcement gives the page immediate direction.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="text-lg font-semibold text-slate-100">Preview checklist</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <p>{form.brandHeadline ? "✓" : "•"} Brand headline</p>
                <p>{form.description ? "✓" : "•"} Description</p>
                <p>{form.onboardingMessage ? "✓" : "•"} Welcome note</p>
                <p>{form.featuredPerks.trim() ? "✓" : "•"} Featured perks</p>
                <p>
                  {form.pinnedAnnouncementTitle || form.pinnedAnnouncementBody ? "✓" : "•"} Pinned announcement
                </p>
                <p>{form.transparencyNote ? "✓" : "•"} Transparency note</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
} 