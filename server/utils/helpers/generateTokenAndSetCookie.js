const jwt = require("jsonwebtoken");
const logger = require("../../config/logger.js");

function lifetimeToMs(value) {
  const match = String(value || "7d")
    .trim()
    .match(/^(\d+)([smhd])$/i);
  if (!match) return 7 * 24 * 60 * 60 * 1000;

  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * multipliers[unit];
}

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

    // Setting the token as a cookie in the response
    res.cookie("jwt", token, {
      httpOnly: true, // prevents client-side JS from accessing the cookie
      path: "/",
      maxAge: lifetimeToMs(lifetime),
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // CSRF protection
      secure: process.env.NODE_ENV === "production", // only set as secure cookie in production
    });

    return token;
  } catch (error) {
    logger.error("Error generating token:", error);
    throw new Error("Could not generate token");
  }
};

module.exports = generateTokenAndSetCookie;
