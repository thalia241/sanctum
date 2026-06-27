// src/utils/entitlements.js
function getEntitlementsForPlan(plan) {
  switch (plan) {
    case "studio":
      return { maxChannels: 200, analytics: "advanced", customBranding: true };
    case "pro":
      return { maxChannels: 50, analytics: "basic", customBranding: true };
    case "free":
    default:
      return { maxChannels: 10, analytics: "none", customBranding: false };
  }
}

module.exports = { getEntitlementsForPlan };