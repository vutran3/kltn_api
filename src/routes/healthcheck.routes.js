const express = require("express");
const router = express.Router();
const healthCheckController = require("../controllers/healthcheck.controller");
const asyncHandler = require("../helpers/asyncHandler");

router.get("/results", asyncHandler(healthCheckController.findAllResult));
router.post(
    "/weekly-image",
    express.raw({ type: "image/jpeg", limit: "20mb" }),
    asyncHandler(healthCheckController.collectImageWeekly)
);
router.get("/get/:hcid", asyncHandler(healthCheckController.findRecordById));
router.put("/feedback/:hcid", asyncHandler(healthCheckController.updateExpertFeedback));
module.exports = router;
