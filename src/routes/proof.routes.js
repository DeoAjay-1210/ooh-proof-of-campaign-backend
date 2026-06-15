const express = require("express");

const {
  uploadHoardingProof,
  getCampaignProofs
} = require("../controllers/proof.controller");

const { protect, allowRoles } = require("../middlewares/auth.middleware");
const { uploadProofImage } = require("../middlewares/proofUpload.middleware");

const router = express.Router();

router.post(
  "/hoarding/:hoardingId/upload",
  protect,
  allowRoles("admin", "staff"),
  uploadProofImage.single("proofImage"),
  uploadHoardingProof
);

router.get(
  "/campaign-proofs",
  protect,
  allowRoles("admin", "staff", "client"),
  getCampaignProofs
);

module.exports = router;