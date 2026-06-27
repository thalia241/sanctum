// src/validators/billing.validators.js
const { z } = require("zod");

const checkoutSchema = z.object({
  body: z.object({
    plan: z.enum(["pro", "studio"]),
  }),
  params: z.object({
    slug: z.string().min(2),
  }),
});

module.exports = { checkoutSchema };