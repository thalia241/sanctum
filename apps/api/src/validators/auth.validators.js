const { z } = require("zod");

const registerSchema = z.object({
  body: z.object({
    username: z.string().min(2).max(32).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, underscore"),
    email: z.string().email().max(255),
    password: z.string().min(8).max(72),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
    password: z.string().min(8).max(72),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

module.exports = { registerSchema, loginSchema };