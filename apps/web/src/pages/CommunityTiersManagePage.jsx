import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import { listTiers, createTier, updateTier } from "../api/tiers";

function TierCard({ tier, onEditToggle, onHighlight }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-100">{tier.name}</h3>
            {tier.isActive ? (
              <span className="rounded-full border border-emerald-700/50 bg-emerald-950/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
                Active
              </span>
            ) : (
              <span className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                Inactive
              </span>
            )}
          </div>

          {tier.monthlyPriceLabel ? (
            <p className="mt-2 text-sm font-medium text-violet-300">{tier.monthlyPriceLabel}</p>
          ) : null}

          {tier.highlightText ? (
            <p className="mt-2 text-sm text-slate-400">{tier.highlightText}</p>
          ) : null}

          {tier.description ? (
            <p className="mt-3 text-sm leading-6 text-slate-300">{tier.description}</p>
          ) : null}

          {(tier.perks || []).length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {tier.perks.map((perk, index) => (
                <span
                  key={`${perk}-${index}`}
                  className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300"
                >
                  {perk}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onEditToggle(tier)}
            className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={() => onHighlight(tier)}
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-950 hover:opacity-90"
          >
            Improve appeal
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CommunityTiersManagePage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [editingTierId, setEditingTierId] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    monthlyPriceLabel: "",
    highlightText: "",
    perks: "",
    isActive: true,
  });

  async function loadTiers() {
    try {
      setLoading(true);
      setError("");

      const data = await listTiers(slug);
      setTiers(data?.tiers || []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to load tiers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTiers();
  }, [slug]);

  const stats = useMemo(() => {
    const activeCount = tiers.filter((tier) => tier.isActive !== false).length;
    const withPerks = tiers.filter((tier) => (tier.perks || []).length > 0).length;
    return {
      total: tiers.length,
      activeCount,
      withPerks,
    };
  }, [tiers]);

  function resetForm() {
    setEditingTierId("");
    setForm({
      name: "",
      description: "",
      monthlyPriceLabel: "",
      highlightText: "",
      perks: "",
      isActive: true,
    });
  }

  function fillFormFromTier(tier) {
    setEditingTierId(tier._id || tier.id);
    setForm({
      name: tier.name || "",
      description: tier.description || "",
      monthlyPriceLabel: tier.monthlyPriceLabel || "",
      highlightText: tier.highlightText || "",
      perks: (tier.perks || []).join("\n"),
      isActive: tier.isActive !== false,
    });
  }

  function updateField(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleHighlightSuggestion(tier) {
    fillFormFromTier(tier);

    if (!tier.highlightText) {
      updateField("highlightText", "Best for your most engaged supporters");
    }

    if (!(tier.perks || []).length) {
      updateField(
        "perks",
        "Exclusive updates\nMembers-only access\nPriority perks"
      );
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = {
        name: form.name,
        description: form.description,
        monthlyPriceLabel: form.monthlyPriceLabel,
        highlightText: form.highlightText,
        perks: form.perks
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        isActive: form.isActive,
      };

      if (editingTierId) {
        await updateTier(slug, editingTierId, payload);
        setMessage("Tier updated.");
      } else {
        await createTier(slug, payload);
        setMessage("Tier created.");
      }

      resetForm();
      await loadTiers();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Failed to save tier");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">
                Monetization
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-100">Manage Tiers</h1>
              <p className="mt-2 text-sm text-slate-400">
                Make your premium structure feel more compelling, valuable, and worth upgrading into.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate(`/communities/${slug}/analytics`)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Back to owner dashboard
              </button>
              <button
                onClick={() => navigate(`/communities/${slug}`)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90"
              >
                Preview community
              </button>
            </div>
          </div>
        </section>

        {error ? <p className="text-red-300">{error}</p> : null}
        {message ? <p className="text-emerald-300">{message}</p> : null}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total tiers</p>
            <p className="mt-2 text-3xl font-bold text-slate-100">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Active tiers</p>
            <p className="mt-2 text-3xl font-bold text-slate-100">{stats.activeCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Perk-ready tiers</p>
            <p className="mt-2 text-3xl font-bold text-slate-100">{stats.withPerks}</p>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold text-slate-100">Your current tier lineup</h2>
              <p className="mt-2 text-sm text-slate-400">
                Clear naming, visible perks, and strong highlight text make tiers feel premium.
              </p>

              <div className="mt-5 space-y-4">
                {loading ? <p className="text-slate-400">Loading tiers...</p> : null}

                {!loading && !tiers.length ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-5">
                    <h3 className="text-lg font-semibold text-slate-100">No tiers yet</h3>
                    <p className="mt-2 text-sm text-slate-400">
                      Start with one simple supporter tier so the community feels monetizable.
                    </p>
                  </div>
                ) : null}

                {tiers.map((tier) => (
                  <TierCard
                    key={tier._id || tier.id}
                    tier={tier}
                    onEditToggle={fillFormFromTier}
                    onHighlight={handleHighlightSuggestion}
                  />
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-6"
            >
              <h2 className="text-xl font-semibold text-slate-100">
                {editingTierId ? "Edit tier" : "Create a tier"}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Strong tiers feel like a real offer, not just a locked area.
              </p>

              <div className="mt-5 space-y-4">
                <input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Tier name"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                />

                <input
                  value={form.monthlyPriceLabel}
                  onChange={(e) => updateField("monthlyPriceLabel", e.target.value)}
                  placeholder="$5/month"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                />

                <input
                  value={form.highlightText}
                  onChange={(e) => updateField("highlightText", e.target.value)}
                  placeholder="Best for your most engaged supporters"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                />

                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Describe what makes this tier worth it"
                  className="min-h-28 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                />

                <textarea
                  value={form.perks}
                  onChange={(e) => updateField("perks", e.target.value)}
                  placeholder={`Exclusive updates\nMembers-only content\nPriority access`}
                  className="min-h-32 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                />

                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => updateField("isActive", e.target.checked)}
                  />
                  Active tier
                </label>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingTierId ? "Update tier" : "Create tier"}
                </button>

                {editingTierId ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </form>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold text-slate-100">Tier guidance</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-400">
                <p>• Give each tier a clear identity, not just a price.</p>
                <p>• Highlight why someone should choose it.</p>
                <p>• Perks should feel visible and emotionally appealing.</p>
                <p>• One strong entry tier is better than several vague ones.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}