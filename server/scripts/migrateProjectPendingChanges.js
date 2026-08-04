/**
 * One-time migration: initialize pending-changes fields on existing projects.
 * Run from server folder: node scripts/migrateProjectPendingChanges.js
 */
require("../config/env");
const mongoose = require("mongoose");
const Project = require("../models/projectModel");

const migrate = async () => {
  await mongoose.connect(process.env.MONGO_URL);
  console.log("Connected to MongoDB");

  const result = await Project.updateMany(
    {
      $or: [
        { hasPendingChanges: { $exists: false } },
        { pendingSubmittedAt: { $exists: false } },
        { pendingSubmittedBy: { $exists: false } },
        { pendingChanges: { $exists: false } },
      ],
    },
    {
      $set: {
        hasPendingChanges: false,
        pendingSubmittedAt: null,
        pendingSubmittedBy: null,
        pendingChanges: null,
      },
    },
  );

  console.log(
    `Initialized pending-change fields on ${result.modifiedCount} project(s).`,
  );
  await mongoose.disconnect();
};

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
