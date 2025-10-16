const express = require("express");
const router = express.Router();
const asyncHandler = require("../helpers/asyncHandler");
const scheduleController = require("../controllers/schedule.controller");

router.get("/", asyncHandler(scheduleController.getDeviceControl));
router.put("/", asyncHandler(scheduleController.updateDeviceControl));

module.exports = router;
