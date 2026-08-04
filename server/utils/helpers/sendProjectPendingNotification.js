const nodemailer = require("nodemailer");
const User = require("../../models/userModel");
const { ROLES } = require("../../constants/permissions");
const logger = require("../../config/logger");
const { upsertUnreadNotification } = require("./notificationService");

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

const buildNotificationContent = (project, submittedBy, isUpdate) => {
  const submitter = submittedBy?.firstname || "A user";
  const projectTitle = project.title;

  if (isUpdate) {
    return {
      title: "Student project updated — pending review",
      message: `${submitter} updated "${projectTitle}". The live version stays on handiz.org until you approve the changes.`,
    };
  }

  return {
    title: "New student project pending review",
    message: `${submitter} submitted "${projectTitle}" for review.`,
  };
};

const notifyProjectPending = async (project, submittedBy, isUpdate = false) => {
  const reviewers = await User.find({
    role: { $in: [ROLES.ADMIN, ROLES.EDITOR] },
    isVerified: true,
  }).select("_id email firstname");

  if (!reviewers.length) return;

  const { title, message } = buildNotificationContent(
    project,
    submittedBy,
    isUpdate,
  );
  const link = `/ecommerce/student-projects?project=${project._id}`;
  const emailRecipients = [];

  await Promise.all(
    reviewers.map(async (reviewer) => {
      const { created } = await upsertUnreadNotification({
        recipientId: reviewer._id,
        type: "project_pending",
        title,
        message,
        link,
        relatedProjectId: project._id,
      });

      if (created && reviewer.email) {
        emailRecipients.push(reviewer.email);
      }
    }),
  );

  if (!emailRecipients.length || !process.env.EMAIL_USER || !DASHBOARD_URL) {
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      bcc: emailRecipients.join(","),
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
