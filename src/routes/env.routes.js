const router = require("express").Router();
const { advise } = require("../controllers/soilAdvisor.controller");
const auth = require("../middleware/auth.middleware");

router.post("/", auth, advise);

module.exports = router;
