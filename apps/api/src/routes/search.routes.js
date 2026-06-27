const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { loadCommunityBySlug } = require("../middleware/communityAccess");

const {
  searchDiscoverableCommunities,
  searchCommunityPosts,
} = require("../controllers/search.controller");

router.get("/search/communities", searchDiscoverableCommunities);

router.get(
  "/communities/:slug/search/posts",
  requireAuth,
  loadCommunityBySlug,
  searchCommunityPosts
);

module.exports = router; 