const getLmsSiteUrl = () => {
  const fromEnv = process.env.LMS_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return process.env.NODE_ENV === "development"
    ? "http://localhost:3001"
    : "https://learn.handiz.org";
};

const buildLmsUrl = (path) => {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getLmsSiteUrl()}${normalized}`;
};

module.exports = {
  getLmsSiteUrl,
  buildLmsUrl,
};
