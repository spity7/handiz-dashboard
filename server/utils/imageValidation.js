const path = require("path");

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".avif",
]);

const THUMBNAIL_INVALID_MESSAGE =
  "Thumbnail must be an image file (JPEG, PNG, GIF, WebP, or AVIF).";

const isAllowedImageUpload = (file) => {
  if (!file) return false;

  const mime = String(file.mimetype || "").toLowerCase();
  if (ALLOWED_IMAGE_MIME_TYPES.has(mime)) return true;

  const ext = path.extname(file.originalname || "").toLowerCase();
  return ALLOWED_IMAGE_EXTENSIONS.has(ext);
};

const getImageValidationError = (file, label = "Thumbnail") => {
  if (!file) return null;
  if (isAllowedImageUpload(file)) return null;
  return `${label} must be an image file (JPEG, PNG, GIF, WebP, or AVIF).`;
};

module.exports = {
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
  THUMBNAIL_INVALID_MESSAGE,
  isAllowedImageUpload,
  getImageValidationError,
};
