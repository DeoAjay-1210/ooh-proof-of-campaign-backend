const User = require("../models/user.model");
const generateToken = require("../utils/generateToken");
const { createAndSendOtp, verifyOtpCode } = require("../services/otp.service");
const { successResponse, errorResponse } = require("../utils/response");

const sendStaffOtp = async (req, res, next) => {
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      return errorResponse(res, "Mobile number is required", null, 400);
    }

    const staff = await User.findOne({
      mobileNumber,
      userType: "staff"
    });

    if (!staff) {
      return errorResponse(
        res,
        "Staff not registered. Please contact admin.",
        null,
        404
      );
    }

    if (staff.status !== "active") {
      return errorResponse(res, `Staff account is ${staff.status}`, null, 403);
    }

    const otpData = await createAndSendOtp({
      mobileNumber,
      userType: "staff"
    });

    return successResponse(res, "OTP sent successfully", otpData, 200);
  } catch (error) {
    next(error);
  }
};

const verifyStaffOtp = async (req, res, next) => {
  try {
    const { mobileNumber, otp } = req.body;

    if (!mobileNumber || !otp) {
      return errorResponse(res, "Mobile number and OTP are required", null, 400);
    }

    const staff = await User.findOne({
      mobileNumber,
      userType: "staff"
    });

    if (!staff) {
      return errorResponse(res, "Staff not found", null, 404);
    }

    const otpResult = await verifyOtpCode({
      mobileNumber,
      userType: "staff",
      otp
    });

    if (!otpResult.success) {
      return errorResponse(res, otpResult.message, null, 400);
    }

    staff.lastLoginAt = new Date();
    await staff.save();

    return successResponse(
      res,
      "Staff login successful",
      {
        user: staff.toSafeObject(),
        token: generateToken(staff)
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

const getStaffProfile = async (req, res) => {
  return successResponse(
    res,
    "Staff profile fetched successfully",
    {
      user: req.user.toSafeObject()
    },
    200
  );
};

module.exports = {
  sendStaffOtp,
  verifyStaffOtp,
  getStaffProfile
};