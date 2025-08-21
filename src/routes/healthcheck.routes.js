const router = require("express").Router();
const healthCheckController = require("../controllers/healthcheck.controller");
const upload = require('../middleware/multer.middleware')
const asyncHandler = require('../helpers/asyncHandler')

router.get("/results", asyncHandler(healthCheckController.findAllResult))
router.post("/weekly-image", upload.single('image'), asyncHandler(healthCheckController.collectImageWeekly));


module.exports = router;