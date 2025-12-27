const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    // If there is no user or the user's role is not in the allowed roles, deny access
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden Access with this users role!" });
    }

    // If the user is authorized, pass control to the next middleware/route handler
    next();
  };
};

module.exports = authorizeRole;
