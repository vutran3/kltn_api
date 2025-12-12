const router = require("express").Router();

router.use("/auth", require("./auth.routes"));
router.use("/health-check", require("./healthcheck.routes"));
router.use("/readings", require("./readings.routes"));
router.use("/devices", require("./devices.routes"));
router.use("/products", require("./products.routes"));
router.use("/fields", require("./fields.routes"));
router.use("/notification", require("./notification.routes"));
router.use("/users", require("./user.routes"));
router.use("/device-control", require("./schedule.routes"));
router.use("/soil-advisor", require("./soilAdvisor.routes"));
router.use("/rag", require("./rag.routes"));
router.use("/product-history", require("./productHistory.route"));
module.exports = router;
