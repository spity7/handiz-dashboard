/**
 * Seeds sample homepage ads for local/staging.
 *
 * Usage (from server/): node scripts/seedHomepageAds.js
 *
 * Manual test matrix (storefront):
 * - 0 published ads → strip hidden
 * - 1–4 ads → grid columns per breakpoint
 * - 5+ ads → swiper scroll + mobile dots
 * - Unpublished / outside schedule → hidden on public GET
 * - Dark mode → meta contrast on homepage-2
 */
require("../config/env");
const { db } = require("../db/db");
const HomepageAd = require("../models/homepageAdModel");

const samples = [
  {
    title: "10 Simple Habits for a More Fulfilling Life",
    metaPrimary: "SPONSORED",
    metaSecondary: "PARTNER ONE",
    externalUrl: "https://handiz.org",
    thumbnailUrl:
      "https://handiz.org/images/feature-post/feature-item-small-7.webp",
    order: 1,
    isPublished: true,
  },
  {
    title: "Top Makeup Trends to Try This Spring",
    metaPrimary: "SPONSORED",
    metaSecondary: "PARTNER TWO",
    externalUrl: "https://handiz.org",
    thumbnailUrl:
      "https://handiz.org/images/feature-post/feature-item-small-8.webp",
    order: 2,
    isPublished: true,
  },
  {
    title: "Morning vs. Night Routine: What's the Difference?",
    metaPrimary: "SPONSORED",
    metaSecondary: "PARTNER THREE",
    externalUrl: "https://handiz.org",
    thumbnailUrl:
      "https://handiz.org/images/feature-post/feature-item-small-9.webp",
    order: 3,
    isPublished: true,
  },
  {
    title: "5 Superfoods You Should Be Eating Right Now",
    metaPrimary: "SPONSORED",
    metaSecondary: "PARTNER FOUR",
    externalUrl: "https://handiz.org",
    thumbnailUrl:
      "https://handiz.org/images/feature-post/feature-item-small-10.webp",
    order: 4,
    isPublished: true,
  },
];

async function run() {
  await db;
  const existing = await HomepageAd.countDocuments();
  if (existing > 0) {
    console.log(`Skipping seed: ${existing} homepage ad(s) already exist.`);
    process.exit(0);
  }
  await HomepageAd.insertMany(samples);
  console.log(`Inserted ${samples.length} homepage ads.`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
