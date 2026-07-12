const { ROLES } = require("../constants/permissions");
const { ENROLLMENT_STATUS } = require("../constants/enrollmentStatus");
const { COURSE_STATUS } = require("../constants/courseStatus");

const isStaff = (user) =>
  user?.role === ROLES.ADMIN || user?.role === ROLES.EDITOR;

const hasActiveEnrollment = (enrollment) =>
  enrollment?.status === ENROLLMENT_STATUS.ACTIVE ||
  enrollment?.status === ENROLLMENT_STATUS.COMPLETED;

const canManageCourses = (user) => isStaff(user);

const canAccessLesson = (user, lesson, enrollment) => {
  if (!lesson) return false;
  if (lesson.isPreview) return true;
  if (isStaff(user)) return true;
  if (!user || !enrollment) return false;
  return hasActiveEnrollment(enrollment);
};

const canEnrollInCourse = (user, course) => {
  if (!user || !course) return false;
  if (course.status !== COURSE_STATUS.PUBLISHED) return false;
  return true;
};

const getPublishedCourseFilter = () => ({
  status: COURSE_STATUS.PUBLISHED,
  deletedAt: null,
});

const isCourseAvailable = (course) =>
  Boolean(course && course.deletedAt == null);

module.exports = {
  isStaff,
  hasActiveEnrollment,
  canManageCourses,
  canAccessLesson,
  canEnrollInCourse,
  getPublishedCourseFilter,
  isCourseAvailable,
};
