const router = require("express").Router();
const { authLimiter } = require("../middleware/rateLimit");
const validate = require("../middleware/validate");
const { registerSchema, loginSchema } = require("../validators/auth.validators");
const authController = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth");

router.post("/register", authLimiter, validate(registerSchema), authController.register);
router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.get("/me", requireAuth, authController.me);

module.exports = router;