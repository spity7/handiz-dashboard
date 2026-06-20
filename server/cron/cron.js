const cron = require("node-cron");
const { deleteUnverifiedUsers } = require("../controllers/userController");
const {
  cleanupNotifications,
} = require("../utils/helpers/notificationService");

// Run the job every 30 minutes
cron.schedule(
  "*/30 * * * *",
  () => {
    console.log("Running cron job to delete unverified users.");
    deleteUnverifiedUsers();
  },
  {
    timezone: "UTC",
  },
);

// Delete read notifications older than 90 days — daily at 03:00 UTC
cron.schedule(
  "0 3 * * *",
  () => {
    console.log("Running cron job to clean up old notifications.");
    cleanupNotifications();
  },
  {
    timezone: "UTC",
  },
);
