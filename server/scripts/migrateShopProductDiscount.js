/**
 * Removes legacy shop product `discount` subdocuments (promo discounts were removed;
 * pricing is list price + sale price only).
 *
 * Run from server/: node scripts/migrateShopProductDiscount.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const ShopProduct = require("../models/shopProductModel");

async function migrateShopProductDiscount() {
  const mongoURI = process.env.MONGO_URL;
  if (!mongoURI) {
    throw new Error("MONGO_URL is not set");
  }

  await mongoose.connect(mongoURI);
  console.log("Connected to MongoDB");

  const result = await ShopProduct.collection.updateMany(
    { discount: { $exists: true } },
    { $unset: { discount: "" } },
  );

  console.log(
    `Removed discount field from ${result.modifiedCount} product(s) (${result.matchedCount} matched).`,
  );

  await mongoose.disconnect();
}

migrateShopProductDiscount().catch((err) => {
  console.error(err);
  process.exit(1);
});
