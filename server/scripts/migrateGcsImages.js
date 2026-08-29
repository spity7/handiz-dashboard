/**
 * Re-compress existing GCS-hosted images across dashboard entities.
 *
 * Run from server directory (with MONGO_URL and GCS env in .env):
 *   node scripts/migrateGcsImages.js --entity=all
 *   node scripts/migrateGcsImages.js --entity=competitions --dry-run
 *   node scripts/migrateGcsImages.js --entity=projects,offices,services
 *
 * Entities: projects, competitions, offices, aiTools, aboutUs, services,
 *           courses, lessons, users, all
 */
require("../config/env");
const mongoose = require("mongoose");
const Project = require("../models/projectModel");
const Competition = require("../models/competitionModel");
const Office = require("../models/officeModel");
const AiTool = require("../models/aiToolModel");
const AboutUs = require("../models/aboutUsModel");
const Service = require("../models/serviceModel");
const Course = require("../models/courseModel");
const Lesson = require("../models/lessonModel");
const User = require("../models/userModel");
const {
  migrateProjectDoc,
  migrateThumbnailAndGallery,
  migrateContentBlockImages,
  migrateCourseDoc,
  migrateLessonDoc,
  migrateUserDoc,
  migrateServiceDoc,
  createSummary,
  tallyResults,
  logResults,
} = require("../utils/gcsImageMigration");

const dryRun = process.argv.includes("--dry-run");

function parseEntitiesArg() {
  const entityArg = process.argv.find((arg) => arg.startsWith("--entity="));
  const raw = entityArg ? entityArg.split("=")[1] : "all";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

async function persistUpdates(Model, docId, updates, dryRunMode) {
  if (dryRunMode || !updates || Object.keys(updates).length === 0) return;
  await Model.updateOne({ _id: docId }, updates);
}

async function runEntityMigration({
  name,
  Model,
  query = {},
  select,
  migrateDoc,
  label = name,
}) {
  const docs = await Model.find(query).select(select).lean();
  console.log(`\n=== ${label}: ${docs.length} record(s) ===\n`);

  const summary = createSummary();
  const urlCache = new Map();

  for (const doc of docs) {
    try {
      const {
        label: docLabel,
        updates,
        results,
      } = await migrateDoc(doc, {
        dryRun,
        urlCache,
      });

      if (!results.length) {
        console.log(`[skipped] ${docLabel} — no images`);
        summary.skipped += 1;
        continue;
      }

      logResults(docLabel, results);
      tallyResults(summary, results);
      await persistUpdates(Model, doc._id, updates, dryRun);
    } catch (err) {
      summary.error += 1;
      console.error(`[error] ${doc._id} — ${err.message}`);
    }
  }

  console.log(`\n${label} done:`, summary);
  return summary;
}

async function migrateProjects() {
  return runEntityMigration({
    name: "projects",
    label: "student projects",
    Model: Project,
    select: "_id title thumbnailUrl gallery contentBlocks",
    migrateDoc: migrateProjectDoc,
  });
}

async function migrateCompetitions() {
  return runEntityMigration({
    name: "competitions",
    Model: Competition,
    select: "_id title thumbnailUrl gallery",
    migrateDoc: (doc, options) =>
      migrateThumbnailAndGallery(doc, {
        ...options,
        labelField: "title",
        thumbnailFolder: "competitions/thumbnails",
        galleryFolder: "competitions/gallery",
      }),
  });
}

async function migrateOffices() {
  return runEntityMigration({
    name: "offices",
    Model: Office,
    select: "_id title thumbnailUrl gallery",
    migrateDoc: (doc, options) =>
      migrateThumbnailAndGallery(doc, {
        ...options,
        labelField: "title",
        thumbnailFolder: "offices/thumbnails",
        galleryFolder: "offices/gallery",
      }),
  });
}

async function migrateAiTools() {
  return runEntityMigration({
    name: "aiTools",
    label: "AI tools",
    Model: AiTool,
    select: "_id title thumbnailUrl gallery",
    migrateDoc: (doc, options) =>
      migrateThumbnailAndGallery(doc, {
        ...options,
        labelField: "title",
        thumbnailFolder: "aiTools/thumbnails",
        galleryFolder: "aiTools/gallery",
      }),
  });
}

async function migrateAboutUs() {
  return runEntityMigration({
    name: "aboutUs",
    label: "about us",
    Model: AboutUs,
    select: "_id contentBlocks",
    migrateDoc: (doc, options) =>
      migrateContentBlockImages(doc, {
        ...options,
        labelField: "_id",
        folder: "about-us/blocks",
      }),
  });
}

async function migrateServices() {
  return runEntityMigration({
    name: "services",
    Model: Service,
    select: "_id name iconUrl",
    migrateDoc: migrateServiceDoc,
  });
}

async function migrateCourses() {
  return runEntityMigration({
    name: "courses",
    Model: Course,
    select: "_id title thumbnailUrl heroImageDesktopUrl heroImageMobileUrl",
    migrateDoc: migrateCourseDoc,
  });
}

async function migrateLessons() {
  return runEntityMigration({
    name: "lessons",
    Model: Lesson,
    select: "_id title contentBlocks resources",
    migrateDoc: migrateLessonDoc,
  });
}

async function migrateUsers() {
  return runEntityMigration({
    name: "users",
    Model: User,
    query: { avatarUrl: { $exists: true, $ne: "" } },
    select: "_id email avatarUrl",
    migrateDoc: migrateUserDoc,
  });
}

const ENTITY_RUNNERS = {
  projects: migrateProjects,
  competitions: migrateCompetitions,
  offices: migrateOffices,
  aiTools: migrateAiTools,
  aboutUs: migrateAboutUs,
  services: migrateServices,
  courses: migrateCourses,
  lessons: migrateLessons,
  users: migrateUsers,
};

async function main() {
  const mongoURI = process.env.MONGO_URL;
  if (!mongoURI) {
    console.error("MONGO_URL is not set");
    process.exit(1);
  }

  const requested = parseEntitiesArg();
  const entities =
    requested.includes("all") || requested.length === 0
      ? Object.keys(ENTITY_RUNNERS)
      : requested;

  const unknown = entities.filter((entity) => !ENTITY_RUNNERS[entity]);
  if (unknown.length > 0) {
    console.error(`Unknown entity(ies): ${unknown.join(", ")}`);
    console.error(
      `Valid values: ${Object.keys(ENTITY_RUNNERS).join(", ")}, all`,
    );
    process.exit(1);
  }

  if (dryRun) {
    console.log("DRY RUN — no files or database records will be changed.\n");
  }

  await mongoose.connect(mongoURI);

  const totals = createSummary();

  for (const entity of entities) {
    const summary = await ENTITY_RUNNERS[entity]();
    for (const key of Object.keys(totals)) {
      totals[key] += summary[key] || 0;
    }
  }

  console.log("\nOverall done:", totals);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
