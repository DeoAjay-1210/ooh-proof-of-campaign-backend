const mongoose = require("mongoose");

const hoardingSchema = new mongoose.Schema(
  {
    mediaCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      index: true
    },

    mediaName: {
      type: String,
      required: true,
      trim: true
    },

    mediaType: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    city: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    location: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    fullAddress: {
      type: String,
      required: true,
      trim: true
    },

    widthFt: {
      type: Number,
      required: true,
      min: 0
    },

    heightFt: {
      type: Number,
      required: true,
      min: 0
    },

    totalSqFt: {
      type: Number,
      required: true,
      min: 0
    },

    dynamicFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    },

    originalExcelRow: {
      type: Object,
      default: {}
    },

    source: {
      type: String,
      enum: ["excel_upload", "manual"],
      default: "excel_upload"
    },

    uploadBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UploadBatch",
      default: null
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

hoardingSchema.index({
  mediaCode: 1,
  city: 1,
  mediaType: 1,
  status: 1
});

module.exports = mongoose.model("Hoarding", hoardingSchema);