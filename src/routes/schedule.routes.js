const express = require("express");
const router = express.Router();
const asyncHandler = require("../helpers/asyncHandler");
const scheduleController = require("../controllers/schedule.controller");
const auth = require("../middleware/auth.middleware");

router.get("/", asyncHandler(scheduleController.getDeviceControl));
router.put("/", auth, asyncHandler(scheduleController.updateDeviceControl));

module.exports = router;
