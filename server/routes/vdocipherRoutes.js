const express = require("express");
const router = express.Router();
const protectRoute = require("../middlewares/protectRoute");
const authorizePermission = require("../middlewares/authorizePermission");
const {
  getUploadCredentials,
  deleteUploadedVideo,
} = require("../controllers/vdocipherController");

router.post(
  "/vdocipher/upload-credentials",
  protectRoute,
  authorizePermission("courses:manage"),
  getUploadCredentials,
);

router.delete(
  "/vdocipher/videos/:videoId",
  protectRoute,
  authorizePermission("courses:manage"),
  deleteUploadedVideo,
);

module.exports = router;
