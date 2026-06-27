import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(e) {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl"
      >
        <h1 className="mb-6 text-2xl font-semibold">Login</h1>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <label className="mb-2 block text-sm">Email</label>
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={updateField}
          className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
          required
        />

        <label className="mb-2 block text-sm">Password</label>
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={updateField}
          className="mb-6 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="mt-4 text-sm text-slate-400">
          Need an account?{" "}
          <Link to="/register" className="text-slate-100 underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
} 