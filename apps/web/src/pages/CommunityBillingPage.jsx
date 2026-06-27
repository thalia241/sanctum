import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import {
  createBillingPortal,
  createCommunityPlanCheckout,
  getCommunityBillingStatus,
} from "../api/billing";

function PlanCard({
  title,
  price,
  description,
  features,
  current,
  loading,
  onChoose,
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        current
          ? "border-slate-300 bg-slate-100 text-slate-950"
          : "border-slate-800 bg-slate-900 text-slate-100"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className={`mt-2 text-sm ${current ? "text-slate-700" : "text-slate-400"}`}>
            {description}
          </p>
        </div>

        {current ? (
          <span className="rounded-full border border-slate-400 px-3 py-1 text-xs font-medium">
            Current
          </span>
        ) : null}
      </div>

      <div className="mb-4 text-3xl font-semibold">{price}</div>

      <ul className="mb-6 space-y-2 text-sm">
        {features.map((feature) => (
          <li key={feature}>• {feature}</li>
        ))}
      </ul>

      <button
        onClick={onChoose}
        disabled={loading || current}
        className={`rounded-lg px-4 py-2 font-medium ${
          current
            ? "bg-slate-300 text-slate-700"
            : "bg-slate-100 text-slate-950 hover:opacity-90 disabled:opacity-50"
        }`}
      >
        {current ? "Current Plan" : loading ? "Redirecting..." : `Choose ${title}`}
      </button>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status || "none").toLowerCase();

  let classes = "border-slate-700 bg-slate-900 text-slate-300";
  if (normalized === "active" || normalized === "trialing") {
    classes = "border-green-800 bg-green-950 text-green-200";
  } else if (normalized === "past_due" || normalized === "unpaid") {
    classes = "border-yellow-800 bg-yellow-950 text-yellow-200";
  } else if (normalized === "canceled") {
    classes = "border-red-800 bg-red-950 text-red-200";
  }

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${classes}`}>
      {status || "none"}
    </span>
  );
}

export default function CommunityBillingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const data = await getCommunityBillingStatus(slug);
        setBilling(data);
      } catch (err) {
        setError(
          err?.response?.data?.error?.message ||
            err.message ||
            "Failed to load billing status"
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  async function handleChoosePlan(plan) {
    try {
      setCheckoutLoading(plan);
      setError("");

      const data = await createCommunityPlanCheckout(slug, plan);
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
      setCheckoutLoading("");
    }
  }

  async function handleOpenPortal() {
    try {
      setPortalLoading(true);
      setError("");

      const data = await createBillingPortal();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      setError("Billing portal URL was not returned.");
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
          err.message ||
          "Failed to open billing portal"
      );
    } finally {
      setPortalLoading(false);
    }
  }

  const currentPlan = billing?.plan || "free";
  const currentStatus = billing?.status || "none";

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Community Billing</h1>
            <p className="mt-2 text-sm text-slate-400">
              Manage your community’s Free, Pro, or Studio plan.
            </p>
          </div>

          <button
            onClick={() => navigate(`/communities/${slug}`)}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
          >
            Back to Community
          </button>
        </div>

        {loading ? <p className="text-slate-400">Loading billing status...</p> : null}

        {error ? (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {!loading && billing ? (
          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Current Plan</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Plan: <span className="font-medium text-slate-200">{currentPlan}</span>
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Status: <StatusBadge status={currentStatus} />
                </p>
                {billing.currentPeriodEnd ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Current period ends: {new Date(billing.currentPeriodEnd).toLocaleString()}
                  </p>
                ) : null}
              </div>

              <button
                onClick={handleOpenPortal}
                disabled={portalLoading}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
              >
                {portalLoading ? "Opening..." : "Open Billing Portal"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          <PlanCard
            title="Free"
            price="$0"
            description="Best for getting started."
            features={[
              "Up to 10 channels",
              "Basic community tools",
              "No custom branding",
            ]}
            current={currentPlan === "free"}
            loading={false}
            onChoose={() => {}}
          />

          <PlanCard
            title="Pro"
            price="$25/mo"
            description="For growing creator communities."
            features={[
              "Up to 50 channels",
              "Basic analytics",
              "Custom branding",
            ]}
            current={currentPlan === "pro"}
            loading={checkoutLoading === "pro"}
            onChoose={() => handleChoosePlan("pro")}
          />

          <PlanCard
            title="Studio"
            price="$79/mo"
            description="For serious communities and teams."
            features={[
              "Up to 200 channels",
              "Advanced analytics",
              "Custom branding",
            ]}
            current={currentPlan === "studio"}
            loading={checkoutLoading === "studio"}
            onChoose={() => handleChoosePlan("studio")}
          />
        </div>
      </div>
    </AppShell>
  );
} 