const jwt = require("jsonwebtoken");
const logger = require("../../config/logger.js");

// Function to generate and set a JWT token as a cookie
const generateTokenAndSetCookie = (userId, res) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in the environment variables");
  }

  try {
    // Generating JWT token with expiration of 1 day
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Setting the token as a cookie in the response
    res.cookie("jwt", token, {
      httpOnly: true, // prevents client-side JS from accessing the cookie
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
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
