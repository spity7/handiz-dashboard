const multer = require("multer");
const {
  PROJECT_MAX_FILE_SIZE_BYTES,
  PROJECT_MAX_TOTAL_FILES,
} = require("../constants/projectUploadLimits");

const formatMb = (bytes) => `${Math.round(bytes / (1024 * 1024))} MB`;

const handleMulterError = (err, req, res, next) => {
  if (!(err instanceof multer.MulterError)) {
    return false;
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({
      message: `One or more files are too large. Each image must be ${formatMb(err.limit || PROJECT_MAX_FILE_SIZE_BYTES)} or smaller.`,
      code: err.code,
    });
    return true;
  }

  if (err.code === "LIMIT_FILE_COUNT") {
    res.status(413).json({
      message: `Too many files in this upload. Maximum ${PROJECT_MAX_TOTAL_FILES} images per request (thumbnail + gallery + content blocks).`,
      code: err.code,
    });
    return true;
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    res.status(400).json({
      message: "Unexpected file field in upload.",
      code: err.code,
    });
    return true;
  }

  res.status(400).json({
    message: err.message || "Upload failed.",
    code: err.code,
  });
  return true;
};

module.exports = handleMulterError;
