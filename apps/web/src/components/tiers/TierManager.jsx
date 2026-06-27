import { useEffect, useMemo, useState } from "react";
import { createTier, listTiers } from "../../api/tiers";
import { listRoles } from "../../api/roles";

function ExistingTierCard({ tier, rolesMap }) {
  const linkedRoleNames = (tier.roleIds || []).map(
    (id) => rolesMap.get(String(id)) || "Unknown role"
  );

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-2 flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-slate-100">{tier.name}</h3>
        <span className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-400">
          {tier.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {tier.monthlyPriceLabel ? (
        <p className="mb-2 text-sm font-medium text-violet-300">
          {tier.monthlyPriceLabel}
        </p>
      ) : null}

      {tier.description ? (
        <p className="mb-3 text-sm text-slate-300">{tier.description}</p>
      ) : (
        <p className="mb-3 text-sm text-slate-500">No description</p>
      )}

      {tier.highlightText ? (
        <div className="mb-3 rounded-xl border border-violet-800/50 bg-violet-950/30 px-3 py-2 text-sm text-violet-200">
          {tier.highlightText}
        </div>
      ) : null}

      {(tier.perks || []).length > 0 ? (
        <div className="mb-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Perks
          </div>
          <ul className="space-y-1 text-sm text-slate-300">
            {tier.perks.map((perk, index) => (
              <li key={`${perk}-${index}`} className="flex gap-2">
                <span className="text-violet-300">•</span>
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2 text-xs text-slate-400">
        <div>
          <span className="font-medium text-slate-300">Stripe Price ID:</span>{" "}
          {tier.stripePriceId || "—"}
        </div>

        <div>
          <span className="font-medium text-slate-300">Roles:</span>{" "}
          {linkedRoleNames.length ? linkedRoleNames.join(", ") : "No roles linked"}
        </div>

        <div>
          <span className="font-medium text-slate-300">Created:</span>{" "}
          {tier.createdAt ? new Date(tier.createdAt).toLocaleString() : "—"}
        </div>
      </div>
    </div>
  );
}

export default function TierManager({ slug }) {
  const [tiers, setTiers] = useState([]);
  const [roles, setRoles] = useState([]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    stripePriceId: "",
    monthlyPriceLabel: "",
    highlightText: "",
    perks: ["", "", "", ""],
    roleIds: [],
  });

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const rolesMap = useMemo(() => {
    return new Map(roles.map((role) => [String(role._id), role.name]));
  }, [roles]);

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      const [tiersData, rolesData] = await Promise.all([
        listTiers(slug),
        listRoles(slug),
      ]);

      setTiers(tiersData.tiers || []);
      setRoles(rolesData.roles || []);
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
          err.message ||
          "Failed to load tier manager data"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [slug]);

  function updateField(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function updatePerk(index, value) {
    setForm((prev) => ({
      ...prev,
      perks: prev.perks.map((perk, i) => (i === index ? value : perk)),
    }));
  }

  function toggleRole(roleId) {
    setForm((prev) => {
      const exists = prev.roleIds.includes(roleId);
      return {
        ...prev,
        roleIds: exists
          ? prev.roleIds.filter((id) => id !== roleId)
          : [...prev.roleIds, roleId],
      };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      stripePriceId: form.stripePriceId.trim(),
      monthlyPriceLabel: form.monthlyPriceLabel.trim(),
      highlightText: form.highlightText.trim(),
      perks: form.perks.map((perk) => perk.trim()).filter(Boolean),
      roleIds: form.roleIds,
    };

    if (!payload.name || !payload.stripePriceId) {
      setError("Name and Stripe Price ID are required.");
      return;
    }

    try {
      setCreating(true);
      setError("");
      setSuccess("");

      const data = await createTier(slug, payload);
      const newTier = data.tier || data;

      setTiers((prev) => [newTier, ...prev]);
      setForm({
        name: "",
        description: "",
        stripePriceId: "",
        monthlyPriceLabel: "",
        highlightText: "",
        perks: ["", "", "", ""],
        roleIds: [],
      });
      setSuccess("Tier created successfully.");
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
          err.message ||
          "Failed to create tier"
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-xl font-semibold">Create Tier</h2>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 rounded-lg border border-green-800 bg-green-950 px-3 py-2 text-sm text-green-200">
            {success}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Tier Name</label>
            <input
              name="name"
              value={form.name}
              onChange={updateField}
              placeholder="VIP"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
              maxLength={120}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={updateField}
              placeholder="Premium access to exclusive channels and content."
              className="min-h-[100px] w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Price Label</label>
              <input
                name="monthlyPriceLabel"
                value={form.monthlyPriceLabel}
                onChange={updateField}
                placeholder="$5 / month"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Highlight Text</label>
              <input
                name="highlightText"
                value={form.highlightText}
                onChange={updateField}
                placeholder="Best for core supporters"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Tier Perks</label>
            <div className="grid gap-3 md:grid-cols-2">
              {form.perks.map((perk, index) => (
                <input
                  key={index}
                  value={perk}
                  onChange={(e) => updatePerk(index, e.target.value)}
                  placeholder={`Perk ${index + 1}`}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Stripe Price ID</label>
            <input
              name="stripePriceId"
              value={form.stripePriceId}
              onChange={updateField}
              placeholder="price_123..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              Use the recurring Stripe price ID for this membership tier.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Roles granted by this tier
            </label>

            {roles.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                No community roles found. Create roles first so this tier can unlock
                access.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {roles.map((role) => (
                  <label
                    key={role._id}
                    className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3"
                  >
                    <input
                      type="checkbox"
                      checked={form.roleIds.includes(role._id)}
                      onChange={() => toggleRole(role._id)}
                    />
                    <div>
                      <div className="text-sm font-medium text-slate-100">
                        {role.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {role.isPaidRole ? "Paid role" : "Standard role"}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Tier"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Existing Tiers</h2>

          <button
            onClick={loadAll}
            disabled={loading}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {loading ? <p className="text-sm text-slate-400">Loading tiers...</p> : null}

        {!loading && tiers.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
            No tiers created yet.
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {tiers.map((tier) => (
            <ExistingTierCard key={tier._id} tier={tier} rolesMap={rolesMap} />
          ))}
        </div>
      </div>
    </div>
  );
}  