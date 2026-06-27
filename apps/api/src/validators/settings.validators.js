const { z } = require("zod");

const slugParam = z.object({ slug: z.string().min(2).max(80) });

const upsertSettingsSchema = z.object({
  params: slugParam,
  body: z.object({
    charterMarkdown: z.string().max(20000).optional(),
    transparencyMode: z.enum(["mods_only", "members", "public"]).optional(),
    requireCharterAck: z.boolean().optional(),
    spoilerPolicy: z.enum(["optional", "required"]).optional(),
    lfgEnabled: z.boolean().optional(),
    bookClubMode: z.boolean().optional(),
    rules: z
      .array(
        z.object({
          title: z.string().min(1).max(80),
          details: z.string().max(800).optional(),
          severity: z.enum(["low", "medium", "high"]).optional(),
          tags: z.array(z.string().min(1).max(32)).optional(),
        })
      )
      .max(100)
      .optional(),
  }),
  query: z.object({}).optional(),
});

const getSettingsSchema = z.object({
  params: slugParam,
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

const ackCharterSchema = z.object({
  params: slugParam,
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

module.exports = { upsertSettingsSchema, getSettingsSchema, ackCharterSchema }; 