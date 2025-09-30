const router = require("express").Router();
const ctrl = require("../controllers/field.controller");
const asyncHandler = require("../helpers/asyncHandler");

router.post("/", asyncHandler(ctrl.createField));
router.get("/", asyncHandler(ctrl.listFields));
router.get("/:id", asyncHandler(ctrl.getFieldById));
router.patch("/:id", asyncHandler(ctrl.updateField));
router.delete("/:id", asyncHandler(ctrl.deleteField));
router.patch("/:id/active", asyncHandler(ctrl.setActive));

module.exports = router;
