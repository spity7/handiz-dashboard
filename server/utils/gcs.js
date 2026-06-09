const { Storage } = require("@google-cloud/storage");
const path = require("path");
const { optimizeThumbnail } = require("./imageProcessing");
require("dotenv-safe").config();

const keyPath =
  process.env.GCS_KEYFILE || path.join(__dirname, "../gcs-key.json");

const storage = new Storage({ keyFilename: keyPath });

const bucketName = process.env.GCS_BUCKET_NAME;
const bucket = storage.bucket(bucketName);

async function uploadImage(fileBuffer, fileName, mimeType) {
  const file = bucket.file(fileName);

  // Save the file (no ACL manipulation)
  await file.save(fileBuffer, {
    metadata: {
      contentType: mimeType,
    },
    resumable: false,
  });

  // Return public URL:
  return `https://storage.googleapis.com/${bucketName}/${encodeURIComponent(
    fileName,
  )}`;
}

function thumbnailFileName(originalName, extension) {
  const safeBase = path
    .parse(originalName || "thumbnail")
    .name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `projects/thumbnails/${Date.now()}_${safeBase}${extension}`;
}

async function uploadThumbnail(fileBuffer, originalName) {
  const { buffer, mimeType, extension } = await optimizeThumbnail(fileBuffer);
  const fileName = thumbnailFileName(originalName, extension);
  return uploadImage(buffer, fileName, mimeType);
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
    // Extract filename from public URL
    const fileName = decodeURIComponent(fileUrl.split(`/${bucketName}/`)[1]);
    const file = bucket.file(fileName);
    await file.delete();
    console.log(`Deleted old file: ${fileName}`);
  } catch (err) {
    // Don’t fail if file doesn’t exist
    console.warn("Failed to delete old GCS file:", err.message);
  }
}

module.exports = {
  uploadImage,
  uploadThumbnail,
  downloadImage,
  getFileNameFromUrl,
  bucket,
  deleteImage,
};
