const { hasPermission } = require("../constants/permissions");
const { ENROLLMENT_STATUS } = require("../constants/enrollmentStatus");
const { COURSE_STATUS } = require("../constants/courseStatus");

const canManageCourses = (user) => hasPermission(user?.role, "courses:manage");

// Course preview / bypass privileges align with courses:manage (Admin only).
const isStaff = (user) => canManageCourses(user);

const hasActiveEnrollment = (enrollment) =>
  enrollment?.status === ENROLLMENT_STATUS.ACTIVE ||
  enrollment?.status === ENROLLMENT_STATUS.COMPLETED;

const canAccessLesson = (user, lesson, enrollment) => {
  if (!lesson) return false;
  if (lesson.isPreview) return true;
  if (canManageCourses(user)) return true;
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

const getPublicCatalogFilter = () => ({
  status: { $in: [COURSE_STATUS.PUBLISHED, COURSE_STATUS.COMING_SOON] },
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
  getPublicCatalogFilter,
  isCourseAvailable,
};
