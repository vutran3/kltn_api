const express = require("express");
const router = express.Router();
const asyncHandler = require("../helpers/asyncHandler");
const deviceController = require("../controllers/device.controller");
const auth = require("../middleware/auth.middleware");

router.use(auth);

router.post("/", asyncHandler(deviceController.createDevice));

router.get("/", asyncHandler(deviceController.listDevices));
router.get("/my", asyncHandler(deviceController.myDevices));
router.get("/unassigned", auth, asyncHandler(deviceController.unassignedDevices));
router.get("/:id", asyncHandler(deviceController.getDeviceById));
router.get("/by-device-id/:deviceId", asyncHandler(deviceController.getDeviceByDeviceId));

router.patch("/:id", asyncHandler(deviceController.updateDevice));
router.patch("/:id/active", asyncHandler(deviceController.setActive));

router.delete("/:id", asyncHandler(deviceController.deleteDevice));

module.exports = router;
