const User = require("../models/user.model");
const generateToken = require("../utils/generateToken");
const { createAndSendOtp, verifyOtpCode } = require("../services/otp.service");
const { successResponse, errorResponse } = require("../utils/response");

const isValidMobileNumber = (mobileNumber) => {
  return /^[6-9]\d{9}$/.test(String(mobileNumber || "").trim());
};

const isValidEmail = (email) => {
  if (!email) return true;
  return /^\S+@\S+\.\S+$/.test(String(email).trim().toLowerCase());
};

const sendClientRegisterOtp = async (req, res, next) => {
  try {
    const { fullName, mobileNumber, email } = req.body;

    const cleanedFullName = String(fullName || "").trim();
    const cleanedMobileNumber = String(mobileNumber || "").trim();
    const cleanedEmail = email ? String(email).trim().toLowerCase() : "";

    if (!cleanedFullName || !cleanedMobileNumber) {
      return errorResponse(
        res,
        "Full name and mobile number are required",
        null,
        400
      );
    }

    if (!isValidMobileNumber(cleanedMobileNumber)) {
      return errorResponse(
        res,
        "Enter a valid 10 digit Indian mobile number",
        null,
        400
      );
    }

    if (!isValidEmail(cleanedEmail)) {
      return errorResponse(
        res,
        "Enter a valid email address",
        null,
        400
      );
    }

    const existingMobileUser = await User.findOne({
      mobileNumber: cleanedMobileNumber
    });

    if (existingMobileUser) {
      if (existingMobileUser.userType === "client") {
        return errorResponse(
          res,
          "Client already registered. Please login.",
          null,
          409
        );
      }

      return errorResponse(
        res,
        "This mobile number is already used by another user",
        null,
        409
      );
    }

    if (cleanedEmail) {
      const existingEmailUser = await User.findOne({
        email: cleanedEmail
      });

      if (existingEmailUser) {
        return errorResponse(
          res,
          "This email address is already registered",
          null,
          409
        );
      }
    }

    const otpData = await createAndSendOtp({
      mobileNumber: cleanedMobileNumber,
      userType: "client",
      metadata: {
        fullName: cleanedFullName,
        email: cleanedEmail
      }
    });

    return successResponse(
      res,
      "OTP sent successfully for client registration",
      otpData,
      200
    );
  } catch (error) {
    next(error);
  }
};

const verifyClientRegisterOtp = async (req, res, next) => {
  try {
    const { mobileNumber, otp } = req.body;

    const cleanedMobileNumber = String(mobileNumber || "").trim();
    const cleanedOtp = String(otp || "").trim();

    if (!cleanedMobileNumber || !cleanedOtp) {
      return errorResponse(
        res,
        "Mobile number and OTP are required",
        null,
        400
      );
    }

    if (!isValidMobileNumber(cleanedMobileNumber)) {
      return errorResponse(
        res,
        "Enter a valid 10 digit Indian mobile number",
        null,
        400
      );
    }

    const existingUser = await User.findOne({
      mobileNumber: cleanedMobileNumber
    });

    if (existingUser) {
      if (existingUser.userType === "client") {
        return errorResponse(
          res,
          "Client already registered. Please login.",
          null,
          409
        );
      }

      return errorResponse(
        res,
        "This mobile number is already used by another user",
        null,
        409
      );
    }

    const otpResult = await verifyOtpCode({
      mobileNumber: cleanedMobileNumber,
      userType: "client",
      otp: cleanedOtp
    });

    if (!otpResult.success) {
      return errorResponse(res, otpResult.message, null, 400);
    }

    const metadata = otpResult.metadata || {};
    const fullName = String(metadata.fullName || "").trim();
    const email = metadata.email ? String(metadata.email).trim().toLowerCase() : "";

    if (!fullName) {
      return errorResponse(
        res,
        "Registration data expired. Please register again.",
        null,
        400
      );
    }

    if (email) {
      const existingEmailUser = await User.findOne({ email });

      if (existingEmailUser) {
        return errorResponse(
          res,
          "This email address is already registered",
          null,
          409
        );
      }
    }

    const client = await User.create({
      fullName,
      mobileNumber: cleanedMobileNumber,
      email,
      userType: "client",
      status: "active"
    });

    client.lastLoginAt = new Date();
    await client.save();

    return successResponse(
      res,
      "Client registered successfully",
      {
        user: client.toSafeObject(),
        token: generateToken(client)
      },
      201
    );
  } catch (error) {
    next(error);
  }
};

const sendClientLoginOtp = async (req, res, next) => {
  try {
    const { mobileNumber } = req.body;

    const cleanedMobileNumber = String(mobileNumber || "").trim();

    if (!cleanedMobileNumber) {
      return errorResponse(
        res,
        "Mobile number is required",
        null,
        400
      );
    }

    if (!isValidMobileNumber(cleanedMobileNumber)) {
      return errorResponse(
        res,
        "Enter a valid 10 digit Indian mobile number",
        null,
        400
      );
    }

    const client = await User.findOne({
      mobileNumber: cleanedMobileNumber,
      userType: "client"
    });

    if (!client) {
      return errorResponse(
        res,
        "Client not registered. Please register first.",
        null,
        404
      );
    }

    if (client.status !== "active") {
      return errorResponse(
        res,
        `Client account is ${client.status}`,
        null,
        403
      );
    }

    const otpData = await createAndSendOtp({
      mobileNumber: cleanedMobileNumber,
      userType: "client"
    });

    return successResponse(
      res,
      "OTP sent successfully for client login",
      otpData,
      200
    );
  } catch (error) {
    next(error);
  }
};

const verifyClientLoginOtp = async (req, res, next) => {
  try {
    const { mobileNumber, otp } = req.body;

    const cleanedMobileNumber = String(mobileNumber || "").trim();
    const cleanedOtp = String(otp || "").trim();

    if (!cleanedMobileNumber || !cleanedOtp) {
      return errorResponse(
        res,
        "Mobile number and OTP are required",
        null,
        400
      );
    }

    if (!isValidMobileNumber(cleanedMobileNumber)) {
      return errorResponse(
        res,
        "Enter a valid 10 digit Indian mobile number",
        null,
        400
      );
    }

    const client = await User.findOne({
      mobileNumber: cleanedMobileNumber,
      userType: "client"
    });

    if (!client) {
      return errorResponse(
        res,
        "Client not found. Please register first.",
        null,
        404
      );
    }

    if (client.status !== "active") {
      return errorResponse(
        res,
        `Client account is ${client.status}`,
        null,
        403
      );
    }

    const otpResult = await verifyOtpCode({
      mobileNumber: cleanedMobileNumber,
      userType: "client",
      otp: cleanedOtp
    });

    if (!otpResult.success) {
      return errorResponse(res, otpResult.message, null, 400);
    }

    client.lastLoginAt = new Date();
    await client.save();

    return successResponse(
      res,
      "Client login successful",
      {
        user: client.toSafeObject(),
        token: generateToken(client)
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

const getClientProfile = async (req, res) => {
  return successResponse(
    res,
    "Client profile fetched successfully",
    {
      user: req.user.toSafeObject()
    },
    200
  );
};

module.exports = {
  sendClientRegisterOtp,
  verifyClientRegisterOtp,
  sendClientLoginOtp,
  verifyClientLoginOtp,
  getClientProfile
};