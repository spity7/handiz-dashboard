const express = require("express");
const multer = require("multer");
const router = express.Router();
const optionalAuth = require("../middlewares/optionalAuth");
const protectCmsWrite = require("../middlewares/protectCmsWrite");
const {
  createHomepageAd,
  getAllHomepageAds,
  getHomepageAdById,
  updateHomepageAd,
  deleteHomepageAd,
} = require("../controllers/homepageAdController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 2,
  },
});

router.get("/homepage-ads", optionalAuth, getAllHomepageAds);
router.get("/homepage-ads/:id", getHomepageAdById);

router.post(
  "/homepage-ads",
  protectCmsWrite,
  upload.fields([{ name: "thumbnail", maxCount: 1 }]),
  createHomepageAd,
);
router.put(
  "/homepage-ads/:id",
  protectCmsWrite,
  upload.fields([{ name: "thumbnail", maxCount: 1 }]),
  updateHomepageAd,
);
router.delete("/homepage-ads/:id", protectCmsWrite, deleteHomepageAd);

module.exports = router;
