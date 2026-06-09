const sharp = require("sharp");

const THUMBNAIL_MAX_WIDTH = 800;
const THUMBNAIL_JPEG_QUALITY = 82;
const THUMBNAIL_WEBP_QUALITY = 82;

/**
 * Resize and compress an image for use as a grid/list thumbnail.
 * Outputs JPEG for opaque images, WebP when the source has transparency.
 */
async function optimizeThumbnail(buffer) {
  const image = sharp(buffer, { failOn: "none" });
  const meta = await image.metadata();

  const pipeline = image.rotate().resize({
    width: THUMBNAIL_MAX_WIDTH,
    withoutEnlargement: true,
    fit: "inside",
  });

  if (meta.hasAlpha) {
    return {
      buffer: await pipeline
        .webp({ quality: THUMBNAIL_WEBP_QUALITY })
        .toBuffer(),
      mimeType: "image/webp",
      extension: ".webp",
    };
  }

  return {
    buffer: await pipeline
      .jpeg({ quality: THUMBNAIL_JPEG_QUALITY, mozjpeg: true })
      .toBuffer(),
    mimeType: "image/jpeg",
    extension: ".jpg",
  };
}

/**
 * Returns true when the buffer is already small enough to skip re-processing.
 */
async function isThumbnailOptimized(buffer) {
  const meta = await sharp(buffer, { failOn: "none" }).metadata();
  const width = meta.width || 0;
  const sizeKb = buffer.length / 1024;

  return width > 0 && width <= THUMBNAIL_MAX_WIDTH && sizeKb <= 250;
}

module.exports = {
  optimizeThumbnail,
  isThumbnailOptimized,
  THUMBNAIL_MAX_WIDTH,
};
