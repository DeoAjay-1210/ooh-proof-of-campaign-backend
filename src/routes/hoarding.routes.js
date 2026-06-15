const express = require("express");

const {
  bulkUploadHoardings,
  getHoardingList,
  getHoardingCities,
  getUploadBatchDetails
} = require("../controllers/hoarding.controller");

const { protect, allowRoles } = require("../middlewares/auth.middleware");
const { uploadExcel } = require("../middlewares/upload.middleware");

const router = express.Router();

router.post(
  "/bulk-upload",
  protect,
  allowRoles("admin", "staff"),
  uploadExcel.single("excel"),
  bulkUploadHoardings
);

router.get(
  "/list/:hoardingId?",
  protect,
  allowRoles("admin", "staff", "client"),
  getHoardingList
);
router.get(
  "/cities",
  protect,
  allowRoles("admin", "staff", "client"),
  getHoardingCities
);

router.get(
  "/uploads/:uploadBatchId",
  protect,
  allowRoles("admin", "staff"),
  getUploadBatchDetails
);

module.exports = router;