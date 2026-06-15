const User = require("../models/user.model");
const generateToken = require("../utils/generateToken");
const { createAndSendOtp, verifyOtpCode } = require("../services/otp.service");
const { successResponse, errorResponse } = require("../utils/response");

const sendAdminOtp = async (req, res, next) => {
  try {
    const { mobileNumber } = req.body;

    if (!mobileNumber) {
      return errorResponse(res, "Mobile number is required", null, 400);
    }

    const admin = await User.findOne({
      mobileNumber,
      userType: "admin"
    });

    if (!admin) {
      return errorResponse(res, "Admin not found", null, 404);
    }

    if (admin.status !== "active") {
      return errorResponse(res, `Admin account is ${admin.status}`, null, 403);
    }

    const otpData = await createAndSendOtp({
      mobileNumber,
      userType: "admin"
    });

    return successResponse(res, "OTP sent successfully", otpData, 200);
  } catch (error) {
    next(error);
  }
};

const verifyAdminOtp = async (req, res, next) => {
  try {
    const { mobileNumber, otp } = req.body;

    if (!mobileNumber || !otp) {
      return errorResponse(res, "Mobile number and OTP are required", null, 400);
    }

    const admin = await User.findOne({
      mobileNumber,
      userType: "admin"
    });

    if (!admin) {
      return errorResponse(res, "Admin not found", null, 404);
    }

    const otpResult = await verifyOtpCode({
      mobileNumber,
      userType: "admin",
      otp
    });

    if (!otpResult.success) {
      return errorResponse(res, otpResult.message, null, 400);
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    return successResponse(
      res,
      "Admin login successful",
      {
        user: admin.toSafeObject(),
        token: generateToken(admin)
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

const registerStaff = async (req, res, next) => {
  try {
    const { fullName, mobileNumber, email } = req.body;

    if (!fullName || !mobileNumber) {
      return errorResponse(res, "Full name and mobile number are required", null, 400);
    }

    const existingUser = await User.findOne({ mobileNumber });

    if (existingUser) {
      return errorResponse(res, "This mobile number already exists", null, 409);
    }

    const staff = await User.create({
      fullName,
      mobileNumber,
      email,
      userType: "staff",
      status: "active",
      createdBy: req.user._id
    });

    return successResponse(
      res,
      "Staff registered successfully",
      {
        user: staff.toSafeObject()
      },
      201
    );
  } catch (error) {
    next(error);
  }
};

const getAdminProfile = async (req, res) => {
  return successResponse(
    res,
    "Admin profile fetched successfully",
    {
      user: req.user.toSafeObject()
    },
    200
  );
};

const getAllStaff = async (req, res, next) => {
  try {
    const staffList = await User.find({
      userType: "staff"
    }).sort({ createdAt: -1 });

    return successResponse(
      res,
      "Staff list fetched successfully",
      {
        count: staffList.length,
        staff: staffList.map((staff) => staff.toSafeObject())
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendAdminOtp,
  verifyAdminOtp,
  registerStaff,
  getAdminProfile,
  getAllStaff
};