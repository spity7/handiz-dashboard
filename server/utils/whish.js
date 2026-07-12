const { WhishClient, parseCallbackUrl } = require("whish-pay");

let client = null;

const getWhishClient = () => {
  if (!client && process.env.WHISH_CHANNEL && process.env.WHISH_SECRET) {
    client = new WhishClient({
      channel: process.env.WHISH_CHANNEL,
      secret: process.env.WHISH_SECRET,
      websiteUrl:
        process.env.WHISH_WEBSITE_URL ||
        process.env.HANDIZ_SITE_URL ||
        "https://handiz.org",
      environment:
        process.env.WHISH_ENVIRONMENT ||
        (process.env.NODE_ENV === "production" ? "production" : "sandbox"),
    });
  }
  return client;
};

const normalizeWhishCurrency = (currency) => {
  const value = String(currency || "USD").toUpperCase();
  if (value === "USD" || value === "LBP" || value === "AED") return value;
  return "USD";
};

const buildCallbackUrl = (req) => {
  const base = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
  return `${base.replace(/\/$/, "")}${req.originalUrl}`;
};

module.exports = {
  getWhishClient,
  parseCallbackUrl,
  normalizeWhishCurrency,
  buildCallbackUrl,
};
