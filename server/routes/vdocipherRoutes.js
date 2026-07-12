const express = require("express");
const router = express.Router();
const protectRoute = require("../middlewares/protectRoute");
const authorizePermission = require("../middlewares/authorizePermission");
const { getUploadCredentials } = require("../controllers/vdocipherController");

router.post(
  "/vdocipher/upload-credentials",
  protectRoute,
  authorizePermission("courses:manage"),
  getUploadCredentials,
);

module.exports = router;
