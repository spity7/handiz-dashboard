const User = require("../models/userModel.js");
const jwt = require("jsonwebtoken");
const logger = require("../config/logger.js");

const protectRoute = async (req, res, next) => {
  try {
    // Get the JWT token from the cookies
    const token = req.cookies.jwt;

    // If there is no token, respond with an "Unauthorized" status
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    // Decode the token to extract the user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user by the decoded userId, excluding the password field
    const user = await User.findById(decoded.userId).select("-password");

    // Attach the user data to the request object for further use in the route handler
    req.user = user;

    // Pass control to the next middleware/route handler
    next();
  } catch (err) {
    // If there is an error (e.g., token verification fails), respond with a server error
    res.status(500).json({ message: err.message });
    logger.error("Error in protectRoute: ", err.message);
  }
};

module.exports = protectRoute;

