const { isProfileComplete } = require("../utils/userProfile");

const requireProfileComplete = (req, res, next) => {
  if (!isProfileComplete(req.user)) {
    return res.status(403).json({
      error:
        "Please add your mobile number and Instagram URL to your account before creating or editing student projects.",
      code: "PROFILE_INCOMPLETE",
    });
  }
  next();
};

module.exports = requireProfileComplete;
