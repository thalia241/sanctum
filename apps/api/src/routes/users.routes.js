const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const usersController = require("../controllers/users.controller");

router.get("/users/me", requireAuth, usersController.getMyProfile);
router.patch("/users/me", requireAuth, usersController.updateMyProfile);
router.get("/users/search", requireAuth, usersController.searchUsers);
router.get("/users/:username", requireAuth, usersController.getProfileByUsername);

module.exports = router;  