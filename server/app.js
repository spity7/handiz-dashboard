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
const logger = require("./config/logger");
require("./cron/cron");

require("dotenv-safe").config();

const app = express();
const PORT = process.env.PORT;

// Middlewares
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:5016",
      "https://handiz.org",
      "https://dashboard.handiz.org",
      "https://api.handiz.org",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Auth-Token",
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400, // Cache for Preflight-requests for 24 hours (86400 sec)
  })
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
// app.use("/api/v1", propertyRoutes);

// errorhandling for Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

const server = () => {
  db();
  app.listen(PORT, () => {
    logger.info(`Listening on port: ${PORT}`);
  });
};

server();
