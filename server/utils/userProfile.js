const MOBILE_COUNTRY_CODE_PATTERN = /^\+\d{1,4}$/;
const MOBILE_LOCAL_NUMBER_PATTERN = /^\d{4,12}$/;

const normalizeMobileCountryCode = (value) => {
  if (!value) return "";
  const digits = String(value).replace(/[\s-+]/g, "");
  if (!digits) return "";
  return `+${digits}`;
};

const normalizeLocalMobileNumber = (value) => {
  if (!value) return "";
  return String(value).replace(/[\s-]/g, "");
};

const isValidMobileCountryCode = (value) => {
  const normalized = normalizeMobileCountryCode(value);
  return MOBILE_COUNTRY_CODE_PATTERN.test(normalized);
};

const isValidLocalMobileNumber = (value) => {
  const normalized = normalizeLocalMobileNumber(value);
  return MOBILE_LOCAL_NUMBER_PATTERN.test(normalized);
};

const normalizeInstagramUrl = (value) => {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";

  if (/^@?[\w.]+$/.test(trimmed) && !trimmed.includes("/")) {
    const handle = trimmed.replace(/^@/, "");
    return `https://instagram.com/${handle}`;
  }

  if (
    /^instagram\.com/i.test(trimmed) ||
    /^www\.instagram\.com/i.test(trimmed)
  ) {
    return `https://${trimmed.replace(/^www\./i, "")}`;
  }

  return trimmed;
};

const isValidInstagramUrl = (value) => {
  const normalized = normalizeInstagramUrl(value);
  if (!normalized) return false;

  try {
    const url = new URL(normalized);
    const host = url.hostname.replace(/^www\./, "");
    return host === "instagram.com" && url.pathname.length > 1;
  } catch {
    return false;
  }
};

const isValidHttpUrl = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeOptionalHttpUrl = (value) => {
  const trimmed = String(value ?? "").trim();
  return trimmed || "";
};

const hasCompleteMobile = (user) => {
  const code = user?.mobileCountryCode?.trim();
  const number = user?.mobileNumber?.trim();

  if (code && number) {
    return isValidMobileCountryCode(code) && isValidLocalMobileNumber(number);
  }

  const combined = (user?.mobileNumber || "").replace(/[\s-]/g, "");
  return /^\+\d{1,4}\d{4,12}$/.test(combined);
};

const isProfileComplete = (user) =>
  Boolean(hasCompleteMobile(user) && user?.instagramUrl?.trim());

const formatUserAuthResponse = (user) => {
  const mobileCountryCode = user.mobileCountryCode?.trim() || null;
  const mobileNumber = user.mobileNumber?.trim() || null;
  const instagramUrl = user.instagramUrl?.trim() || null;
  const avatarUrl = user.avatarUrl?.trim() || "";
  const bio = user.bio?.trim() || "";
  const location = user.location?.trim() || "";
  const facebookUrl = user.facebookUrl?.trim() || "";
  const xUrl = user.xUrl?.trim() || "";

  return {
    _id: user._id,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    username: user.username,
    role: user.role,
    isVerified: user.isVerified,
    mobileCountryCode,
    mobileNumber,
    instagramUrl,
    avatarUrl,
    bio,
    location,
    facebookUrl,
    xUrl,
    isProfileComplete: Boolean(hasCompleteMobile(user) && instagramUrl),
  };
};

module.exports = {
  normalizeMobileCountryCode,
  normalizeLocalMobileNumber,
  isValidMobileCountryCode,
  isValidLocalMobileNumber,
  hasCompleteMobile,
  normalizeInstagramUrl,
  isValidInstagramUrl,
  isValidHttpUrl,
  normalizeOptionalHttpUrl,
  isProfileComplete,
  formatUserAuthResponse,
};
