const HOMEPAGE_AD_STATUSES = Object.freeze([
  "available",
  "coming_soon",
  "sold_out",
  "limited",
]);

const HOMEPAGE_AD_STATUS_LABELS = {
  available: "Available",
  coming_soon: "Coming Soon",
  sold_out: "Sold Out",
  limited: "Limited",
};

function isValidHomepageAdStatus(value) {
  return HOMEPAGE_AD_STATUSES.includes(value);
}

function normalizeHomepageAdStatus(value) {
  const s = String(value || "").trim();
  if (isValidHomepageAdStatus(s)) return s;
  return null;
}

module.exports = {
  HOMEPAGE_AD_STATUSES,
  HOMEPAGE_AD_STATUS_LABELS,
  isValidHomepageAdStatus,
  normalizeHomepageAdStatus,
};
