const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const {
  listFriends,
  listFriendRequests,
  getFriendshipStatus,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
  updateTopFriends,
} = require("../controllers/friends.controller");

router.get("/friends", requireAuth, listFriends);
router.get("/friends/requests", requireAuth, listFriendRequests);
router.patch("/friends/top", requireAuth, updateTopFriends);

router.get("/users/:username/friendship", requireAuth, getFriendshipStatus);
router.post("/users/:username/friend-request", requireAuth, sendFriendRequest);
router.delete("/users/:username/friend", requireAuth, removeFriend);

router.post("/friend-requests/:requestId/accept", requireAuth, acceptFriendRequest);
router.post("/friend-requests/:requestId/decline", requireAuth, declineFriendRequest);
router.post("/friend-requests/:requestId/cancel", requireAuth, cancelFriendRequest);

module.exports = router; 