const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
  createAboutUs,
  getAboutUs,
  getAboutUsById,
  updateAboutUs,
  deleteAboutUs,
} = require("../controllers/aboutUsController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 50,
  },
});

router.post(
  "/about-us",
  upload.fields([{ name: "blockImages", maxCount: 50 }]),
  createAboutUs,
);
router.get("/about-us", getAboutUs);
router.get("/about-us/:id", getAboutUsById);
router.put(
  "/about-us/:id",
  upload.fields([{ name: "blockImages", maxCount: 50 }]),
  updateAboutUs,
);
router.delete("/about-us/:id", deleteAboutUs);

module.exports = router;
