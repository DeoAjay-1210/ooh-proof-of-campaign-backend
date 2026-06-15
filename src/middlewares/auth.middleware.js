const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { errorResponse } = require("../utils/response");

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return errorResponse(res, "Token missing", null, 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);

    if (!user) {
      return errorResponse(res, "User not found", null, 401);
    }

    if (user.status !== "active") {
      return errorResponse(res, `Account is ${user.status}`, null, 403);
    }

    req.user = user;
    next();
  } catch (error) {
    return errorResponse(res, "Invalid or expired token", null, 401);
  }
};

const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.userType)) {
      return errorResponse(res, "Permission denied", null, 403);
    }

    next();
  };
};

module.exports = {
  protect,
  allowRoles
};