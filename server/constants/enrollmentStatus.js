const ENROLLMENT_STATUS = {
  ACTIVE: "active",
  COMPLETED: "completed",
  REVOKED: "revoked",
};

const ENROLLMENT_STATUS_VALUES = Object.values(ENROLLMENT_STATUS);

const ENROLLMENT_SOURCE = {
  FREE: "free",
  WHISH: "whish",
  STRIPE: "stripe",
  ADMIN: "admin",
};

const ENROLLMENT_SOURCE_VALUES = Object.values(ENROLLMENT_SOURCE);

const ORDER_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
};

const ORDER_STATUS_VALUES = Object.values(ORDER_STATUS);

module.exports = {
  ENROLLMENT_STATUS,
  ENROLLMENT_STATUS_VALUES,
  ENROLLMENT_SOURCE,
  ENROLLMENT_SOURCE_VALUES,
  ORDER_STATUS,
  ORDER_STATUS_VALUES,
};
