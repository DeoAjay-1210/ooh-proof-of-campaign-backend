const https = require("https");

const isProduction = () => {
  return String(process.env.NODE_ENV || "").trim().toLowerCase() === "production";
};

const cleanMobileNumber = (mobileNumber) => {
  return String(mobileNumber || "").replace(/\D/g, "").trim();
};

const formatIndianMobileNumber = (mobileNumber) => {
  const digits = cleanMobileNumber(mobileNumber);

  if (/^[6-9]\d{9}$/.test(digits)) {
    return `91${digits}`;
  }

  if (/^91[6-9]\d{9}$/.test(digits)) {
    return digits;
  }

  return digits;
};

const buildOtpMessage = ({ otp }) => {
  /*
    IMPORTANT:
    In production DLT SMS, this text must match the template registered
    against NETTYFISH_TEMPLATE_ID.

    Optional env:
    NETTYFISH_OTP_MESSAGE_TEMPLATE=Welcome to ADINN. Your Brand Activation Code is {{otp}}. Use it to verify your brand owner account. Valid for 5 minutes.
  */
  const template = String(process.env.NETTYFISH_OTP_MESSAGE_TEMPLATE || "").trim();

  if (template) {
    return template
      .replace(/{{otp}}/g, otp)
      .replace(/{otp}/g, otp)
      .replace(/#OTP#/g, otp);
  }

  return `Welcome to Adinn Outdoors! Your verification code is ${otp}. Use this OTP to complete your verification. Please don't share it with anyone.`;
};

const requestUrl = (url) => {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let responseBody = "";

      res.on("data", (chunk) => {
        responseBody += chunk;
      });

      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          body: responseBody,
        });
      });
    });

    req.on("error", reject);

    req.setTimeout(20000, () => {
      req.destroy(new Error("SMS request timed out"));
    });
  });
};

const parseNettyfishBody = (body) => {
  const responseText = String(body || "").trim();

  if (!responseText) {
    return {
      raw: "",
      json: null,
    };
  }

  try {
    return {
      raw: responseText,
      json: JSON.parse(responseText),
    };
  } catch (_) {
    return {
      raw: responseText,
      json: null,
    };
  }
};

const isNettyfishSuccess = ({ statusCode, parsedBody }) => {
  if (statusCode < 200 || statusCode >= 300) {
    return false;
  }

  const responseJson = parsedBody.json;

  if (responseJson) {
    const errorCode = String(responseJson.ErrorCode || "").trim();
    const errorMessage = String(responseJson.ErrorMessage || "").trim().toLowerCase();
    const messageData = Array.isArray(responseJson.MessageData)
      ? responseJson.MessageData
      : [];

    if (errorCode === "000") {
      return true;
    }

    if (
      errorMessage === "done" &&
      messageData.some((item) => item && item.MessageId)
    ) {
      return true;
    }

    return false;
  }

  const raw = parsedBody.raw.toLowerCase();

  if (raw.includes("done") || raw.includes("success")) {
    return true;
  }

  return false;
};

const sendOtpSms = async ({ mobileNumber, otp }) => {
  if (!mobileNumber || !otp) {
    throw new Error("Mobile number and OTP are required to send SMS");
  }

  /*
    Development / local:
    Do not call SMS provider. OTP will be returned by otp.service.js
    through otpForTesting.
  */
  if (!isProduction()) {
    return {
      skipped: true,
      provider: "nettyfish",
      reason: "NODE_ENV is not production",
    };
  }

  const NETTYFISH_API_KEY = String(process.env.NETTYFISH_API_KEY || "").trim();
  const NETTYFISH_SENDER_ID = String(process.env.NETTYFISH_SENDER_ID || "").trim();
  const NETTYFISH_TEMPLATE_ID = String(process.env.NETTYFISH_TEMPLATE_ID || "").trim();

  if (!NETTYFISH_API_KEY || !NETTYFISH_SENDER_ID || !NETTYFISH_TEMPLATE_ID) {
    throw new Error(
      "Nettyfish SMS configuration missing. Check NETTYFISH_API_KEY, NETTYFISH_SENDER_ID and NETTYFISH_TEMPLATE_ID"
    );
  }

  const formattedNumber = formatIndianMobileNumber(mobileNumber);

  if (!/^91[6-9]\d{9}$/.test(formattedNumber)) {
    throw new Error("Invalid Indian mobile number for SMS");
  }

  const message = buildOtpMessage({ otp });

  const apiUrl =
    `https://retailsms.nettyfish.com/api/mt/SendSMS` +
    `?APIKey=${encodeURIComponent(NETTYFISH_API_KEY)}` +
    `&senderid=${encodeURIComponent(NETTYFISH_SENDER_ID)}` +
    `&channel=Trans` +
    `&DCS=0` +
    `&flashsms=0` +
    `&number=${encodeURIComponent(formattedNumber)}` +
    `&dlttemplateid=${encodeURIComponent(NETTYFISH_TEMPLATE_ID)}` +
    `&text=${encodeURIComponent(message)}` +
    `&route=17`;

  const response = await requestUrl(apiUrl);
  const parsedBody = parseNettyfishBody(response.body);

  const success = isNettyfishSuccess({
    statusCode: response.statusCode,
    parsedBody,
  });

  if (!success) {
    throw new Error(
      `Nettyfish SMS failed with status ${response.statusCode}: ${parsedBody.raw}`
    );
  }

  const responseJson = parsedBody.json || {};
  const messageData = Array.isArray(responseJson.MessageData)
    ? responseJson.MessageData
    : [];

  return {
    skipped: false,
    provider: "nettyfish",
    statusCode: response.statusCode,
    errorCode: responseJson.ErrorCode || null,
    errorMessage: responseJson.ErrorMessage || null,
    jobId: responseJson.JobId || null,
    messageId: messageData[0]?.MessageId || null,
    number: messageData[0]?.Number || formattedNumber,
    response: parsedBody.raw,
  };
};

module.exports = {
  sendOtpSms,
};