// src/controllers/billing.controller.js
const asyncHandler = require("../utils/asyncHandler");
const env = require("../config/env");

const BillingCustomer = require("../models/BillingCustomer");
const CommunityPlan = require("../models/CommunityPlan");
const StripeEvent = require("../models/StripeEvent");

// ✅ Phase 2 Part F
const { upsertSubscriptionFromStripe } = require("./subscriptions.controller");

function getStripe() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured. Missing STRIPE_SECRET_KEY in .env");
  }

  const Stripe = require("stripe");
  return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
}

function priceForPlan(plan) {
  if (plan === "pro") return env.STRIPE_PRICE_PRO;
  if (plan === "studio") return env.STRIPE_PRICE_STUDIO;
  return null;
}

async function getOrCreateStripeCustomer(stripe, user) {
  const existing = await BillingCustomer.findOne({ userId: user.sub }).lean();
  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  const customer = await stripe.customers.create({
    metadata: {
      userId: String(user.sub),
      username: user.username || "",
    },
  });

  await BillingCustomer.create({
    userId: user.sub,
    stripeCustomerId: customer.id,
  });

  return customer.id;
}

// POST /api/communities/:slug/billing/checkout
// body: { plan: "pro" | "studio" }
const createCommunityPlanCheckout = asyncHandler(async (req, res) => {
  const stripe = getStripe();
  const communityId = req.community._id;
  const { plan } = req.body;

  const priceId = priceForPlan(plan);
  if (!priceId) {
    return res.status(400).json({ error: { message: "Invalid plan" } });
  }

  if (!env.BILLING_SUCCESS_URL || !env.BILLING_CANCEL_URL) {
    return res.status(500).json({
      error: { message: "Missing BILLING_SUCCESS_URL or BILLING_CANCEL_URL in .env" },
    });
  }

  const customerId = await getOrCreateStripeCustomer(stripe, req.user);

  await CommunityPlan.updateOne(
    { communityId },
    { $setOnInsert: { communityId, plan: "free", status: "none" } },
    { upsert: true }
  );

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${env.BILLING_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: env.BILLING_CANCEL_URL,
    client_reference_id: String(communityId),
    metadata: {
      type: "community_plan",
      communityId: String(communityId),
      userId: String(req.user.sub),
      plan,
    },
    subscription_data: {
      metadata: {
        type: "community_plan",
        communityId: String(communityId),
        userId: String(req.user.sub),
        plan,
      },
    },
  });

  res.json({ ok: true, url: session.url });
});

// POST /api/billing/portal
const createBillingPortal = asyncHandler(async (req, res) => {
  const stripe = getStripe();

  const returnUrl = env.BILLING_SUCCESS_URL || env.CLIENT_ORIGIN;
  const customerId = await getOrCreateStripeCustomer(stripe, req.user);

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  res.json({ ok: true, url: portal.url });
});

// GET /api/communities/:slug/billing/status
const getCommunityBillingStatus = asyncHandler(async (req, res) => {
  const communityId = req.community._id;

  const planDoc =
    (await CommunityPlan.findOne({ communityId }).lean()) || {
      plan: "free",
      status: "none",
      currentPeriodEnd: null,
    };

  res.json({
    ok: true,
    plan: planDoc.plan,
    status: planDoc.status,
    currentPeriodEnd: planDoc.currentPeriodEnd,
    stripeSubscriptionId: planDoc.stripeSubscriptionId || null,
  });
});

// Internal helper for Phase 1 community billing
async function upsertCommunityPlanFromSubscription(subscription) {
  const metadata = subscription.metadata || {};
  const type = metadata.type || "community_plan";

  // Ignore tier/member subscriptions here
  if (type !== "community_plan") return;

  const communityId = metadata.communityId;
  const plan = metadata.plan;

  if (!communityId) {
    // Fallback: update by Stripe subscription id if metadata is missing
    await CommunityPlan.updateOne(
      { stripeSubscriptionId: subscription.id },
      {
        $set: {
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null,
        },
      }
    );
    return;
  }

  await CommunityPlan.updateOne(
    { communityId },
    {
      $set: {
        plan: plan || "pro",
        status: subscription.status,
        stripeSubscriptionId: subscription.id,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
      },
    },
    { upsert: true }
  );
}

// POST /api/billing/webhook
const stripeWebhook = asyncHandler(async (req, res) => {
  const stripe = getStripe();

  if (!env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({
      error: { message: "Missing STRIPE_WEBHOOK_SECRET in .env" },
    });
  }

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotency
  const alreadyProcessed = await StripeEvent.findOne({ eventId: event.id }).lean();
  if (alreadyProcessed) {
    return res.json({ received: true });
  }

  await StripeEvent.create({
    eventId: event.id,
    type: event.type,
    created: event.created,
  });

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;

      if (session.mode === "subscription" && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);

        // ✅ Phase 1: community plan updates
        await upsertCommunityPlanFromSubscription(subscription);

        // ✅ Phase 2: member tier subscription updates + role granting
        await upsertSubscriptionFromStripe(subscription);
      }

      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;

      // ✅ Phase 1: community plan updates
      await upsertCommunityPlanFromSubscription(subscription);

      // ✅ Phase 2: member tier subscription updates + role granting/removal
      await upsertSubscriptionFromStripe(subscription);

      break;
    }

    default:
      break;
  }

  res.json({ received: true });
});

module.exports = {
  createCommunityPlanCheckout,
  createBillingPortal,
  stripeWebhook,
  getCommunityBillingStatus,
}; 