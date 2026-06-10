const nodemailer = require("nodemailer");
const User = require("../../models/userModel");
const Notification = require("../../models/notificationModel");
const { ROLES } = require("../../constants/permissions");
const logger = require("../../config/logger");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false },
});

const DASHBOARD_URL = process.env.DASHBOARD_URL;

const notifyProjectPending = async (project, submittedBy) => {
  const reviewers = await User.find({
    role: { $in: [ROLES.ADMIN, ROLES.EDITOR] },
    isVerified: true,
  }).select("_id email firstname");

  if (!reviewers.length) return;

  const title = "New student project pending review";
  const message = `${submittedBy?.firstname || "A user"} submitted "${project.title}" for review.`;
  const link = `/ecommerce/student-projects/edit/${project._id}`;

  await Notification.insertMany(
    reviewers.map((r) => ({
      recipientId: r._id,
      type: "project_pending",
      title,
      message,
      link,
      relatedProjectId: project._id,
    })),
  );

  const emails = reviewers.map((r) => r.email).filter(Boolean);
  if (!emails.length || !process.env.EMAIL_USER) return;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: emails.join(","),
      subject: title,
      html: `
        <p>${message}</p>
        <p><a href="${DASHBOARD_URL}${link}">Review in dashboard</a></p>
      `,
    });
  } catch (err) {
    logger.error("Failed to send project pending email:", err.message);
  }
};

module.exports = notifyProjectPending;
