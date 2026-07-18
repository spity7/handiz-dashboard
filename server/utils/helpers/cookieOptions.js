function lifetimeToMs(value) {
  const match = String(value || "7d")
    .trim()
    .match(/^(\d+)([smhd])$/i);
  if (!match) return 7 * 24 * 60 * 60 * 1000;

  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * multipliers[unit];
}

const getCookieOptions = (maxAge) => {
  const isProd = process.env.NODE_ENV === "production";
  const options = {
    httpOnly: true,
    path: "/",
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
  };

  if (maxAge !== undefined) {
    options.maxAge = maxAge;
  }

  const domain = process.env.COOKIE_DOMAIN?.trim();
  if (domain) {
    options.domain = domain;
  }

  return options;
};

module.exports = { getCookieOptions, lifetimeToMs };
