const cron = require("node-cron");
const { deleteUnverifiedUsers } = require("../controllers/userController");

// Run the job every 30 minutes
cron.schedule(
  "*/30 * * * *",
  () => {
    console.log("Running cron job to delete unverified users.");
    deleteUnverifiedUsers();
  },
  {
    timezone: "UTC",
  }
);
