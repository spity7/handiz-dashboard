/**
 * One-time migration: AiTool.category was a string; it is now an ObjectId ref.
 *
 * Run from repo root (with MONGO_URL in .env):
 *   node server/scripts/migrateAiToolCategoryRefs.js
 *
 * Safe to run multiple times (skips documents that already use ObjectIds).
 */
require("dotenv-safe").config();
const mongoose = require("mongoose");
const AiPromptCategory = require("../models/aiPromptCategoryModel");

async function main() {
  const mongoURI = process.env.MONGO_URL;
  if (!mongoURI) {
    console.error("MONGO_URL is not set");
    process.exit(1);
  }

  await mongoose.connect(mongoURI);
  const col = mongoose.connection.db.collection("aitools");

  const stringDocs = await col
    .find({ category: { $type: "string" } })
    .toArray();
  if (stringDocs.length === 0) {
    console.log("No aiTools with string category — nothing to migrate.");
    await mongoose.disconnect();
    return;
  }

  const nameToId = new Map();
  for (const doc of stringDocs) {
    const name = String(doc.category || "").trim();
    if (!name) continue;
    if (!nameToId.has(name)) {
      let cat = await AiPromptCategory.findOne({ name });
      if (!cat) {
        cat = await AiPromptCategory.create({ name });
        console.log("Created category:", name);
      }
      nameToId.set(name, cat._id);
    }
  }

  for (const doc of stringDocs) {
    const name = String(doc.category || "").trim();
    const id = nameToId.get(name);
    if (!id) continue;
    await col.updateOne({ _id: doc._id }, { $set: { category: id } });
  }

  console.log(`Migrated ${stringDocs.length} aiTool(s) to category refs.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
