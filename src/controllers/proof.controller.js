const mongoose = require("mongoose");

const Hoarding = require("../models/hoarding.model");
const Proof = require("../models/proof.model");

const {
  uploadImageToDigitalOcean,
} = require("../services/digitalOceanUpload.service");
const { successResponse, errorResponse } = require("../utils/response");

const isValidLatitude = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num >= -90 && num <= 90;
};

const isValidLongitude = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num >= -180 && num <= 180;
};

const uploadHoardingProof = async (req, res, next) => {
  try {
    const { hoardingId } = req.params;
    const { latitude, longitude, address } = req.body;

    const cleanedAddress = String(address || "").trim();

    if (!mongoose.Types.ObjectId.isValid(hoardingId)) {
      return errorResponse(res, "Invalid hoarding id", null, 400);
    }

    if (!req.file) {
      return errorResponse(
        res,
        "Proof image is required. Use form-data key: proofImage",
        null,
        400,
      );
    }

    if (!isValidLatitude(latitude)) {
      return errorResponse(res, "Valid latitude is required", null, 400);
    }

    if (!isValidLongitude(longitude)) {
      return errorResponse(res, "Valid longitude is required", null, 400);
    }

    if (cleanedAddress && cleanedAddress.length > 500) {
      return errorResponse(
        res,
        "Address should not exceed 500 characters",
        null,
        400,
      );
    }

    const hoarding = await Hoarding.findById(hoardingId);

    if (!hoarding) {
      return errorResponse(res, "Hoarding not found", null, 404);
    }

    const uploadedImage = await uploadImageToDigitalOcean({
      file: req.file,
      folder: `hoarding-proofs/${hoardingId}`,
    });

    const proof = await Proof.create({
      hoardingId,
      imageUrl: uploadedImage.imageUrl,
      cloudKey: uploadedImage.cloudKey,
      latitude: Number(latitude),
      longitude: Number(longitude),
      address: cleanedAddress || "",
      capturedAt: new Date(),
      uploadedBy: req.user._id,
      uploadedByType: req.user.userType,
    });

    return successResponse(
      res,
      "Proof photo uploaded successfully",
      {
        proof: {
          id: proof._id,
          hoardingId: proof.hoardingId,
          imageUrl: proof.imageUrl,
          latitude: proof.latitude,
          longitude: proof.longitude,
          address: proof.address,
          capturedAt: proof.capturedAt,
          uploadedBy: {
            id: req.user._id,
            fullName: req.user.fullName,
            userType: req.user.userType,
          },
        },
      },
      201,
    );
  } catch (error) {
    if (error.message && error.message.includes("File too large")) {
      return errorResponse(res, "Image size should not exceed 3MB", null, 400);
    }

    next(error);
  }
};

const isValidDateFormat = (date) => {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
};

const getTodayDateInIST = () => {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(now);
};

const getISTDateRange = (dateString) => {
  const startDate = new Date(`${dateString}T00:00:00.000+05:30`);
  const endDate = new Date(`${dateString}T23:59:59.999+05:30`);

  return {
    startDate,
    endDate,
  };
};

const formatTimeInIST = (date) => {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const hour = parts.find((part) => part.type === "hour")?.value || "00";
  const minute = parts.find((part) => part.type === "minute")?.value || "00";
  const dayPeriod =
    parts.find((part) => part.type === "dayPeriod")?.value || "AM";

  const suffix = dayPeriod.toLowerCase() === "am" ? "Am" : "Pm";

  return `${hour}:${minute}${suffix}`;
};

const formatFullTimeInIST = (date) => {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const hour = parts.find((part) => part.type === "hour")?.value || "00";
  const minute = parts.find((part) => part.type === "minute")?.value || "00";
  const second = parts.find((part) => part.type === "second")?.value || "00";
  const dayPeriod =
    parts.find((part) => part.type === "dayPeriod")?.value || "AM";

  const suffix = dayPeriod.toLowerCase() === "am" ? "Am" : "Pm";

  return `${hour}:${minute}:${second}${suffix}`;
};

