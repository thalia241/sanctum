const { z } = require("zod");

const createCommunitySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80),
    description: z.string().max(280).optional(),
    // Optional: allow custom slug; if omitted, we generate from name.
    slug: z
      .string()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase and hyphen-separated")
      .optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

const slugParamSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    slug: z.string().min(2).max(80),
  }),
  query: z.object({}).optional(),
});

const membersListSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    slug: z.string().min(2).max(80),
  }),
  query: z
    .object({
      limit: z.string().optional(),
      cursor: z.string().optional(), // ISO date cursor for pagination
    })
    .optional(),
});

const leaveCommunitySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    slug: z.string().min(2).max(80),
  }),
  query: z.object({}).optional(),
});

module.exports = { createCommunitySchema, slugParamSchema, membersListSchema, leaveCommunitySchema }; 