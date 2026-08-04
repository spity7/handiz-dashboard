const crypto = require("crypto");

const parseDeviceLabel = (userAgent = "") => {
  const ua = String(userAgent).toLowerCase();
  let browser = "Browser";
  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("chrome/")) browser = "Chrome";
  else if (ua.includes("firefox/")) browser = "Firefox";
  else if (ua.includes("safari/") && !ua.includes("chrome")) browser = "Safari";

  let os = "Unknown";
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac os")) os = "macOS";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";
  else if (ua.includes("linux")) os = "Linux";

  return `${browser} on ${os}`;
};

const hashIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    req.ip ||
    (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : "") ||
    "";
  return crypto.createHash("sha256").update(ip).digest("hex");
};

const getRequestMeta = (req) => ({
  userAgent: req.headers["user-agent"] || "",
  deviceLabel: parseDeviceLabel(req.headers["user-agent"]),
  ipHash: hashIp(req),
});

/** True for real browser requests; false for Next.js SSR / server-side fetch (UA "node", undici, etc.). */
const isBrowserLessonRequest = (req) => {
  const ua = String(req.headers["user-agent"] || "")
    .trim()
    .toLowerCase();
  if (!ua) return false;
  if (ua === "node" || ua.startsWith("node/") || ua.includes("undici")) {
    return false;
  }
  if (req.headers["sec-fetch-site"] || req.headers["sec-fetch-mode"]) {
    return true;
  }
  return /mozilla|chrome|safari|firefox|opera|edg/.test(ua);
};

module.exports = {
  parseDeviceLabel,
  hashIp,
  getRequestMeta,
  isBrowserLessonRequest,
};
