const jwt = require("jsonwebtoken");
const logger = require("../../config/logger.js");
const { getCookieOptions, lifetimeToMs } = require("./cookieOptions");

// Function to generate and set a JWT token as a cookie
const generateTokenAndSetCookie = (userId, res) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in the environment variables");
  }

  const lifetime = process.env.JWT_LIFETIME || "7d";

  try {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: lifetime,
    });

    res.cookie("jwt", token, getCookieOptions(lifetimeToMs(lifetime)));

    return token;
  } catch (error) {
    logger.error("Error generating token:", error);
    throw new Error("Could not generate token");
  }
};

module.exports = generateTokenAndSetCookie;
