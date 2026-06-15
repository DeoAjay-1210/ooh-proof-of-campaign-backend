const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    userType: {
      type: String,
      enum: ["admin", "staff", "client"],
      required: true,
      index: true
    },

    otpHash: {
      type: String,
      required: true
    },

    expiresAt: {
      type: Date,
      required: true,
      expires: 0
    },

    isUsed: {
      type: Boolean,
      default: false
    },

    attempts: {
      type: Number,
      default: 0
    },

    metadata: {
      type: Object,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Otp", otpSchema);