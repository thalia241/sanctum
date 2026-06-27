const { z } = require("zod");

const createChannelSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(50),
  }),
  params: z.object({
    slug: z.string().min(2).max(80),
  }),
  query: z.object({}).optional(),
});

const listChannelsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    slug: z.string().min(2).max(80),
  }),
  query: z.object({}).optional(),
});

module.exports = { createChannelSchema, listChannelsSchema };