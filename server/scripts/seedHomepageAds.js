/**
 * Seeds sample homepage ads for local/staging.
 *
 * Usage (from server/): node scripts/seedHomepageAds.js
 *
 * Requires MONGO_URL in server/.env and a reachable MongoDB instance.
 */
require("../config/env");
const mongoose = require("mongoose");
const { db } = require("../db/db");
const HomepageAd = require("../models/homepageAdModel");

const samples = [
  {
    title: "10 Simple Habits for a More Fulfilling Life",
    status: "available",
    metaSecondary: "PARTNER ONE",
    externalUrl: "https://handiz.org",
    thumbnailUrl:
      "https://handiz.org/images/feature-post/feature-item-small-7.webp",
    order: 1,
    isPublished: true,
  },
  {
    title: "Top Makeup Trends to Try This Spring",
    status: "available",
    metaSecondary: "PARTNER TWO",
    externalUrl: "https://handiz.org",
    thumbnailUrl:
      "https://handiz.org/images/feature-post/feature-item-small-8.webp",
    order: 2,
    isPublished: true,
  },
  {
    title: "Morning vs. Night Routine: What's the Difference?",
    status: "available",
    metaSecondary: "PARTNER THREE",
    externalUrl: "https://handiz.org",
    thumbnailUrl:
      "https://handiz.org/images/feature-post/feature-item-small-9.webp",
    order: 3,
    isPublished: true,
  },
  {
    title: "5 Superfoods You Should Be Eating Right Now",
    status: "available",
    metaSecondary: "PARTNER FOUR",
    externalUrl: "https://handiz.org",
    thumbnailUrl:
      "https://handiz.org/images/feature-post/feature-item-small-10.webp",
    order: 4,
    isPublished: true,
  },
];

async function run() {
  await db();

  const existing = await HomepageAd.countDocuments();
  if (existing > 0) {
    console.log(`Skipping seed: ${existing} homepage ad(s) already exist.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  await HomepageAd.insertMany(samples);
  console.log(`Inserted ${samples.length} homepage ads.`);
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
