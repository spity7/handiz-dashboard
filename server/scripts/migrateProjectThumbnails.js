/**
 * One-time migration: re-compress existing student-project thumbnails in GCS.
 *
 * Run from server directory (with MONGO_URL and GCS env in .env):
 *   node scripts/migrateProjectThumbnails.js
 *   node scripts/migrateProjectThumbnails.js --dry-run
 */
require("dotenv-safe").config();
const mongoose = require("mongoose");
const Project = require("../models/projectModel");
const { uploadThumbnail, downloadImage, deleteImage } = require("../utils/gcs");
const { isThumbnailOptimized } = require("../utils/imageProcessing");

const dryRun = process.argv.includes("--dry-run");

async function migrateProject(project) {
  const oldUrl = project.thumbnailUrl;
  if (!oldUrl) {
    return { status: "skipped", reason: "no thumbnail" };
  }

  let buffer;
  try {
    buffer = await downloadImage(oldUrl);
  } catch (err) {
    return { status: "error", reason: `download failed: ${err.message}` };
  }

  const beforeKb = Math.round(buffer.length / 1024);

  if (await isThumbnailOptimized(buffer)) {
    return { status: "skipped", reason: `already optimized (${beforeKb} KB)` };
  }

  if (dryRun) {
    return {
      status: "dry-run",
      reason: `would optimize ${beforeKb} KB`,
    };
  }

  const originalName = oldUrl.split("/").pop() || "thumbnail";
  const newUrl = await uploadThumbnail(buffer, originalName);

  await Project.updateOne({ _id: project._id }, { thumbnailUrl: newUrl });

  try {
    await deleteImage(oldUrl);
  } catch (err) {
    console.warn(
      `  ⚠️ Could not delete old file for ${project._id}:`,
      err.message,
    );
  }

  let afterKb = beforeKb;
  try {
    const optimized = await downloadImage(newUrl);
    afterKb = Math.round(optimized.length / 1024);
  } catch {
    // non-fatal
  }

  return {
    status: "migrated",
    reason: `${beforeKb} KB → ${afterKb} KB`,
  };
}

async function main() {
  const mongoURI = process.env.MONGO_URL;
  if (!mongoURI) {
    console.error("MONGO_URL is not set");
    process.exit(1);
  }

  if (dryRun) {
    console.log("DRY RUN — no files or database records will be changed.\n");
  }

  await mongoose.connect(mongoURI);
  const projects = await Project.find({
    thumbnailUrl: { $exists: true, $ne: "" },
  })
    .select("_id title thumbnailUrl")
    .lean();

  console.log(`Found ${projects.length} projects with thumbnails.\n`);

  const summary = { migrated: 0, skipped: 0, error: 0, dryRun: 0 };

  for (const project of projects) {
    const label = project.title || project._id;
    try {
      const result = await migrateProject(project);
      summary[result.status === "dry-run" ? "dryRun" : result.status] =
        (summary[result.status === "dry-run" ? "dryRun" : result.status] || 0) +
        1;
      console.log(`[${result.status}] ${label} — ${result.reason}`);
    } catch (err) {
      summary.error += 1;
      console.error(`[error] ${label} — ${err.message}`);
    }
  }

  console.log("\nDone:", summary);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
