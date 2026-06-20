/**
 * Syncs User collection indexes for soft-delete support.
 * Email/username are unique across all accounts (including soft-deleted).
 *
 * Run: node scripts/migrateSoftDeleteIndexes.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/userModel");

async function migrateSoftDeleteIndexes() {
  const mongoURI = process.env.MONGO_URL;
  if (!mongoURI) {
    throw new Error("MONGO_URL is not set");
  }

  await mongoose.connect(mongoURI);
  console.log("Connected to MongoDB");

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
