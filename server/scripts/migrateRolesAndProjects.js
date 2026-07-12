/**
 * One-time migration: assign status/ownership to legacy projects.
 * Run from server folder: node scripts/migrateRolesAndProjects.js
 *
 * Uses raw MongoDB updates so Mongoose schema defaults (status: Pending)
 * do not mask documents that have no status field in the database yet.
 */
require("../config/env");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const Project = require("../models/projectModel");
const { PROJECT_STATUS } = require("../constants/projectStatus");
const { ROLES } = require("../constants/permissions");

const run = async () => {
  await mongoose.connect(process.env.MONGO_URL);

  const admin = await User.findOne({ role: ROLES.ADMIN });
  if (!admin) {
    console.error(
      "No Admin user found. Create an Admin before migrating projects.",
    );
    process.exit(1);
  }

  const ownershipResult = await Project.collection.updateMany(
    { createdBy: { $exists: false } },
    {
      $set: {
        createdBy: admin._id,
        createdByRole: ROLES.ADMIN,
      },
    },
  );

  const publishResult = await Project.collection.updateMany(
    { status: { $exists: false } },
    {
      $set: {
        status: PROJECT_STATUS.PUBLISHED,
        publishedAt: new Date(),
        publishedBy: admin._id,
      },
    },
  );

  // Repair: first migration run saved Pending because Mongoose applied the
  // schema default before save. Legacy rows are Admin-attributed with no publish metadata.
  const repairResult = await Project.collection.updateMany(
    {
      status: PROJECT_STATUS.PENDING,
      createdByRole: ROLES.ADMIN,
      publishedBy: { $exists: false },
    },
    {
      $set: {
        status: PROJECT_STATUS.PUBLISHED,
        publishedAt: new Date(),
        publishedBy: admin._id,
      },
    },
  );

  // Prefer original createdAt for publishedAt on repaired legacy rows
  const legacyPublished = await Project.find({
    status: PROJECT_STATUS.PUBLISHED,
    publishedBy: admin._id,
  }).select("createdAt publishedAt");

  for (const project of legacyPublished) {
    if (project.createdAt && project.publishedAt) {
      const publishedAt = project.createdAt;
      if (project.publishedAt.getTime() !== publishedAt.getTime()) {
        await Project.collection.updateOne(
          { _id: project._id },
          { $set: { publishedAt } },
        );
      }
    }
  }

  console.log("Migration complete:");
  console.log(`  ownership set on ${ownershipResult.modifiedCount} project(s)`);
  console.log(
    `  published ${publishResult.modifiedCount} project(s) (no status in DB)`,
  );
  console.log(
    `  repaired ${repairResult.modifiedCount} project(s) (Pending → Published)`,
  );

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
