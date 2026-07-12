const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { db } = require("./db/db");
const compression = require("compression");
const helmet = require("helmet");
const rateLimiter = require("./middlewares/rateLimiter");
const securityHeaders = require("./middlewares/securityHeaders");
const csp = require("./middlewares/csp");
const userRoutes = require("./routes/userRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const projectRoutes = require("./routes/projectRoutes");
const competitionRoutes = require("./routes/competitionRoutes");
const aiToolsRoutes = require("./routes/aiToolsRoutes");
const officeRoutes = require("./routes/officeRoutes");
const aboutUsRoutes = require("./routes/aboutUsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const courseRoutes = require("./routes/courseRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const progressRoutes = require("./routes/progressRoutes");
const vdocipherRoutes = require("./routes/vdocipherRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const { handleVdocipherWebhook } = require("./controllers/vdocipherController");
const logger = require("./config/logger");
require("./cron/cron");

require("./config/env");

const app = express();
const PORT = process.env.PORT;

// Whish Pay callbacks — mount before JSON parser (GET with query params)
app.use("/api/v1", webhookRoutes);

// Middlewares
app.use(
  express.json({
    limit: "100mb",
    verify: (req, _res, buf) => {
      if (String(req.originalUrl || "").includes("/webhooks/vdocipher")) {
        req.rawBody = buf.toString("utf8");
      }
    },
  }),
);
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3017",
      "http://localhost:3021",
      "http://localhost:5016",
      "https://handiz.org",
      "https://learn.handiz.org",
      "https://dashboard.handiz.org",
      "https://api.handiz.org",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Auth-Token",
      "X-Vdocipher-Signature",
      "X-Webhook-Signature",
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400, // Cache for Preflight-requests for 24 hours (86400 sec)
  }),
);
app.use(cookieParser());
app.use(rateLimiter);
app.use(helmet());
app.use(compression());
app.use(csp);
app.use(securityHeaders);

// Routes
app.use("/api/v1", userRoutes);
app.use("/api/v1", serviceRoutes);
app.use("/api/v1", projectRoutes);
app.use("/api/v1", competitionRoutes);
app.use("/api/v1", aiToolsRoutes);
app.use("/api/v1", officeRoutes);
app.use("/api/v1", aboutUsRoutes);
app.use("/api/v1", notificationRoutes);
app.use("/api/v1", courseRoutes);
app.use("/api/v1", enrollmentRoutes);
app.use("/api/v1", progressRoutes);
app.use("/api/v1", vdocipherRoutes);
app.post("/api/v1/webhooks/vdocipher", handleVdocipherWebhook);
// app.use("/api/v1", propertyRoutes);

// errorhandling for Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message || "Something broke!",
  });
});

const server = () => {
  db();
  app.listen(PORT, () => {
    logger.info(`Listening on port: ${PORT}`);
  });
};

server();
