const { PutObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");
const crypto = require("crypto");

const spacesClient = require("../config/digitalOceanSpaces");

const uploadImageToDigitalOcean = async ({ file, folder = "proofs" }) => {
  if (!file) {
    throw new Error("Image file is required");
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const uniqueFileName = `${crypto.randomUUID()}${ext}`;
  const cloudKey = `${folder}/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${uniqueFileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.DO_SPACES_BUCKET,
    Key: cloudKey,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: "public-read"
  });

  await spacesClient.send(command);

  const cdnBase = String(process.env.DO_SPACES_CDN_BASE || "").replace(/\/$/, "");
  const imageUrl = `${cdnBase}/${cloudKey}`;

  return {
    imageUrl,
    cloudKey
  };
};

module.exports = {
  uploadImageToDigitalOcean
};