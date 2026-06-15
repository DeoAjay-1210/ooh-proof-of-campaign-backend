const sendResponse = (
  res,
  statusCode = 200,
  success = true,
  message = "",
  data = null
) => {
  return res.status(statusCode).json({
    success,
    message,
    data: data || null
  });
};

const successResponse = (
  res,
  message = "Success",
  data = null,
  statusCode = 200
) => {
  return sendResponse(res, statusCode, true, message, data);
};

const errorResponse = (
  res,
  message = "Something went wrong",
  data = null,
  statusCode = 400
) => {
  return sendResponse(res, statusCode, false, message, data);
};

module.exports = {
  sendResponse,
  successResponse,
  errorResponse
};