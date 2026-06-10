const { hasPermission } = require("../constants/permissions");

const authorizePermission = (permission) => (req, res, next) => {
  if (!req.user || !hasPermission(req.user.role, permission)) {
    return res
      .status(403)
      .json({ message: "Forbidden: insufficient permissions" });
  }
  next();
};

module.exports = authorizePermission;
