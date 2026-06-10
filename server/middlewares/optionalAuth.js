const User = require("../models/userModel.js");
const jwt = require("jsonwebtoken");

/**
 * Attaches req.user when a valid JWT cookie is present; continues otherwise.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.jwt;
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    if (user) req.user = user;
    next();
  } catch {
    next();
  }
};

module.exports = optionalAuth;
