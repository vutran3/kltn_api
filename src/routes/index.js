const router = require("express").Router();

router.use("/health-check", require("./healthcheck.routes"));
router.use("/readings", require("./readings.routes"));
router.use("/devices", require("./devices.route"));
router.use("/products", require("./products.route"));
router.use("/fields", require("./fields.route"));

module.exports = router;
