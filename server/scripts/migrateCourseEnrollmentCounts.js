/**
 * Recomputes courses.enrollmentCount from active + completed enrollments.
 *
 * Run from server/: node scripts/migrateCourseEnrollmentCounts.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Course = require("../models/courseModel");
const {
  getCountableEnrollmentCountMap,
  reconcileCourseEnrollmentCounts,
} = require("../utils/courseHelpers");

async function migrateCourseEnrollmentCounts() {
  const mongoURI = process.env.MONGO_URL;
  if (!mongoURI) {
    throw new Error("MONGO_URL is not set");
  }

  await mongoose.connect(mongoURI);
  console.log("Connected to MongoDB");

  const courses = await Course.findWithDeleted({}).select(
    "_id enrollmentCount",
  );
  const countMap = await getCountableEnrollmentCountMap(
    courses.map((course) => course._id),
  );

  const beforeMismatch = courses.filter((course) => {
    const actual = countMap.get(String(course._id)) ?? 0;
    return (course.enrollmentCount ?? 0) !== actual;
  }).length;

  await reconcileCourseEnrollmentCounts(courses, countMap);

  console.log(
    `Reconciled enrollmentCount on ${beforeMismatch} of ${courses.length} course(s).`,
  );

  await mongoose.disconnect();
  console.log("Done");
}

migrateCourseEnrollmentCounts().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});
