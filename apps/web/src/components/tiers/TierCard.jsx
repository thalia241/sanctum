import { useState } from "react";
import { checkoutTier } from "../../api/tiers";

export default function TierCard({ slug, tier }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubscribe() {
    try {
      setLoading(true);
      setError("");

      const data = await checkoutTier(slug, tier._id);

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      setError("Checkout URL was not returned.");
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
          err.message ||
          "Failed to start checkout"
      );
    } finally {
      setLoading(false);
    }
  }

  const perks = Array.isArray(tier.perks) ? tier.perks.filter(Boolean) : [];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">{tier.name}</h3>

          {tier.monthlyPriceLabel ? (
            <p className="mt-1 text-sm font-medium text-violet-300">
              {tier.monthlyPriceLabel}
            </p>
          ) : null}

          {tier.description ? (
            <p className="mt-2 text-sm text-slate-300">{tier.description}</p>
          ) : null}
        </div>

        {!tier.isActive ? (
          <span className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-400">
            Inactive
          </span>
        ) : null}
      </div>

      {tier.highlightText ? (
        <div className="mb-4 rounded-xl border border-violet-800/60 bg-violet-950/40 px-3 py-2 text-sm text-violet-200">
          {tier.highlightText}
        </div>
      ) : null}

      {perks.length > 0 ? (
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Includes
          </p>
          <ul className="space-y-2 text-sm text-slate-300">
            {perks.map((perk, index) => (
              <li key={`${perk}-${index}`} className="flex items-start gap-2">
                <span className="mt-0.5 text-violet-300">•</span>
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4">
        <button
          onClick={handleSubscribe}
          disabled={loading || !tier.isActive}
          className="rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Redirecting..." : "Subscribe"}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </div>
  );
}  