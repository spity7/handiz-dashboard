const nodemailer = require("nodemailer");
const logger = require("../../config/logger");

let transporter;

const isEmailConfigured = () =>
  Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const getTransporter = () => {
  if (!isEmailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: { rejectUnauthorized: false },
    });
  }
  return transporter;
};

/**
 * @param {{ to?: string; bcc?: string; subject: string; html: string }} options
 */
const sendMailSafe = async ({ to, bcc, subject, html }) => {
  const transport = getTransporter();
  if (!transport) return false;
  if (!to && !bcc) return false;

  try {
    await transport.sendMail({
      from: process.env.EMAIL_USER,
      ...(to ? { to } : {}),
      ...(bcc ? { bcc } : {}),
      subject,
      html,
    });
    return true;
  } catch (err) {
    logger.error("Failed to send email:", err.message);
    return false;
  }
};

module.exports = {
  isEmailConfigured,
  sendMailSafe,
};
