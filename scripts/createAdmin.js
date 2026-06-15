const dotenv = require("dotenv");
const mongoose = require("mongoose");

const connectDB = require("../src/config/db");
const User = require("../src/models/user.model");

dotenv.config();

const createAdmin = async () => {
  try {
    await connectDB();

    const existingAdmin = await User.findOne({
      mobileNumber: process.env.ADMIN_MOBILE
    });

    if (existingAdmin) {
      console.log("Admin already exists");
      console.log({
        id: existingAdmin._id,
        fullName: existingAdmin.fullName,
        mobileNumber: existingAdmin.mobileNumber,
        userType: existingAdmin.userType
      });

      await mongoose.connection.close();
      process.exit(0);
    }

    const admin = await User.create({
      fullName: process.env.ADMIN_NAME,
      mobileNumber: process.env.ADMIN_MOBILE,
      email: process.env.ADMIN_EMAIL,
      userType: "admin",
      status: "active"
    });

    console.log("Admin created successfully");
    console.log({
      id: admin._id,
      fullName: admin.fullName,
      mobileNumber: admin.mobileNumber,
      email: admin.email,
      userType: admin.userType
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Admin create error:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

createAdmin();