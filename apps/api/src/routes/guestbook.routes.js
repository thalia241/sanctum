const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const {
  listGuestbookEntries,
  createGuestbookEntry,
  deleteGuestbookEntry,
  togglePinGuestbookEntry,
} = require("../controllers/guestbook.controller");

router.get("/users/:username/guestbook", requireAuth, listGuestbookEntries);
router.post("/users/:username/guestbook", requireAuth, createGuestbookEntry);
router.delete("/guestbook/:entryId", requireAuth, deleteGuestbookEntry);
router.patch("/guestbook/:entryId/pin", requireAuth, togglePinGuestbookEntry);

module.exports = router; 