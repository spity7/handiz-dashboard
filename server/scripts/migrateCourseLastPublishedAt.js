/**
 * Backfills lastPublishedAt for courses that were published before the field existed.
 * Uses updatedAt when the course is currently published and was modified after first publish.
 *
 * Run: node scripts/migrateCourseLastPublishedAt.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Course = require("../models/courseModel");
const { COURSE_STATUS } = require("../constants/courseStatus");

async function migrateCourseLastPublishedAt() {
  const mongoURI = process.env.MONGO_URL;
  if (!mongoURI) {
    throw new Error("MONGO_URL is not set");
  }

  await mongoose.connect(mongoURI);
  console.log("Connected to MongoDB");

  const courses = await Course.find({
    publishedAt: { $ne: null },
    lastPublishedAt: null,
  }).select("status publishedAt updatedAt");

  let updated = 0;
  for (const course of courses) {
    const publishedAt = new Date(course.publishedAt);
    const updatedAt = course.updatedAt
      ? new Date(course.updatedAt)
      : publishedAt;
    const lastPublishedAt =
      course.status === COURSE_STATUS.PUBLISHED && updatedAt > publishedAt
        ? updatedAt
        : publishedAt;

    course.lastPublishedAt = lastPublishedAt;
    await course.save();
    updated += 1;
  }

  console.log(`Backfilled lastPublishedAt on ${updated} course(s).`);

  await mongoose.disconnect();
  console.log("Done");
}

migrateCourseLastPublishedAt().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});
