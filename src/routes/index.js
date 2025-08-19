const router = require("express").Router();
const iotRoutes = require("./iot.routes");

router.use("/api", iotRoutes);

module.exports = router;
