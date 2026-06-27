const router = require("express").Router();
const { loadCommunityBySlug } = require("../middleware/communityAccess");
const {
  listDiscoverableCommunities,
  getPublicCommunityProfile,
} = require("../controllers/discovery.controller");

router.get("/discovery/communities", listDiscoverableCommunities);

router.get("/communities/:slug/public", loadCommunityBySlug, getPublicCommunityProfile);

module.exports = router; 