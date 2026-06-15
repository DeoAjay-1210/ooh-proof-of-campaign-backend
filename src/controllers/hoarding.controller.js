const fs = require("fs");
const mongoose = require("mongoose");
const Hoarding = require("../models/hoarding.model");
const UploadBatch = require("../models/uploadBatch.model");

const { parseExcelFile } = require("../utils/excelParser.util");
const { createHeaderMapping } = require("../utils/excelHeader.util");
const { successResponse, errorResponse } = require("../utils/response");

const requiredFields = [
  "mediaCode",
  "mediaName",
  "mediaType",
  "city",
  "location",
  "fullAddress",
  "widthFt",
  "heightFt"
];

const allowedStatuses = ["active", "inactive"];

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;

  const cleaned = String(value).replace(/,/g, "").trim();
  const numberValue = Number(cleaned);

  return Number.isFinite(numberValue) ? numberValue : null;
};

const normalizeStatus = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "active";
  }

  const status = String(value).trim().toLowerCase();

  if (!allowedStatuses.includes(status)) {
    return null;
  }

  return status;
};

const escapeRegex = (value) => {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const getCellValue = (row, mappedHeaders, fieldKey) => {
  const actualHeader = mappedHeaders[fieldKey];

  if (!actualHeader) return "";

  return row[actualHeader];
};

const isEmptyRow = (row) => {
  return Object.values(row).every((value) => {
    return value === null || value === undefined || String(value).trim() === "";
  });
};

const buildDynamicFields = (row, dynamicHeaders) => {
  const dynamicFields = {};

  dynamicHeaders.forEach((header) => {
    dynamicFields[header] = row[header];
  });

  return dynamicFields;
};

const validateRequiredHeaders = (mappedHeaders) => {
  return requiredFields.filter((field) => !mappedHeaders[field]);
};

const validateRow = ({ row, rowNumber, mappedHeaders }) => {
  const errors = [];

  const mediaCode = String(getCellValue(row, mappedHeaders, "mediaCode") || "")
    .trim()
    .toUpperCase();

  const mediaName = String(getCellValue(row, mappedHeaders, "mediaName") || "").trim();
  const mediaType = String(getCellValue(row, mappedHeaders, "mediaType") || "").trim();
  const city = String(getCellValue(row, mappedHeaders, "city") || "").trim();
  const location = String(getCellValue(row, mappedHeaders, "location") || "").trim();
  const fullAddress = String(getCellValue(row, mappedHeaders, "fullAddress") || "").trim();

  const widthFt = toNumber(getCellValue(row, mappedHeaders, "widthFt"));
  const heightFt = toNumber(getCellValue(row, mappedHeaders, "heightFt"));
  const totalSqFtFromExcel = toNumber(getCellValue(row, mappedHeaders, "totalSqFt"));

  const statusFromExcel = getCellValue(row, mappedHeaders, "status");
  const status = normalizeStatus(statusFromExcel);

  if (!mediaCode) errors.push("mediaCode is required");
  if (!mediaName) errors.push("mediaName is required");
  if (!mediaType) errors.push("mediaType is required");
  if (!city) errors.push("city is required");
  if (!location) errors.push("location is required");
  if (!fullAddress) errors.push("fullAddress is required");

  if (widthFt === null || widthFt <= 0) {
    errors.push("widthFt must be a valid number greater than 0");
  }

  if (heightFt === null || heightFt <= 0) {
    errors.push("heightFt must be a valid number greater than 0");
  }

  if (!status) {
    errors.push("status must be either active or inactive");
  }

  const totalSqFt =
    totalSqFtFromExcel && totalSqFtFromExcel > 0
      ? totalSqFtFromExcel
      : widthFt && heightFt
        ? widthFt * heightFt
        : null;

  if (!totalSqFt || totalSqFt <= 0) {
    errors.push("totalSqFt could not be calculated");
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalizedData: {
      mediaCode,
      mediaName,
      mediaType,
      city,
      location,
      fullAddress,
      widthFt,
      heightFt,
      totalSqFt,
      status: status || "active"
    },
    rowNumber
  };
};

const buildHoardingFilterQuery = ({ city, mediaType, search, status }) => {
  const query = {};

  if (status && status !== "all") {
    query.status = status;
  }

  if (city) {
    query.city = new RegExp(`^${escapeRegex(city)}$`, "i");
  }

  if (mediaType) {
    query.mediaType = new RegExp(`^${escapeRegex(mediaType)}$`, "i");
  }

  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), "i");

    query.$or = [
      { mediaCode: searchRegex },
      { mediaName: searchRegex },
      { mediaType: searchRegex },
      { city: searchRegex },
      { location: searchRegex },
      { fullAddress: searchRegex },
      { "dynamicFields.landmark": searchRegex },
      { "dynamicFields.illumination": searchRegex },
      { "dynamicFields.traffic type": searchRegex },
      { "dynamicFields.owner name": searchRegex },
      { "dynamicFields.remarks": searchRegex }
    ];
  }

  return query;
};

