const sendOtpSms = async ({ mobileNumber, otp }) => {
  console.log("--------------------------------");
  console.log(`OTP for ${mobileNumber}: ${otp}`);
  console.log("--------------------------------");

  return true;
};

module.exports = {
  sendOtpSms
};