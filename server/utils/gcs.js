const { Storage } = require("@google-cloud/storage");
const path = require("path");
const { optimizeImage } = require("./imageProcessing");
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

function projectImageFileName(folder, originalName, extension, stamp, index) {
  const base = safeBaseName(originalName);
  const prefix =
    index !== undefined && index !== null ? `${stamp}_${index}` : String(stamp);
  return `projects/${folder}/${prefix}_${base}${extension}`;
}

async function uploadProjectImage(
  fileBuffer,
  originalName,
  folder,
  { stamp = Date.now(), index } = {},
) {
  const { buffer, mimeType, extension } = await optimizeImage(fileBuffer);
  const fileName = projectImageFileName(
    folder,
    originalName,
    extension,
    stamp,
    index,
  );
  return uploadImage(buffer, fileName, mimeType);
}

async function uploadThumbnail(fileBuffer, originalName) {
  return uploadProjectImage(fileBuffer, originalName, "thumbnails");
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

function courseVideoFileName(originalName, stamp = Date.now()) {
  const base = safeBaseName(originalName, "video");
  const ext = path.extname(originalName || "") || ".mp4";
  const prefix = process.env.GCS_VIDEO_BUCKET_PATH || "courses/videos/";
  return `${prefix}${stamp}_${base}${ext}`;
}

async function uploadVideo(fileBuffer, originalName, mimeType) {
  const fileName = courseVideoFileName(originalName);
  const file = bucket.file(fileName);

  await file.save(fileBuffer, {
    metadata: { contentType: mimeType || "video/mp4" },
    resumable: true,
  });

  return fileName;
}

async function uploadCourseFile(
  fileBuffer,
  originalName,
  mimeType,
  subfolder = "resources",
) {
  const base = safeBaseName(originalName, "file");
  const ext = path.extname(originalName || "");
  const fileName = `courses/${subfolder}/${Date.now()}_${base}${ext}`;
  await uploadImage(fileBuffer, fileName, mimeType);
  return `https://storage.googleapis.com/${bucketName}/${encodeURIComponent(fileName)}`;
}

async function getSignedVideoUrl(gcsPath, expiresInSeconds) {
  if (!gcsPath) return null;
  const expiry =
    expiresInSeconds ||
    parseInt(process.env.GCS_SIGNED_URL_EXPIRY_SECONDS || "900", 10);

  const [url] = await bucket.file(gcsPath).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + expiry * 1000,
  });

  return url;
}

async function deleteGcsFile(gcsPath) {
  if (!gcsPath) return;
  try {
    await bucket.file(gcsPath).delete();
  } catch (err) {
    console.warn("Failed to delete GCS file:", err.message);
  }
}

module.exports = {
  uploadImage,
  uploadProjectImage,
  uploadThumbnail,
  downloadImage,
  getFileNameFromUrl,
  bucket,
  deleteImage,
  uploadVideo,
  uploadCourseFile,
  getSignedVideoUrl,
  deleteGcsFile,
  courseVideoFileName,
};
