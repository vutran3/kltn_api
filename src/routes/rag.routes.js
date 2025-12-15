const router = require("express").Router();
const upload = require("../config/multer.config");
const ragControllers = require("../controllers/rag.controllers");
const auth = require("../middleware/auth.middleware");

router.get("/history", auth, ragControllers.getDeviceHistory);
router.get("/:id", ragControllers.getRagDetail);
router.put("/:id/feedback", ragControllers.submitExpertFeedback);
router.post("/request-expert", auth, ragControllers.requestExpertHelp);
router.post("/manual-detect", auth, upload.single("file"), ragControllers.sendQuestion);
router.post("/image", auth, upload.single("file"), ragControllers.uploadSingleImage);

router.delete("/history/:id", auth, ragControllers.deleteHistoryItem);
router.delete("/history", auth, ragControllers.clearDeviceHistory);

module.exports = router;
