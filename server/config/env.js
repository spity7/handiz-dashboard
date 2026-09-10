const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");
const examplePath = path.join(__dirname, "..", ".env.example");

const REQUIRED_KEYS = [
  "PORT",
  "MONGO_URL",
  "NODE_ENV",
  "JWT_SECRET",
  "BASE_URL",
];

const OPTIONAL_KEYS = [
  "LOG_LEVEL",
  "JWT_LIFETIME",
  "EMAIL_USER",
  "EMAIL_PASS",
  "HANDIZ_SITE_URL",
  "LMS_SITE_URL",
  "COOKIE_DOMAIN",
  "LESSON_DEVICE_ENFORCED",
  "GCS_BUCKET_NAME",
  "GCS_KEYFILE",
  "WHISH_CHANNEL",
  "WHISH_SECRET",
  "WHISH_WEBSITE_URL",
  "WHISH_ENVIRONMENT",
  "WHISH_SUCCESS_URL",
  "WHISH_CANCEL_URL",
  "VDOCIPHER_API_SECRET_KEY",
  "VDOCIPHER_WEBHOOK_SECRET",
  "VDOCIPHER_API_BASE",
  "VDOCIPHER_OTP_TTL",
  "VDOCIPHER_WATERMARK",
  "DASHBOARD_URL",
  "GOOGLE_CLIENT_ID",
];

if (fs.existsSync(envPath)) {
  require("dotenv-safe").config({
    path: envPath,
    example: examplePath,
    allowEmptyValues: true,
  });
} else {
  const missing = REQUIRED_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  OPTIONAL_KEYS.forEach((key) => {
    if (process.env[key] === undefined) {
      process.env[key] = "";
    }
  });
}
