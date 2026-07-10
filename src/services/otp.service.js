const bcrypt = require("bcryptjs");

const Otp = require("../models/otp.model");
const { sendOtpSms } = require("./sms.service");

const isProduction = () => {
  return String(process.env.NODE_ENV || "").trim().toLowerCase() === "production";
};

const generateOtpCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const createAndSendOtp = async ({ mobileNumber, userType, metadata = {} }) => {
  const otp = generateOtpCode();

  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(otp, salt);

  const expiryMinutes = Number(process.env.OTP_EXPIRES_MINUTES) || 5;

  await Otp.updateMany(
    {
      mobileNumber,
      userType,
      isUsed: false
    },
    {
      isUsed: true
    }
  );

  const otpRecord = await Otp.create({
    mobileNumber,
    userType,
    otpHash,
    expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
    metadata
  });

  try {
    /*
      Register and login flows both call only this function.
      This function handles real SMS in production and testing OTP in non-production.
    */

      if(process.env.MESSAGE_SEND == "true")
      {
        await sendOtpSms({ mobileNumber, otp });
      }
   
  } catch (error) {
    /*
      If SMS fails in production, do not leave a usable OTP in database.
      This avoids a user being asked to enter an OTP they never received.
    */
    otpRecord.isUsed = true;
    await otpRecord.save();

    throw error;
  }

  const response = {
    expiresInMinutes: expiryMinutes,
    otpForTesting : otp
  };

  if (!isProduction()) {
    response.otpForTesting = otp;
  }

  return response;
};

const verifyOtpCode = async ({ mobileNumber, userType, otp }) => {
  const otpRecord = await Otp.findOne({
    mobileNumber,
    userType,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    return {
      success: false,
      message: "OTP expired or not found",
      metadata: null
    };
  }

  if (otpRecord.attempts >= 5) {
    otpRecord.isUsed = true;
    await otpRecord.save();

    return {
      success: false,
      message: "Maximum OTP attempts exceeded",
      metadata: null
    };
  }

  const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);

  if (!isMatch) {
    otpRecord.attempts += 1;
    await otpRecord.save();

    return {
      success: false,
      message: "Invalid OTP",
      metadata: null
    };
  }

  const metadata = otpRecord.metadata || {};

  otpRecord.isUsed = true;
  await otpRecord.save();

  return {
    success: true,
    message: "OTP verified successfully",
    metadata
  };
};

module.exports = {
  createAndSendOtp,
  verifyOtpCode
};
