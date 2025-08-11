const router = require("express").Router();
const iotController = require("../../controllers/iot.controller");
const { validateReading } = require("../../middleware/iot.middleware");

router.post("/v1/readings", validateReading, iotController.collectReadingData);

router.get("/v1/readings", iotController.getReadingData);

router.get("/v1/readings/last", iotController.getLatestReadingData);

module.exports = router;
