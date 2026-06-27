const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { createUploader } = require("../middleware/upload");
const { uploadSingle } = require("../controllers/uploads.controller");

const uploader = createUploader();

router.post(
  "/uploads/:kind",
  requireAuth,
  uploader.single("file"),
  uploadSingle
);

module.exports = router;  