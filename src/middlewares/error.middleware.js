const { errorResponse } = require("../utils/response");

const notFound = (req, res, next) => {
  const error = new Error(`API not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || "Server Error";

  if (err.code === 11000) {
    statusCode = 409;
    message = "Duplicate value already exists";
  }

  return errorResponse(res, message, null, statusCode);
};

module.exports = {
  notFound,
  errorHandler
};