const getCampaignProofs = async (req, res, next) => {
  try {
    const { date, hoardingId } = req.query;

    const selectedDate = date || getTodayDateInIST();

    if (!isValidDateFormat(selectedDate)) {
      return errorResponse(res, "Date must be in YYYY-MM-DD format", null, 400);
    }

    if (hoardingId && !mongoose.Types.ObjectId.isValid(hoardingId)) {
      return errorResponse(res, "Invalid hoarding id", null, 400);
    }

    const { startDate, endDate } = getISTDateRange(selectedDate);

    const proofQuery = {
      capturedAt: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    if (hoardingId) {
      proofQuery.hoardingId = hoardingId;
    }

    if (hoardingId) {
      const hoardingExists = await Hoarding.findById(hoardingId).lean();

      if (!hoardingExists) {
        return errorResponse(res, "Hoarding not found", null, 404);
      }
    }

    const proofs = await Proof.find(proofQuery)
      .populate({
        path: "hoardingId",
        populate: [
          {
            path: "createdBy",
            select: "fullName mobileNumber userType",
          },
          {
            path: "updatedBy",
            select: "fullName mobileNumber userType",
          },
          {
            path: "uploadBatchId",
          },
        ],
      })
      .populate("uploadedBy", "fullName mobileNumber userType")
      .sort({ capturedAt: 1 })
      .lean();

    const groupedByHoarding = {};

    proofs.forEach((proof) => {
      if (!proof.hoardingId) return;

      const hoardingObjectId = String(proof.hoardingId._id);

      if (!groupedByHoarding[hoardingObjectId]) {
        groupedByHoarding[hoardingObjectId] = {
          ...proof.hoardingId,
          campaignProof: {
            [selectedDate]: [],
          },
        };
      }

      groupedByHoarding[hoardingObjectId].campaignProof[selectedDate].push({
        proofId: proof._id,
        hoardingObjectId: proof.hoardingId._id,
        imageUrl: proof.imageUrl,
        latitude: proof.latitude,
        longitude: proof.longitude,
        address: proof.address || "",
        capturedAt: proof.capturedAt,
        capturedDate: selectedDate,
        capturedTime: formatTimeInIST(proof.capturedAt),
        capturedTimeWithSeconds: formatFullTimeInIST(proof.capturedAt),
        uploadedBy: proof.uploadedBy
          ? {
              id: proof.uploadedBy._id,
              fullName: proof.uploadedBy.fullName,
              mobileNumber: proof.uploadedBy.mobileNumber,
              userType: proof.uploadedBy.userType,
            }
          : null,
      });
    });

    let hoardingDetails = Object.values(groupedByHoarding);

    /*
      If hoardingId is passed but no proof images are available for selected date,
      still return that hoarding full details with empty campaignProof array.
    */
    if (hoardingId && hoardingDetails.length === 0) {
      const hoarding = await Hoarding.findById(hoardingId)
        .populate("createdBy", "fullName mobileNumber userType")
        .populate("updatedBy", "fullName mobileNumber userType")
        .populate("uploadBatchId")
        .lean();

      hoardingDetails = [
        {
          ...hoarding,
          campaignProof: {
            [selectedDate]: [],
          },
        },
      ];
    }
    /////////////////add dashboard data/////////////////////////
    const todayDate = getTodayDateInIST();
    const { startDate: todayStartDate, endDate: todayEndDate } =
      getISTDateRange(todayDate);

    const [
      overallCapturedImagesToday,
      sitesUpdatedTodayIds,
      overallSitesCount,
    ] = await Promise.all([
      Proof.countDocuments({
        capturedAt: {
          $gte: todayStartDate,
          $lte: todayEndDate,
        },
      }),

      Proof.distinct("hoardingId", {
        capturedAt: {
          $gte: todayStartDate,
          $lte: todayEndDate,
        },
        hoardingId: { $ne: null },
      }),

      Hoarding.countDocuments({}),
    ]);

    const sitesUpdatedTodayCount =
      overallSitesCount === 0
        ? 0
        : overallSitesCount && Array.isArray(sitesUpdatedTodayIds)
          ? sitesUpdatedTodayIds.length
          : 0;
    //////////////////add dashboard data////////////////////////

    return successResponse(
      res,
      "Campaign proofs fetched successfully",
      {
        selectedDate,
        hoardingId: hoardingId || null,
        totalHoardings: hoardingDetails.length,
        totalProofImages: proofs.length,
        overallSummary: {
          todayDate,
          overallCapturedImagesToday,
          sitesUpdatedTodayCount,
          overallSitesCount,
        },

        hoardingDetails,
      },
      200,
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadHoardingProof,
  getCampaignProofs,
};
