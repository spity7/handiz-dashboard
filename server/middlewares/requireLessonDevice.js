const { assertLessonDeviceAccess } = require("../utils/lessonDeviceAccess");

const requireLessonDevice = async (req, res, next) => {
  const allowed = await assertLessonDeviceAccess(req, res);
  if (!allowed) return;
  next();
};

module.exports = requireLessonDevice;
