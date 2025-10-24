const router = require("express").Router();
const upload = require("../config/multer.config");
const ragControllers = require("../controllers/rag.controllers");

router.post("/manual-detect", upload.single("file"), ragControllers.sendQuestion);

router.post("/image", upload.single("file"), ragControllers.uploadSingleImage);

module.exports = router;
