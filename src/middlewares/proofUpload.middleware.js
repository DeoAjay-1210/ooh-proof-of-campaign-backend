const multer = require("multer");
const path = require("path");

const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png"];
const allowedExtensions = [".jpg", ".jpeg", ".png"];

const storage = multer.memoryStorage();

const proofFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error("Only JPG, JPEG and PNG images are allowed"));
  }

  if (!allowedExtensions.includes(ext)) {
    return cb(new Error("Only .jpg, .jpeg and .png files are allowed"));
  }

  cb(null, true);
};

const uploadProofImage = multer({
  storage,
  fileFilter: proofFileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024
  }
});

module.exports = {
  uploadProofImage
};