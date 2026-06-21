/** Populate project owner including soft-deleted accounts. */
const CREATED_BY_POPULATE = {
  path: "createdBy",
  select:
    "firstname lastname username email role deletedAt mobileCountryCode mobileNumber instagramUrl",
  options: { includeDeleted: true },
};

module.exports = { CREATED_BY_POPULATE };
