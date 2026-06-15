const express = require("express");

const {
  sendStaffOtp,
  verifyStaffOtp,
  getStaffProfile
} = require("../controllers/staff.controller");

const { protect, allowRoles } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/send-otp", sendStaffOtp);
router.post("/verify-otp", verifyStaffOtp);

router.get("/profile", protect, allowRoles("staff"), getStaffProfile);

module.exports = router;