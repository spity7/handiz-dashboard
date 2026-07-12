const COURSE_STATUS = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

const COURSE_STATUS_VALUES = Object.values(COURSE_STATUS);

const COURSE_LEVEL = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

const COURSE_LEVEL_VALUES = Object.values(COURSE_LEVEL);

const COURSE_CURRENCY = "USD";

const COURSE_DISCOUNT_TYPE = {
  PERCENT: "percent",
  FIXED: "fixed",
};

const COURSE_DISCOUNT_TYPE_VALUES = Object.values(COURSE_DISCOUNT_TYPE);

// Minimum amount charged at checkout for paid courses (USD).
// Aligns with common payment-processor floors; use "free course" for $0 enrollment.
const MIN_PAID_COURSE_PRICE = 1;

const LESSON_TYPE = {
  VIDEO: "video",
  TEXT: "text",
  QUIZ: "quiz",
  DOWNLOAD: "download",
};

const LESSON_TYPE_VALUES = Object.values(LESSON_TYPE);

const LESSON_CONTENT_BLOCK_TYPES = [
  "title",
  "description",
  "image",
  "quote",
  "video",
  "file",
  "code",
];

module.exports = {
  COURSE_STATUS,
  COURSE_STATUS_VALUES,
  COURSE_LEVEL,
  COURSE_LEVEL_VALUES,
  COURSE_CURRENCY,
  COURSE_DISCOUNT_TYPE,
  COURSE_DISCOUNT_TYPE_VALUES,
  MIN_PAID_COURSE_PRICE,
  LESSON_TYPE,
  LESSON_TYPE_VALUES,
  LESSON_CONTENT_BLOCK_TYPES,
};
