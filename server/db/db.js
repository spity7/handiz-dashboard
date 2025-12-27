const mongoose = require("mongoose");
const logger = require("../config/logger.js");

const db = async () => {
  try {
    const mongoURI = process.env.MONGO_URL;
    if (!mongoURI) {
      throw new Error("MONGO_URL is not set! Make sure your .env file exists.");
    }

    mongoose.set("strictQuery", false);

    logger.info("Connecting to MongoDB...");

    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });

    logger.info("Successfully connected to MongoDB.");
  } catch (error) {
    logger.error(`DB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { db };
