const mongoose = require("mongoose");

const uploadBatchSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true
    },

    originalFileName: {
      type: String,
      required: true
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    uploadedByType: {
      type: String,
      enum: ["admin", "staff"],
      required: true
    },

    originalHeaders: {
      type: [String],
      default: []
    },

    mappedHeaders: {
      type: Object,
      default: {}
    },

    dynamicHeaders: {
      type: [String],
      default: []
    },

    totalRows: {
      type: Number,
      default: 0
    },

    successRows: {
      type: Number,
      default: 0
    },

    failedRows: {
      type: Number,
      default: 0
    },

    duplicateRows: {
      type: Number,
      default: 0
    },

    emptyRows: {
      type: Number,
      default: 0
    },

    failedDetails: {
      type: [
        {
          rowNumber: Number,
          mediaCode: String,
          reason: String,
          rowData: Object
        }
      ],
      default: []
    },

    insertedHoardingIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hoarding"
      }
    ],

    status: {
      type: String,
      enum: ["completed", "completed_with_errors", "failed"],
      default: "completed"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("UploadBatch", uploadBatchSchema);