const bulkUploadHoardings = async (req, res, next) => {
  let uploadBatch = null;

  try {
    if (!req.file) {
      return errorResponse(
        res,
        "Excel file is required. Use form-data key: excel",
        null,
        400
      );
    }

    const parsedExcel = parseExcelFile(req.file.path);

    if (!parsedExcel.headers.length) {
      return errorResponse(
        res,
        "Excel file has no header row",
        null,
        400
      );
    }

    const { mappedHeaders, dynamicHeaders } = createHeaderMapping(parsedExcel.headers);

    const missingRequiredHeaders = validateRequiredHeaders(mappedHeaders);

    uploadBatch = await UploadBatch.create({
      fileName: req.file.filename,
      originalFileName: req.file.originalname,
      uploadedBy: req.user._id,
      uploadedByType: req.user.userType,
      originalHeaders: parsedExcel.headers,
      mappedHeaders,
      dynamicHeaders,
      totalRows: parsedExcel.rows.length,
      status: "completed"
    });

    if (missingRequiredHeaders.length > 0) {
      uploadBatch.status = "failed";
      uploadBatch.failedRows = parsedExcel.rows.length;
      uploadBatch.failedDetails = [
        {
          rowNumber: 1,
          mediaCode: "",
          reason: `Missing required headers: ${missingRequiredHeaders.join(", ")}`,
          rowData: {
            availableHeaders: parsedExcel.headers
          }
        }
      ];

      await uploadBatch.save();

      return errorResponse(
        res,
        "Required Excel headers are missing",
        {
          uploadBatchId: uploadBatch._id,
          missingRequiredHeaders,
          availableHeaders: parsedExcel.headers,
          mappedHeaders,
          dynamicHeaders
        },
        400
      );
    }

    const failedDetails = [];
    const validRows = [];
    const mediaCodesInExcel = new Set();
    let emptyRows = 0;
    let duplicateRows = 0;

    parsedExcel.rows.forEach((row, index) => {
      const rowNumber = index + 2;

      if (isEmptyRow(row)) {
        emptyRows += 1;
        return;
      }

      const rowValidation = validateRow({
        row,
        rowNumber,
        mappedHeaders
      });

      if (!rowValidation.isValid) {
        failedDetails.push({
          rowNumber,
          mediaCode: rowValidation.normalizedData.mediaCode || "",
          reason: rowValidation.errors.join(", "),
          rowData: row
        });
        return;
      }

      if (mediaCodesInExcel.has(rowValidation.normalizedData.mediaCode)) {
        duplicateRows += 1;

        failedDetails.push({
          rowNumber,
          mediaCode: rowValidation.normalizedData.mediaCode,
          reason: "Duplicate mediaCode inside Excel file",
          rowData: row
        });

        return;
      }

      mediaCodesInExcel.add(rowValidation.normalizedData.mediaCode);

      validRows.push({
        rowNumber,
        row,
        normalizedData: rowValidation.normalizedData
      });
    });

    const validMediaCodes = validRows.map((item) => item.normalizedData.mediaCode);

    const existingHoardings = await Hoarding.find({
      mediaCode: { $in: validMediaCodes }
    }).select("mediaCode");

    const existingMediaCodes = new Set(
      existingHoardings.map((item) => item.mediaCode)
    );

    const insertPayload = [];

    validRows.forEach((item) => {
      if (existingMediaCodes.has(item.normalizedData.mediaCode)) {
        duplicateRows += 1;

        failedDetails.push({
          rowNumber: item.rowNumber,
          mediaCode: item.normalizedData.mediaCode,
          reason: "mediaCode already exists in database",
          rowData: item.row
        });

        return;
      }

      insertPayload.push({
        ...item.normalizedData,
        dynamicFields: buildDynamicFields(item.row, dynamicHeaders),
        originalExcelRow: item.row,
        source: "excel_upload",
        uploadBatchId: uploadBatch._id,
        createdBy: req.user._id,
        updatedBy: req.user._id
      });
    });

    let insertedHoardings = [];

    if (insertPayload.length > 0) {
      insertedHoardings = await Hoarding.insertMany(insertPayload, {
        ordered: false
      });
    }

    uploadBatch.successRows = insertedHoardings.length;
    uploadBatch.failedRows = failedDetails.length;
    uploadBatch.duplicateRows = duplicateRows;
    uploadBatch.emptyRows = emptyRows;
    uploadBatch.failedDetails = failedDetails;
    uploadBatch.insertedHoardingIds = insertedHoardings.map((item) => item._id);
    uploadBatch.status =
      failedDetails.length > 0 || emptyRows > 0
        ? "completed_with_errors"
        : "completed";

    await uploadBatch.save();

    return successResponse(
      res,
      "Excel upload processed successfully",
      {
        uploadBatchId: uploadBatch._id,
        uploadedBy: {
          id: req.user._id,
          fullName: req.user.fullName,
          userType: req.user.userType
        },
        file: {
          originalFileName: req.file.originalname,
          storedFileName: req.file.filename
        },
        headers: {
          originalHeaders: parsedExcel.headers,
          mappedHeaders,
          dynamicHeaders
        },
        summary: {
          totalRows: parsedExcel.rows.length,
          successRows: insertedHoardings.length,
          failedRows: failedDetails.length,
          duplicateRows,
          emptyRows
        },
        failedDetails,
        hoardings: insertedHoardings
      },
      201
    );
  } catch (error) {
    if (uploadBatch) {
      uploadBatch.status = "failed";
      uploadBatch.failedDetails = [
        {
          rowNumber: 0,
          mediaCode: "",
          reason: error.message,
          rowData: {}
        }
      ];
      await uploadBatch.save();
    }

    next(error);
  } finally {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      // fs.unlinkSync(req.file.path);
    }
  }
};

