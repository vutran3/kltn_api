const express = require("express");
const router = express.Router();
const asyncHandler = require("../helpers/asyncHandler");
const deviceController = require("../controllers/device.controller");

router.post("/", asyncHandler(deviceController.createDevice));

router.get("/", asyncHandler(deviceController.listDevices));
router.get("/:id", asyncHandler(deviceController.getDeviceById));
router.get("/by-device-id/:deviceId", asyncHandler(deviceController.getDeviceByDeviceId));

router.patch("/:id", asyncHandler(deviceController.updateDevice));
router.patch("/:id/active", asyncHandler(deviceController.setActive));

router.delete("/:id", asyncHandler(deviceController.deleteDevice));
// Admin/App → enqueue command
router.post("/pump/commands", asyncHandler(deviceController.enqueueCommand));

// Device firmware → lấy lệnh tiếp theo
router.get("/pump/commands/next", asyncHandler(deviceController.nextCommand));

// Device firmware → báo trạng thái
router.post("/pump/status", asyncHandler(deviceController.postStatus));

// Admin/App → xoá hàng đợi
router.post("/pump/commands/cancel-all", asyncHandler(deviceController.cancelAllCommands));
module.exports = router;
