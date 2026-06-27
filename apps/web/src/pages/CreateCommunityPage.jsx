import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import { createCommunity } from "../api/communities";

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function CreateCommunityPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    slug: "",
  });
  const [autoSlug, setAutoSlug] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(e) {
    const name = e.target.value;

    setForm((prev) => ({
      ...prev,
      name,
      slug: autoSlug ? slugify(name) : prev.slug,
    }));
  }

  function handleSlugChange(e) {
    setAutoSlug(false);
    setForm((prev) => ({
      ...prev,
      slug: slugify(e.target.value),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await createCommunity({
        name: form.name.trim(),
        slug: form.slug.trim(),
      });

      const community = data.community || data;
      navigate(`/communities/${community.slug}`);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || "Failed to create community");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-semibold">Create Community</h1>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          {error ? (
            <div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <label className="mb-2 block text-sm">Community Name</label>
          <input
            value={form.name}
            onChange={handleNameChange}
            placeholder="Sanctum Creators"
            className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
            required
          />

          <label className="mb-2 block text-sm">Slug</label>
          <input
            value={form.slug}
            onChange={handleSlugChange}
            placeholder="sanctum-creators"
            className="mb-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
            required
          />

          <p className="mb-6 text-xs text-slate-400">
            This becomes the community URL.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Community"}
          </button>
        </form>
      </div>
    </AppShell>
  );
} 