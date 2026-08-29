/**
 * One-time migration: re-compress existing student-project images in GCS.
 *
 * Prefer the unified script for new runs:
 *   node scripts/migrateGcsImages.js --entity=projects
 *
 * This wrapper remains for backward compatibility:
 *   node scripts/migrateProjectImages.js
 *   node scripts/migrateProjectImages.js --dry-run
 */
require("../config/env");
const mongoose = require("mongoose");
const Project = require("../models/projectModel");
const {
  migrateProjectDoc,
  createSummary,
  tallyResults,
  logResults,
} = require("../utils/gcsImageMigration");

const dryRun = process.argv.includes("--dry-run");

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

  const summary = createSummary();
  const urlCache = new Map();

  for (const project of projects) {
    const label = project.title || project._id;

    try {
      const { updates, results } = await migrateProjectDoc(project, {
        dryRun,
        urlCache,
      });

      if (!results.length) {
        console.log(`[skipped] ${label} — no images`);
        summary.skipped += 1;
        continue;
      }

      logResults(label, results);
      tallyResults(summary, results);

      if (!dryRun && Object.keys(updates).length > 0) {
        await Project.updateOne({ _id: project._id }, updates);
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
