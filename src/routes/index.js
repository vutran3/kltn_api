const router = require("express").Router();
const iotRoutes = require("./iot.routes");

router.use("/health-check", require('./healthcheck.routes'))
router.use("/", iotRoutes);
module.exports = router;
