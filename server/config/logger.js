const winston = require("winston");
const path = require("path");
const DailyRotateFile = require("winston-daily-rotate-file");

// Log level based on environment or custom LOG_LEVEL in .env
const logLevel =
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

// Log format with timestamp, stack trace, and improved readability for errors
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), // Timestamp format
  winston.format.errors({ stack: true }), // Capture stack trace for errors
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${
      stack ? `\n${stack}` : ""
    }`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: logLevel, // Log level (e.g., info, debug, error)
  format: logFormat, // Format for logs
  transports: [
    // Console logging (only in development)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Colorize console output
        winston.format.simple() // Simple output format for console
      ),
    }),

    // Error logs (only at error level)
    new DailyRotateFile({
      filename: path.join(__dirname, "../logs/error-%DATE%.log"),
      datePattern: "YYYY-MM-DD", // Daily log rotation
      level: "error", // Only log errors
      maxFiles: "14d", // Keep logs for 14 days
      zippedArchive: true, // Compress old logs into .gz files
    }),

    // Combined logs (info, warn, error)
    new DailyRotateFile({
      filename: path.join(__dirname, "../logs/combined-%DATE%.log"),
      datePattern: "YYYY-MM-DD", // Daily log rotation
      maxFiles: "14d", // Keep logs for 14 days
      zippedArchive: true, // Compress old logs into .gz files
    }),

    // Debug logs (only when the log level is set to "debug")
    ...(logLevel === "debug"
      ? [
          new DailyRotateFile({
            filename: path.join(__dirname, "../logs/debug-%DATE%.log"),
            datePattern: "YYYY-MM-DD", // Daily log rotation
            level: "debug", // Only log debug messages
            maxFiles: "14d", // Keep debug logs for 14 days
          }),
        ]
      : []),
  ],
});

// Error handling for log transports
logger.transports.forEach((transport) => {
  transport.on("error", (err) => {
    console.error("Logging error:", err);
  });
});

module.exports = logger;
