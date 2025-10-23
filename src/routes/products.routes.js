const router = require("express").Router();
const ctrl = require("../controllers/product.controller");
const asyncHandler = require("../helpers/asyncHandler");
const auth = require("../middleware/auth.middleware");

router.post("/", asyncHandler(ctrl.createProduct));
router.get("/", auth, asyncHandler(ctrl.listProducts));
router.get("/:id", asyncHandler(ctrl.getProductById));
router.get("/get-name/:deviceId", asyncHandler(ctrl.getProductByDeviceId));
router.patch("/:id", asyncHandler(ctrl.updateProduct));
router.delete("/:id", asyncHandler(ctrl.deleteProduct));

module.exports = router;