const getHoardingList = async (req, res, next) => {
  try {
    const {
      city,
      mediaType,
      search,
      status = "all",
      page = 1,
      limit = 10,
      hoardingId,
      id,
      objectId
    } = req.query;

    const requestedHoardingId =
      req.params.hoardingId || hoardingId || id || objectId;

    /*
      If object id is passed, return only that particular hoarding full details.
      Supported:
      GET /api/hoardings/list/:hoardingId
      GET /api/hoardings/list?hoardingId=xxx
      GET /api/hoardings/list?id=xxx
      GET /api/hoardings/list?objectId=xxx
    */
    if (requestedHoardingId) {
      if (!mongoose.Types.ObjectId.isValid(requestedHoardingId)) {
        return errorResponse(
          res,
          "Invalid hoarding object id",
          null,
          400
        );
      }

      const hoarding = await Hoarding.findById(requestedHoardingId)
        .populate("createdBy", "fullName mobileNumber userType")
        .populate("updatedBy", "fullName mobileNumber userType")
        .populate("uploadBatchId")
        .lean();

      if (!hoarding) {
        return errorResponse(
          res,
          "Hoarding details not found",
          null,
          404
        );
      }

      return successResponse(
        res,
        "Hoarding details fetched successfully",
        {
          hoarding
        },
        200
      );
    }

    /*
      Normal listing flow
    */
    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const skip = (pageNumber - 1) * limitNumber;

    const normalizedStatus = String(status || "all").toLowerCase();

    if (!["all", "active", "inactive"].includes(normalizedStatus)) {
      return errorResponse(
        res,
        "Status must be all, active, or inactive",
        null,
        400
      );
    }

    /*
      Important:
      baseQuery should NOT include active/inactive status.
      It should include only city, mediaType, search filters.
      So summary counts remain same for:
      - status=all
      - status=active
      - status=inactive
    */
    const baseQuery = buildHoardingFilterQuery({
      city,
      mediaType,
      search,
      status: "all"
    });

    const activeQuery = {
      ...baseQuery,
      status: "active"
    };

    const inactiveQuery = {
      ...baseQuery,
      status: "inactive"
    };

    /*
      Always calculate total counts.
      This fixes:
      /api/hoardings/list?status=active&page=1&limit=10

      Summary will still show:
      totalRecords: 96
      activeTotal: 93
      inactiveTotal: 3
    */
    const [activeTotal, inactiveTotal] = await Promise.all([
      Hoarding.countDocuments(activeQuery),
      Hoarding.countDocuments(inactiveQuery)
    ]);

    let activeItems = [];
    let inactiveItems = [];

    /*
      Fetch list items based on selected status only.
      - all: fetch active + inactive
      - active: fetch active only
      - inactive: fetch inactive only
    */
    if (normalizedStatus === "all" || normalizedStatus === "active") {
      activeItems = await Hoarding.find(activeQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean();
    }

    if (normalizedStatus === "all" || normalizedStatus === "inactive") {
      inactiveItems = await Hoarding.find(inactiveQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean();
    }

    const totalRecords = activeTotal + inactiveTotal;

    /*
      These are page-wise possible returned counts for summary.
      This keeps summary same even when status=active/inactive.
      Example:
      activeTotal = 93, inactiveTotal = 3, page=1, limit=10
      activeReturned = 10
      inactiveReturned = 3
    */
    const activeReturned = Math.max(
      Math.min(activeTotal - skip, limitNumber),
      0
    );

    const inactiveReturned = Math.max(
      Math.min(inactiveTotal - skip, limitNumber),
      0
    );

    return successResponse(
      res,
      "Hoarding list fetched successfully",
      {
        filters: {
          city: city || null,
          mediaType: mediaType || null,
          search: search || null,
          status: normalizedStatus
        },
        pagination: {
          page: pageNumber,
          limit: limitNumber
        },
        summary: {
          totalRecords,
          activeTotal,
          inactiveTotal,
          activeReturned,
          inactiveReturned
        },
        active: {
          total: activeTotal,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(activeTotal / limitNumber),
          items: activeItems
        },
        inactive: {
          total: inactiveTotal,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(inactiveTotal / limitNumber),
          items: inactiveItems
        }
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

const getHoardingCities = async (req, res, next) => {
  try {
    const {
      status = "all",
      mediaType,
      search
    } = req.query;

    const normalizedStatus = String(status || "all").toLowerCase();

    if (!["all", "active", "inactive"].includes(normalizedStatus)) {
      return errorResponse(
        res,
        "Status must be all, active, or inactive",
        null,
        400
      );
    }

    const query = buildHoardingFilterQuery({
      mediaType,
      search,
      status: normalizedStatus
    });

    const cities = await Hoarding.distinct("city", query);

    const cleanedCities = cities
      .filter((city) => city && String(city).trim() !== "")
      .map((city) => String(city).trim())
      .sort((a, b) => a.localeCompare(b));

    return successResponse(
      res,
      "City list fetched successfully",
      {
        count: cleanedCities.length,
        cities: cleanedCities
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

const getUploadBatchDetails = async (req, res, next) => {
  try {
    const { uploadBatchId } = req.params;

    const batch = await UploadBatch.findById(uploadBatchId)
      .populate("uploadedBy", "fullName mobileNumber userType")
      .populate("insertedHoardingIds");

    if (!batch) {
      return errorResponse(
        res,
        "Upload batch not found",
        null,
        404
      );
    }

    return successResponse(
      res,
      "Upload batch details fetched successfully",
      batch,
      200
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  bulkUploadHoardings,
  getHoardingList,
  getHoardingCities,
  getUploadBatchDetails
};