const nodemailer = require("nodemailer");
const crypto = require("crypto");
const logger = require("../../config/logger.js");

require("dotenv-safe").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Allow local dev
  },
});
transporter.verify((error, success) => {
  if (error) {
    logger.error("Transporter error:", error);
  } else {
    logger.info("Verification email server is ready to take messages");
  }
});

const sendVerificationEmail = async (user) => {
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationTokenExpiry = Date.now() + 3600000; // 1 hour

  user.verificationToken = verificationToken;
  user.verificationTokenExpiry = verificationTokenExpiry;
  await user.save();

  const verificationUrl = `${process.env.BASE_URL}/api/v1/verify-email?token=${verificationToken}`;

  const emailHtml = `
  <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f8f9fa; border-radius: 10px; width: 400px; margin: auto;">
    <h2 style="color: #007bff;">Email Verification</h2>
    <p>Please click the button below to verify your email address:</p>
    <a href="${verificationUrl}" style="font-size: 18px; background: #007bff; color: white; text-decoration: none; padding: 15px 30px; border-radius: 5px; display: inline-block; margin-top: 20px;">
      Verify Email
    </a>
    <p>This link will expire in 1 hour.</p>
    <p>If you did not request this, please ignore this email.</p>
  </div>
`;

  await transporter.sendMail({
    to: user.email,
    subject: "Please Verify Your Email Address",
    html: emailHtml,
  });
};

module.exports = sendVerificationEmail;
