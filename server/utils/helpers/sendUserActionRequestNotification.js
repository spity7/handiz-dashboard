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

const notifyUserActionRequest = async (request, requestedBy, targetUser) => {
  const admins = await User.find({
    role: ROLES.ADMIN,
    isVerified: true,
  }).select("_id email firstname");

  if (!admins.length) return;

  const title = "New user management request";
  const message =
    `${requestedBy?.firstname || "An editor"} ${requestedBy?.lastname || ""}`.trim() +
    ` requested to ${request.action} user ${targetUser?.username || "unknown"}.`;
  const link = `/pages/user-requests?request=${request._id}`;

  await Notification.insertMany(
    admins.map((admin) => ({
      recipientId: admin._id,
      type: "user_action_request",
      title,
      message,
      link,
      relatedRequestId: request._id,
    })),
  );

  const emails = admins.map((admin) => admin.email).filter(Boolean);
  if (!emails.length || !process.env.EMAIL_USER) return;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: emails.join(","),
      subject: title,
      html: `
        <p>${message}</p>
        <p><a href="${DASHBOARD_URL}${link}">Review request in dashboard</a></p>
      `,
    });
  } catch (err) {
    logger.error("Failed to send user action request email:", err.message);
  }
};

module.exports = notifyUserActionRequest;
