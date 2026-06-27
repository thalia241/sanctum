// src/sockets/access.js
const Channel = require("../models/Channel");
const Membership = require("../models/Membership");
const Ban = require("../models/Ban");
const CommunitySettings = require("../models/CommunitySettings");
const MemberRole = require("../models/MemberRole"); 

/**
 * Ensures the user can access a channel:
 * - Channel exists
 * - User is not banned from the channel's community
 * - User is a member of the community
 * - If required, user has acknowledged the community charter
 * - If channel has allowedRoleIds, user must have at least one of those roles
 *   (owner/mod bypass role gates)
 *
 * Returns: { channel, membership, settings }
 * Throws: Error with a user-friendly message
 */
async function ensureCanAccessChannel({ userId, channelId }) {
  const channel = await Channel.findById(channelId).lean();
  if (!channel) throw new Error("Channel not found");

  // Ban check (enforced across REST + sockets)
  const ban = await Ban.findOne({ userId, communityId: channel.communityId }).lean();
  if (ban) throw new Error("You are banned from this community");

  // Must be a community member
  const membership = await Membership.findOne({
    userId,
    communityId: channel.communityId,
  }).lean();

  if (!membership) throw new Error("Not a member of this community");

  // Optional: Charter acknowledgment gate
  const settings = await CommunitySettings.findOne({ communityId: channel.communityId }).lean();
  if (settings?.requireCharterAck && !membership.acknowledgedCharterAt) {
    throw new Error("Charter acknowledgment required");
  }

  // Channel schema should include: allowedRoleIds: [ObjectId]
  const allowedRoleIds = Array.isArray(channel.allowedRoleIds) ? channel.allowedRoleIds : [];

  // If the channel is role-gated, enforce it (owner/mod bypass)
  if (allowedRoleIds.length > 0) {
    const powerRole = membership.role; // "owner" | "mod" | "member" (your existing enum)

    if (powerRole !== "owner" && powerRole !== "mod") {
      // Fetch user's access roles in this community
      const memberRoles = await MemberRole.find({
        userId,
        communityId: channel.communityId,
      }).lean();

      const userRoleIds = new Set(memberRoles.map((r) => String(r.roleId)));

      const hasAccess = allowedRoleIds.some((rid) => userRoleIds.has(String(rid)));

      if (!hasAccess) {
        throw new Error("This channel requires a role you don't have");
      }
    }
  }

  return { channel, membership, settings };
}

module.exports = { ensureCanAccessChannel };