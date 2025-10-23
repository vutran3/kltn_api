const router = require("express").Router();
const { saveFcmToken } = require("../controllers/usertoken.controller");
const asyncHandler = require("../helpers/asyncHandler");

router.post("/fcm-token", asyncHandler(saveFcmToken));

module.exports = router;
