const sharp = require("sharp");

const IMAGE_MAX_WIDTH = 800;
const IMAGE_MIN_SIZE_KB = 400;
const IMAGE_MAX_SIZE_KB = 800;

const RESIZE_FALLBACK_WIDTHS = [2048, 1600, 1200, 1000, 800];

const FORMAT_MIME = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

const FORMAT_EXTENSION = {
  jpeg: ".jpg",
  jpg: ".jpg",
  png: ".png",
  webp: ".webp",
  gif: ".gif",
  avif: ".avif",
};

function bufferSizeKb(buffer) {
  return buffer.length / 1024;
}

function passthroughResult(buffer, meta) {
  const format = meta?.format || "jpeg";
  return {
    buffer,
    mimeType: FORMAT_MIME[format] || "image/jpeg",
    extension: FORMAT_EXTENSION[format] || ".jpg",
  };
}

function estimateInitialQuality(inputSizeKb) {
  const targetKb = (IMAGE_MIN_SIZE_KB + IMAGE_MAX_SIZE_KB) / 2;
  return Math.min(95, Math.max(20, Math.round(90 * (targetKb / inputSizeKb))));
}

async function encodeBufferAtQuality(pixelBuffer, hasAlpha, quality) {
  const pipeline = sharp(pixelBuffer);

  if (hasAlpha) {
    return {
      buffer: await pipeline.webp({ quality }).toBuffer(),
      mimeType: "image/webp",
      extension: ".webp",
    };
  }

  return {
    buffer: await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer(),
    mimeType: "image/jpeg",
    extension: ".jpg",
  };
}

/**
 * Tune quality on a fixed pixel buffer to land in [MIN, MAX] KB when possible.
 */
async function compressToTargetRange(pixelBuffer, hasAlpha, inputSizeKb) {
  let quality = estimateInitialQuality(inputSizeKb);
  let result = await encodeBufferAtQuality(pixelBuffer, hasAlpha, quality);
  let sizeKb = bufferSizeKb(result.buffer);

  if (sizeKb > IMAGE_MAX_SIZE_KB) {
    quality = Math.max(
      5,
      Math.round(quality * (IMAGE_MAX_SIZE_KB / sizeKb) * 0.9),
    );
    result = await encodeBufferAtQuality(pixelBuffer, hasAlpha, quality);
    sizeKb = bufferSizeKb(result.buffer);

    if (sizeKb > IMAGE_MAX_SIZE_KB) {
      result = await encodeBufferAtQuality(
        pixelBuffer,
        hasAlpha,
        Math.max(5, quality - 15),
      );
      sizeKb = bufferSizeKb(result.buffer);
    }
  }

  if (sizeKb < IMAGE_MIN_SIZE_KB) {
    const higherQuality = Math.min(
      95,
      Math.round(quality * (IMAGE_MIN_SIZE_KB / Math.max(sizeKb, 1))),
    );

    if (higherQuality > quality) {
      const candidate = await encodeBufferAtQuality(
        pixelBuffer,
        hasAlpha,
        higherQuality,
      );

      if (bufferSizeKb(candidate.buffer) <= IMAGE_MAX_SIZE_KB) {
        result = candidate;
      }
    }
  }

  return result;
}

async function prepareRotatedBuffer(buffer) {
  return sharp(buffer, { failOn: "none" }).rotate().toBuffer();
}

async function prepareResizedBuffer(buffer, width) {
  return sharp(buffer, { failOn: "none" })
    .rotate()
    .resize({
      width,
      withoutEnlargement: true,
      fit: "inside",
    })
    .toBuffer();
}

/**
 * Compress by file-size rules only (no dimension shrink unless quality alone is not enough):
 * - Below 400 KB: no compression (return original)
 * - 400–800 KB: already in range, no compression
 * - Above 800 KB: quality compression toward 400–800 KB; resize only as last resort
 */
async function optimizeImage(buffer) {
  const inputSizeKb = bufferSizeKb(buffer);
  const meta = await sharp(buffer, { failOn: "none" }).metadata();

  if (inputSizeKb < IMAGE_MIN_SIZE_KB || inputSizeKb <= IMAGE_MAX_SIZE_KB) {
    return passthroughResult(buffer, meta);
  }

  const hasAlpha = Boolean(meta.hasAlpha);
  const originalWidth = meta.width || IMAGE_MAX_WIDTH;

  let pixelBuffer = await prepareRotatedBuffer(buffer);
  let result = await compressToTargetRange(pixelBuffer, hasAlpha, inputSizeKb);

  if (bufferSizeKb(result.buffer) <= IMAGE_MAX_SIZE_KB) {
    return result;
  }

  const fallbackWidths = RESIZE_FALLBACK_WIDTHS.filter(
    (width) => width < originalWidth,
  );

  for (const width of fallbackWidths) {
    pixelBuffer = await prepareResizedBuffer(buffer, width);
    result = await compressToTargetRange(pixelBuffer, hasAlpha, inputSizeKb);

    if (bufferSizeKb(result.buffer) <= IMAGE_MAX_SIZE_KB) {
      return result;
    }
  }

  return result;
}

/** @deprecated Use optimizeImage */
const optimizeThumbnail = optimizeImage;

/**
 * Returns true when the buffer already satisfies the size rules and can be skipped.
 */
async function isImageOptimized(buffer) {
  const sizeKb = bufferSizeKb(buffer);
  return sizeKb < IMAGE_MIN_SIZE_KB || sizeKb <= IMAGE_MAX_SIZE_KB;
}

/** @deprecated Use isImageOptimized */
const isThumbnailOptimized = isImageOptimized;

module.exports = {
  optimizeImage,
  optimizeThumbnail,
  isImageOptimized,
  isThumbnailOptimized,
  IMAGE_MAX_WIDTH,
  IMAGE_MIN_SIZE_KB,
  IMAGE_MAX_SIZE_KB,
  THUMBNAIL_MAX_WIDTH: IMAGE_MAX_WIDTH,
  THUMBNAIL_MIN_SIZE_KB: IMAGE_MIN_SIZE_KB,
  THUMBNAIL_MAX_SIZE_KB: IMAGE_MAX_SIZE_KB,
};
