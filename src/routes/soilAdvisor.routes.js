const router = require("express").Router();
const { advise } = require("../controllers/soilAdvisor.controller");

router.post("/", advise);

module.exports = router;
