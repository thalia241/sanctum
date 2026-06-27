const { z } = require("zod");

const getMessagesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    channelId: z.string().min(1),
  }),
  query: z.object({
    limit: z.string().optional(),
    before: z.string().optional(), // ISO timestamp
  }).optional(),
});

module.exports = { getMessagesSchema };