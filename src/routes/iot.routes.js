const router = require("express").Router();
const iotController = require("../controllers/iot.controller");
// const { validateReading } = require("../middleware/iot.middleware");

router.post("/readings", iotController.collectReadingData);

router.post("/reading-images", iotController.collectReadingData);

router.get("/readings", iotController.getReadingData);

router.get("/readings/last", iotController.getLatestReadingData);

module.exports = router;
