const { z } = require("zod");

const deleteMessageSchema = z.object({
  body: z.object({
    reason: z.string().max(280).optional(),
  }).optional(),
  params: z.object({
    messageId: z.string().min(1),
  }),
  query: z.object({}).optional(),
});

const banUserSchema = z.object({
  body: z.object({
    targetUserId: z.string().min(1),
    reason: z.string().max(280).optional(),
  }),
  params: z.object({
    slug: z.string().min(2).max(80),
  }),
  query: z.object({}).optional(),
});

const unbanUserSchema = z.object({
  body: z.object({
    targetUserId: z.string().min(1),
    reason: z.string().max(280).optional(),
  }),
  params: z.object({
    slug: z.string().min(2).max(80),
  }),
  query: z.object({}).optional(),
});

const listBansSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    slug: z.string().min(2).max(80),
  }),
  query: z
    .object({
      limit: z.string().optional(),
      cursor: z.string().optional(), // ISO date string
      q: z.string().optional(),
    })
    .optional(),
});

const listLogsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    slug: z.string().min(2).max(80),
  }),
  query: z
    .object({
      limit: z.string().optional(),
      cursor: z.string().optional(),       // ISO date
      actionType: z.string().optional(),   // validate lightly here; enforce more in controller if you want
      performedBy: z.string().optional(),  // userId
      targetUserId: z.string().optional(), // userId
    })
    .optional(),
}); 

const roleTargetSchema = z.object({
  body: z.object({
    targetUserId: z.string().min(1),
    reason: z.string().max(280).optional(),
  }),
  params: z.object({
    slug: z.string().min(2).max(80),
  }),
  query: z.object({}).optional(),
}); 

module.exports = { deleteMessageSchema, banUserSchema, unbanUserSchema, listBansSchema, listLogsSchema, roleTargetSchema };    