const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },

    mobileNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, "Enter valid Indian mobile number"]
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true
    },

    userType: {
      type: String,
      enum: ["admin", "staff", "client"],
      required: true,
      index: true
    },

    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "active"
    },

    profileImage: {
      type: String,
      default: ""
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    fullName: this.fullName,
    mobileNumber: this.mobileNumber,
    email: this.email,
    userType: this.userType,
    status: this.status,
    profileImage: this.profileImage,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model("User", userSchema);