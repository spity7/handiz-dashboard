const { Storage } = require("@google-cloud/storage");
const path = require("path");
const { optimizeImage } = require("./imageProcessing");
const { isCompressibleImage } = require("./imageValidation");
require("../config/env");

const keyPath =
  process.env.GCS_KEYFILE || path.join(__dirname, "../gcs-key.json");

const storage = new Storage({ keyFilename: keyPath });

const bucketName = process.env.GCS_BUCKET_NAME;
const bucket = storage.bucket(bucketName);

async function uploadImage(fileBuffer, fileName, mimeType) {
  const file = bucket.file(fileName);

  await file.save(fileBuffer, {
    metadata: {
      contentType: mimeType,
    },
    resumable: false,
  });

  return `https://storage.googleapis.com/${bucketName}/${encodeURIComponent(
    fileName,
  )}`;
}

function safeBaseName(originalName, fallback = "image") {
  return path
    .parse(originalName || fallback)
    .name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function stampedImageFileName(
  folder,
  originalName,
  extension,
  { stamp = Date.now(), index } = {},
) {
  const base = safeBaseName(originalName);
  const prefix =
    index !== undefined && index !== null ? `${stamp}_${index}` : String(stamp);
  return `${folder}/${prefix}_${base}${extension}`;
}

function isGcsUrl(fileUrl) {
  if (!fileUrl || !bucketName) return false;
  return fileUrl.includes(`storage.googleapis.com/${bucketName}/`);
}

async function uploadOptimizedImage(
  fileBuffer,
  originalName,
  folder,
  { stamp = Date.now(), index } = {},
) {
  const { buffer, mimeType, extension } = await optimizeImage(fileBuffer);
  const fileName = stampedImageFileName(folder, originalName, extension, {
    stamp,
    index,
  });
  return uploadImage(buffer, fileName, mimeType);
}

async function uploadProjectImage(
  fileBuffer,
  originalName,
  folder,
  { stamp = Date.now(), index } = {},
) {
  return uploadOptimizedImage(fileBuffer, originalName, `projects/${folder}`, {
    stamp,
    index,
  });
}

async function uploadThumbnail(fileBuffer, originalName) {
  return uploadProjectImage(fileBuffer, originalName, "thumbnails");
}

async function uploadCourseThumbnail(fileBuffer, originalName) {
  return uploadOptimizedImage(fileBuffer, originalName, "courses/thumbnails");
}

async function uploadCourseHeroImage(
  fileBuffer,
  originalName,
  variant = "desktop",
) {
  const subfolder = variant === "mobile" ? "hero/mobile" : "hero/desktop";
  return uploadCourseImage(fileBuffer, originalName, subfolder);
}

async function uploadCourseImage(
  fileBuffer,
  originalName,
  subfolder = "images",
  { stamp = Date.now(), index } = {},
) {
  return uploadOptimizedImage(
    fileBuffer,
    originalName,
    `courses/${subfolder}`,
    {
      stamp,
      index,
    },
  );
}

function getFileNameFromUrl(fileUrl) {
  if (!fileUrl) return null;
  const marker = `/${bucketName}/`;
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(fileUrl.slice(idx + marker.length));
}

async function downloadImage(fileUrl) {
  const fileName = getFileNameFromUrl(fileUrl);
  if (!fileName) {
    throw new Error("Could not parse GCS file URL");
  }
  const [buffer] = await bucket.file(fileName).download();
  return buffer;
}

async function deleteImage(fileUrl) {
  if (!fileUrl) return;
  try {
    const fileName = decodeURIComponent(fileUrl.split(`/${bucketName}/`)[1]);
    const file = bucket.file(fileName);
    await file.delete();
    console.log(`Deleted old file: ${fileName}`);
  } catch (err) {
    console.warn("Failed to delete old GCS file:", err.message);
  }
}

async function uploadUserAvatar(fileBuffer, originalName) {
  return uploadOptimizedImage(fileBuffer, originalName, "users/avatars");
}

async function uploadCourseFile(
  fileBuffer,
  originalName,
  mimeType,
  subfolder = "resources",
) {
  if (isCompressibleImage(mimeType, originalName)) {
    return uploadCourseImage(fileBuffer, originalName, subfolder);
  }

  const base = safeBaseName(originalName, "file");
  const ext = path.extname(originalName || "");
  const fileName = `courses/${subfolder}/${Date.now()}_${base}${ext}`;
  await uploadImage(fileBuffer, fileName, mimeType);
  return `https://storage.googleapis.com/${bucketName}/${encodeURIComponent(fileName)}`;
}

module.exports = {
  uploadImage,
  uploadOptimizedImage,
  uploadProjectImage,
  uploadThumbnail,
  uploadUserAvatar,
  downloadImage,
  getFileNameFromUrl,
  isGcsUrl,
  bucket,
  deleteImage,
  uploadCourseThumbnail,
  uploadCourseHeroImage,
  uploadCourseImage,
  uploadCourseFile,
};
