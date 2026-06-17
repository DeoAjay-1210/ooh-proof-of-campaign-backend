const mongoose = require("mongoose");

const proofSchema = new mongoose.Schema(
  {
    hoardingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hoarding",
      required: true,
      index: true,
    },

    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },

    cloudKey: {
      type: String,
      required: true,
      trim: true,
    },

    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },

    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },

    address: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    capturedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    uploadedByType: {
      type: String,
      enum: ["admin", "staff", "client"],
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

proofSchema.index({
  hoardingId: 1,
  capturedAt: -1,
});

proofSchema.index({
  uploadedBy: 1,
  capturedAt: -1,
});

module.exports = mongoose.model("Proof", proofSchema);