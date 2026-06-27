const asyncHandler = require("../utils/asyncHandler");
const env = require("../config/env");
const Tier = require("../models/Tier");
const Subscription = require("../models/Subscription");
const MemberRole = require("../models/MemberRole");
const Role = require("../models/Role");
const BillingCustomer = require("../models/BillingCustomer");

function getStripe() {
  if (!env.STRIPE_SECRET_KEY) throw new Error("Missing STRIPE_SECRET_KEY");
  const Stripe = require("stripe");
  return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
}

async function getOrCreateStripeCustomer(stripe, user) {
  const existing = await BillingCustomer.findOne({ userId: user.sub }).lean();
  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  const customer = await stripe.customers.create({
    metadata: { userId: String(user.sub), username: user.username || "" },
  });

  await BillingCustomer.create({ userId: user.sub, stripeCustomerId: customer.id });
  return customer.id;
}

// POST /api/communities/:slug/tiers/:tierId/checkout
const checkoutTier = asyncHandler(async (req, res) => {
  const stripe = getStripe();
  const communityId = req.community._id;
  const tierId = req.params.tierId;

  const tier = await Tier.findOne({ _id: tierId, communityId, isActive: true }).lean();
  if (!tier) return res.status(404).json({ error: { message: "Tier not found" } });

  const customerId = await getOrCreateStripeCustomer(stripe, req.user);

  if (!env.MEMBERSHIP_SUCCESS_URL || !env.MEMBERSHIP_CANCEL_URL) {
    return res.status(500).json({ error: { message: "Missing MEMBERSHIP_SUCCESS_URL or MEMBERSHIP_CANCEL_URL" } });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: tier.stripePriceId, quantity: 1 }],
    success_url: `${env.MEMBERSHIP_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: env.MEMBERSHIP_CANCEL_URL,
    metadata: {
      type: "tier_subscription",
      communityId: String(communityId),
      tierId: String(tierId),
      userId: String(req.user.sub),
    },
    subscription_data: {
      metadata: {
        type: "tier_subscription",
        communityId: String(communityId),
        tierId: String(tierId),
        userId: String(req.user.sub),
      },
    },
  });

  res.json({ ok: true, url: session.url });
});

// Helper: apply tier roles to a user
async function grantTierRoles({ communityId, userId, tierId }) {
  const tier = await Tier.findOne({ _id: tierId, communityId }).lean();
  if (!tier) return;

  const roles = await Role.find({ _id: { $in: tier.roleIds }, communityId }).lean();

  for (const role of roles) {
    await MemberRole.updateOne(
      { communityId, userId, roleId: role._id },
      { $setOnInsert: { communityId, userId, roleId: role._id } },
      { upsert: true }
    );
  }
}

async function revokeTierRoles({ communityId, userId, tierId }) {
  const tier = await Tier.findOne({ _id: tierId, communityId }).lean();
  if (!tier) return;
  if (!tier.roleIds?.length) return;

  await MemberRole.deleteMany({
    communityId,
    userId,
    roleId: { $in: tier.roleIds },
  });
}

// Called by webhook handler when subscription changes
async function upsertSubscriptionFromStripe(subscription) {
  const md = subscription.metadata || {};
  if (md.type !== "tier_subscription") return;

  const communityId = md.communityId;
  const tierId = md.tierId;
  const userId = md.userId;

  if (!communityId || !tierId || !userId) return;

  const status = subscription.status;
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  await Subscription.updateOne(
    { stripeSubscriptionId: subscription.id },
    {
      $set: {
        communityId,
        userId,
        tierId,
        stripeSubscriptionId: subscription.id,
        status,
        currentPeriodEnd,
      },
    },
    { upsert: true }
  );

  const isActive = status === "active" || status === "trialing";

  if (isActive) {
    await grantTierRoles({ communityId, userId, tierId });
  } else {
    // on cancel/past_due/unpaid/etc. remove roles
    await revokeTierRoles({ communityId, userId, tierId });
  }
}

module.exports = { checkoutTier, upsertSubscriptionFromStripe }; 