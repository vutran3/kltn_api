const router = require("express").Router();
const iotRoutes = require("./v1/iot.routes");

router.use("/api", iotRoutes);

module.exports = router;
