const { getCookieOptions, lifetimeToMs } = require("./cookieOptions");

const LESSON_DEVICE_COOKIE = "lesson_device";

const getLessonDeviceCookieOptions = () => {
  const lifetime = process.env.JWT_LIFETIME || "7d";
  return getCookieOptions(lifetimeToMs(lifetime));
};

const setLessonDeviceCookie = (res, sessionId) => {
  res.cookie(LESSON_DEVICE_COOKIE, sessionId, getLessonDeviceCookieOptions());
};

const clearLessonDeviceCookie = (res) => {
  res.clearCookie(LESSON_DEVICE_COOKIE, getLessonDeviceCookieOptions());
};

module.exports = {
  LESSON_DEVICE_COOKIE,
  setLessonDeviceCookie,
  clearLessonDeviceCookie,
};
