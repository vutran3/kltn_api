const router = require("express").Router();
const upload = require("../config/multer.config");
const ProductHistoryController = require("../controllers/productHistory.controller");
const asyncHandler = require("../helpers/asyncHandler");
const auth = require("../middleware/auth.middleware");

router.get("/", auth, asyncHandler(ProductHistoryController.getListHistory));
router.post("/", auth, upload.single("file"), asyncHandler(ProductHistoryController.createHistory));
router.patch("/:historyId", auth, upload.single("file"), asyncHandler(ProductHistoryController.updateHistory));
router.delete("/:historyId", auth, asyncHandler(ProductHistoryController.deleteHistory));

module.exports = router;
