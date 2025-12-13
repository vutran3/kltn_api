const router = require("express").Router();
const upload = require("../config/multer.config");
const ctrl = require("../controllers/product.controller");
const asyncHandler = require("../helpers/asyncHandler");
const auth = require("../middleware/auth.middleware");

router.post("/", auth, upload.single("file"), asyncHandler(ctrl.createProduct));
router.get("/", auth, asyncHandler(ctrl.listProducts));
router.get("/:id", asyncHandler(ctrl.getProductById));
router.get("/:productId/info", ctrl.getProductInfo);
router.get("/:productId/readings", ctrl.getProductReadings);
router.get("/:productId/logs", ctrl.getProductLogs);
router.get("/:productId/ai", ctrl.getProductAI);
router.get("/:productId/care-logs", ctrl.getProductCareLogs);
router.get("/get-name/:deviceId", asyncHandler(ctrl.getProductByDeviceId));
router.patch("/:id", auth, upload.single("file"), asyncHandler(ctrl.updateProduct));
router.delete("/:id", asyncHandler(ctrl.deleteProduct));

module.exports = router;
