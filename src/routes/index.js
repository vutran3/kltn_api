const router = require("express").Router();

router.use("/health-check", require("./healthcheck.routes"));
router.use("/readings", require("./readings.routes"));
router.use("/devices", require("./devices.routes"));
router.use("/products", require("./products.routes"));
router.use("/fields", require("./fields.routes"));
router.use("/notification", require("./notification.routes"));
router.use("/users", require("./user.routes"));
router.use("/device-control", require("./schedule.routes"));
module.exports = router;
