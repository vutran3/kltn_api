const express = require("express");
const router = express.Router();
const asyncHandler = require("../helpers/asyncHandler");
const authController = require("../controllers/auth.controller");
const auth = require("../middleware/auth.middleware");

router.post("/login", asyncHandler(authController.login));
router.post("/register", asyncHandler(authController.register));
router.get("/get-me", auth, asyncHandler(authController.getMe));
module.exports = router;
