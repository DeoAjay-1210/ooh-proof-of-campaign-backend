const express = require("express");

const {
  sendAdminOtp,
  verifyAdminOtp,
  registerStaff,
  getAdminProfile,
  getAllStaff
} = require("../controllers/admin.controller");

const { protect, allowRoles } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/send-otp", sendAdminOtp);
router.post("/verify-otp", verifyAdminOtp);

router.get("/profile", protect, allowRoles("admin"), getAdminProfile);

router.post("/staff/register", protect, allowRoles("admin"), registerStaff);
router.get("/staff", protect, allowRoles("admin"), getAllStaff);

module.exports = router;