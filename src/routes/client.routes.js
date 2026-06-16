const express = require("express");

const {
  sendClientRegisterOtp,
  verifyClientRegisterOtp,
  sendClientLoginOtp,
  verifyClientLoginOtp,
  getClientProfile
} = require("../controllers/client.controller");

const { protect, allowRoles } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/register/send-otp", sendClientRegisterOtp);
router.post("/register/verify-otp", verifyClientRegisterOtp);

router.post("/login/send-otp", sendClientLoginOtp);
router.post("/login/verify-otp", verifyClientLoginOtp);

router.get(
  "/profile",
  protect,
  allowRoles("client"),
  getClientProfile
);

module.exports = router;
