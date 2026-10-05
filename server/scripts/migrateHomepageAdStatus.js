/**
 * Replaces legacy metaPrimary with status on HomepageAd documents.
 *
 * Usage (from server/): node scripts/migrateHomepageAdStatus.js
 */
require("../config/env");
const mongoose = require("mongoose");
const { db } = require("../db/db");
const HomepageAd = require("../models/homepageAdModel");

async function run() {
  await db();

  const result = await HomepageAd.updateMany(
    {
      $or: [{ status: { $exists: false } }, { status: null }, { status: "" }],
    },
    { $set: { status: "available" }, $unset: { metaPrimary: "" } },
  );

  console.log(
    `Migrated ${result.modifiedCount} homepage ad(s) to status field.`,
  );
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
