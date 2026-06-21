/**
 * One-time migration: re-compress existing student-project images in GCS
 * (thumbnails, gallery, and content-block images).
 *
 * Run from server directory (with MONGO_URL and GCS env in .env):
 *   node scripts/migrateProjectImages.js
 *   node scripts/migrateProjectImages.js --dry-run
 */
require("dotenv-safe").config();
const mongoose = require("mongoose");
const Project = require("../models/projectModel");
const {
  uploadProjectImage,
  downloadImage,
  deleteImage,
} = require("../utils/gcs");
const { isImageOptimized } = require("../utils/imageProcessing");

const dryRun = process.argv.includes("--dry-run");

async function migrateImageAtUrl(oldUrl, folder, { stamp, index, urlCache }) {
  if (!oldUrl) {
    return { status: "skipped", reason: "no url", oldUrl, newUrl: oldUrl };
  }

  if (urlCache.has(oldUrl)) {
    const cached = urlCache.get(oldUrl);
    return { ...cached, reason: `reused: ${cached.reason}` };
  }

  let buffer;
  try {
    buffer = await downloadImage(oldUrl);
  } catch (err) {
    const result = {
      status: "error",
      reason: `download failed: ${err.message}`,
      oldUrl,
      newUrl: null,
    };
    urlCache.set(oldUrl, result);
    return result;
  }

  const beforeKb = Math.round(buffer.length / 1024);

  if (await isImageOptimized(buffer)) {
    const result = {
      status: "skipped",
      reason: `already optimized (${beforeKb} KB)`,
      oldUrl,
      newUrl: oldUrl,
    };
    urlCache.set(oldUrl, result);
    return result;
  }

  if (dryRun) {
    const result = {
      status: "dry-run",
      reason: `would optimize ${beforeKb} KB`,
      oldUrl,
      newUrl: null,
    };
    urlCache.set(oldUrl, result);
    return result;
  }

  const originalName = oldUrl.split("/").pop() || "image";
  const newUrl = await uploadProjectImage(buffer, originalName, folder, {
    stamp,
    index,
  });

  try {
    await deleteImage(oldUrl);
  } catch (err) {
    console.warn(`  ⚠️ Could not delete old file:`, err.message);
  }

  let afterKb = beforeKb;
  try {
    const optimized = await downloadImage(newUrl);
    afterKb = Math.round(optimized.length / 1024);
  } catch {
    // non-fatal
  }

  const result = {
    status: "migrated",
    reason: `${beforeKb} KB → ${afterKb} KB`,
    oldUrl,
    newUrl,
  };
  urlCache.set(oldUrl, result);
  return result;
}

async function migrateProject(project) {
  const stamp = Date.now();
  const urlCache = new Map();
  const updates = {};
  const results = [];

  if (project.thumbnailUrl) {
    const result = await migrateImageAtUrl(project.thumbnailUrl, "thumbnails", {
      stamp,
      urlCache,
    });
    results.push({ kind: "thumbnail", ...result });
    if (result.status === "migrated" && result.newUrl) {
      updates.thumbnailUrl = result.newUrl;
    }
  }

  if (project.gallery?.length) {
    const newGallery = [...project.gallery];
    let galleryChanged = false;

    for (let index = 0; index < project.gallery.length; index += 1) {
      const result = await migrateImageAtUrl(
        project.gallery[index],
        "gallery",
        {
          stamp,
          index,
          urlCache,
        },
      );
      results.push({ kind: `gallery[${index}]`, ...result });

      if (result.status === "migrated" && result.newUrl) {
        newGallery[index] = result.newUrl;
        galleryChanged = true;
      }
    }

    if (galleryChanged) {
      updates.gallery = newGallery;
    }
  }

  if (project.contentBlocks?.length) {
    const newBlocks = project.contentBlocks.map((block) => ({ ...block }));
    let blocksChanged = false;

    for (let index = 0; index < newBlocks.length; index += 1) {
      const block = newBlocks[index];
      if (block.type !== "image" || !block.content) continue;

      const result = await migrateImageAtUrl(block.content, "blocks", {
        stamp,
        index,
        urlCache,
      });
      results.push({ kind: `block[${index}]`, ...result });

      if (result.status === "migrated" && result.newUrl) {
        newBlocks[index] = { ...block, content: result.newUrl };
        blocksChanged = true;
      }
    }

    if (blocksChanged) {
      updates.contentBlocks = newBlocks;
    }
  }

  if (!dryRun && Object.keys(updates).length > 0) {
    await Project.updateOne({ _id: project._id }, updates);
  }

  return results;
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
  const projects = await Project.find({})
    .select("_id title thumbnailUrl gallery contentBlocks")
    .lean();

  console.log(`Found ${projects.length} projects.\n`);

  const summary = { migrated: 0, skipped: 0, error: 0, dryRun: 0 };

  for (const project of projects) {
    const label = project.title || project._id;

    try {
      const results = await migrateProject(project);

      if (!results.length) {
        console.log(`[skipped] ${label} — no images`);
        summary.skipped += 1;
        continue;
      }

      for (const result of results) {
        const statusKey =
          result.status === "dry-run" ? "dryRun" : result.status;
        summary[statusKey] = (summary[statusKey] || 0) + 1;
        console.log(
          `[${result.status}] ${label} (${result.kind}) — ${result.reason}`,
        );
      }
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
