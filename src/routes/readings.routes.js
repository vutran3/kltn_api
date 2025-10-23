const router = require("express").Router();
const iotController = require("../controllers/reading.controller");

router.post("/", iotController.collectReadingData);
router.get("/", iotController.getReadingData);
router.get("/last", iotController.getLatestReadingData);

module.exports = router;
