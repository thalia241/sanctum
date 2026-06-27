const { z } = require("zod");

const createInviteSchema = z.object({
  body: z.object({
    channelId: z.string().optional(),
    maxUses: z.number().int().min(1).max(100000).optional(),
    expiresAt: z.string().optional(), // ISO string
  }),
  params: z.object({
    slug: z.string().min(2).max(80),
  }),
  query: z.object({}).optional(),
});

const listInvitesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    slug: z.string().min(2).max(80),
  }),
  query: z.object({}).optional(),
});

const revokeInviteSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    code: z.string().min(4).max(64),
  }),
  query: z.object({}).optional(),
});

const joinInviteSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    code: z.string().min(4).max(64),
  }),
  query: z.object({}).optional(),
});

const previewInviteSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    code: z.string().min(4).max(64),
  }),
  query: z.object({}).optional(),
});

module.exports = { createInviteSchema, listInvitesSchema, revokeInviteSchema, joinInviteSchema, previewInviteSchema };  