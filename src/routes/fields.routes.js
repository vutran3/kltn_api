const router = require("express").Router();
const ctrl = require("../controllers/field.controller");
const asyncHandler = require("../helpers/asyncHandler");
const auth = require("../middleware/auth.middleware");

router.use(auth);

router.post("/", asyncHandler(ctrl.createField));

router.get("/", asyncHandler(ctrl.listFields));
router.get("/:id", asyncHandler(ctrl.getFieldById));

router.patch("/:id", asyncHandler(ctrl.updateField));
router.patch("/:id/active", asyncHandler(ctrl.setActive));

router.delete("/:id", asyncHandler(ctrl.deleteField));

module.exports = router;
