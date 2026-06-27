import { useEffect, useState } from "react";
import { listTiers } from "../../api/tiers";
import TierCard from "./TierCard";

export default function TierList({ slug }) {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTiers() {
      try {
        setLoading(true);
        setError("");

        const data = await listTiers(slug);
        setTiers(data.tiers || []);
      } catch (err) {
        setError(
          err?.response?.data?.error?.message ||
            err.message ||
            "Failed to load tiers"
        );
      } finally {
        setLoading(false);
      }
    }

    loadTiers();
  }, [slug]);

  if (loading) {
    return <p className="text-sm text-slate-400">Loading tiers...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-300">{error}</p>;
  }

  if (tiers.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
        No tiers available yet.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {tiers.map((tier) => (
        <TierCard key={tier._id} slug={slug} tier={tier} />
      ))}
    </div>
  );
} 