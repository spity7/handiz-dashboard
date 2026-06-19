/**
 * Migrates User collection indexes for soft-delete support.
 * Drops legacy unique indexes on email/username/googleId and syncs partial indexes.
 *
 * Run: node scripts/migrateSoftDeleteIndexes.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/userModel");

const LEGACY_INDEX_NAMES = ["email_1", "username_1", "googleId_1"];

async function migrateSoftDeleteIndexes() {
  const mongoURI = process.env.MONGO_URL;
  if (!mongoURI) {
    throw new Error("MONGO_URL is not set");
  }

  await mongoose.connect(mongoURI);
  console.log("Connected to MongoDB");

  const collection = User.collection;
  const existingIndexes = await collection.indexes();

  for (const indexName of LEGACY_INDEX_NAMES) {
    const hasLegacyIndex = existingIndexes.some(
      (idx) => idx.name === indexName,
    );
    if (hasLegacyIndex) {
      console.log(`Dropping legacy index: ${indexName}`);
      await collection.dropIndex(indexName);
    }
  }

  console.log("Syncing User indexes...");
  await User.syncIndexes();
  console.log("User indexes synced successfully");

  await mongoose.disconnect();
  console.log("Done");
}

migrateSoftDeleteIndexes().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});
