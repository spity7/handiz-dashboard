const User = require("../../models/userModel");
const Course = require("../../models/courseModel");
const { ROLES } = require("../../constants/permissions");
const logger = require("../../config/logger");
const { buildLmsUrl } = require("../lmsUrls");
const { sendMailSafe, isEmailConfigured } = require("./mailTransport");

const DASHBOARD_URL = process.env.DASHBOARD_URL || "";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const formatUserName = (user) => {
  if (!user) return "there";
  const fullName = [user.firstname, user.lastname].filter(Boolean).join(" ");
  return fullName || user.username || "there";
};

const wrapEmailHtml = ({ greeting, paragraphs, actionHref, actionLabel }) => {
  const body = paragraphs.map((p) => `<p>${p}</p>`).join("");
  const action =
    actionHref && actionLabel
      ? `<p><a href="${escapeHtml(actionHref)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">${escapeHtml(actionLabel)}</a></p>`
      : "";

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1e293b;max-width:560px;margin:0 auto;padding:16px;">
      <p>Hi ${escapeHtml(greeting)},</p>
      ${body}
      ${action}
      <p style="color:#64748b;font-size:13px;margin-top:24px;">— Handiz LMS</p>
    </div>
  `;
};

const loadStudent = async (userId) =>
  User.findById(userId).select("email firstname lastname username isVerified");

const sendToStudentSafe = async (userId, buildMessage) => {
  if (!isEmailConfigured()) return;

  try {
    const user = await loadStudent(userId);
    if (!user?.email) return;

    const { subject, html } = buildMessage(user);
    await sendMailSafe({ to: user.email, subject, html });
  } catch (err) {
    logger.error("LMS student email failed:", err.message);
  }
};

const sendCourseEnrolledEmailSafe = (userId, course) => {
  if (!course?.title) return Promise.resolve();

  const courseTitle = course.title;
  const courseUrl = buildLmsUrl(`/courses/${course.slug || ""}`);

  return sendToStudentSafe(userId, (user) => ({
    subject: `You're enrolled: ${courseTitle}`,
    html: wrapEmailHtml({
      greeting: formatUserName(user),
      paragraphs: [
        `Your enrollment in <strong>${escapeHtml(courseTitle)}</strong> is confirmed.`,
        "You can start learning anytime from your Handiz account.",
      ],
      actionHref: courseUrl,
      actionLabel: "Open course",
    }),
  }));
};

const sendEnrollmentRevokedEmailSafe = async (userId, courseId) => {
  const course = await Course.findById(courseId).select("title slug");
  if (!course) return;

  const courseTitle = course.title;
  const myCoursesUrl = buildLmsUrl("/my-courses");

  return sendToStudentSafe(userId, (user) => ({
    subject: `Course access removed: ${courseTitle}`,
    html: wrapEmailHtml({
      greeting: formatUserName(user),
      paragraphs: [
        `Your access to <strong>${escapeHtml(courseTitle)}</strong> has been removed.`,
        "If you believe this is a mistake, contact Handiz support.",
      ],
      actionHref: myCoursesUrl,
      actionLabel: "View my courses",
    }),
  }));
};

const sendLessonAccessBlockedEmailSafe = async (userId, { reason = "" } = {}) => {
  const trimmedReason = String(reason || "").trim();
  const reasonLine = trimmedReason
    ? `Reason: ${escapeHtml(trimmedReason)}`
    : "Contact support if you need help restoring access.";

  return sendToStudentSafe(userId, (user) => ({
    subject: "Lesson access suspended",
    html: wrapEmailHtml({
      greeting: formatUserName(user),
      paragraphs: [
        "Your lesson playback access has been suspended by an administrator.",
        reasonLine,
      ],
      actionHref: buildLmsUrl("/my-courses"),
      actionLabel: "Go to my courses",
    }),
  }));
};

const sendLessonAccessRestoredEmailSafe = (userId) =>
  sendToStudentSafe(userId, (user) => ({
    subject: "Lesson access restored",
    html: wrapEmailHtml({
      greeting: formatUserName(user),
      paragraphs: [
        "Your lesson playback access has been restored.",
        "You can continue watching courses on your registered device.",
      ],
      actionHref: buildLmsUrl("/my-courses"),
      actionLabel: "Continue learning",
    }),
  }));

const sendLessonDeviceResetEmailSafe = (userId) =>
  sendToStudentSafe(userId, (user) => ({
    subject: "Lesson device reset",
    html: wrapEmailHtml({
      greeting: formatUserName(user),
      paragraphs: [
        "An administrator reset your registered lesson device.",
        "The next time you open a lesson in your browser, this device will be registered for your account.",
      ],
      actionHref: buildLmsUrl("/my-courses"),
      actionLabel: "Open my courses",
    }),
  }));

const sendCourseCompletedEmailSafe = (userId, course, enrollmentId) => {
  if (!course?.title) return Promise.resolve();

  const courseTitle = course.title;
  const certificateUrl = enrollmentId
    ? buildLmsUrl(`/my-courses?certificate=${enrollmentId}`)
    : buildLmsUrl("/my-courses");

  return sendToStudentSafe(userId, (user) => ({
    subject: `Course completed: ${courseTitle}`,
    html: wrapEmailHtml({
      greeting: formatUserName(user),
      paragraphs: [
        `Congratulations! You completed <strong>${escapeHtml(courseTitle)}</strong>.`,
        "Your certificate is available in My courses when issued.",
      ],
      actionHref: certificateUrl,
      actionLabel: "View my courses",
    }),
  }));
};

const sendAdminEmailSafe = async ({ subject, message, dashboardPath }) => {
  if (!isEmailConfigured() || !DASHBOARD_URL) return;

  const admins = await User.find({
    role: ROLES.ADMIN,
    isVerified: true,
    email: { $exists: true, $ne: "" },
  }).select("email");

  const emails = admins.map((a) => a.email).filter(Boolean);
  if (!emails.length) return;

  const link = dashboardPath
    ? `${DASHBOARD_URL.replace(/\/$/, "")}${dashboardPath.startsWith("/") ? dashboardPath : `/${dashboardPath}`}`
    : DASHBOARD_URL;

  const html = wrapEmailHtml({
    greeting: "Admin",
    paragraphs: [escapeHtml(message)],
    actionHref: link,
    actionLabel: "Open in dashboard",
  });

  try {
    await sendMailSafe({
      bcc: emails.join(","),
      subject,
      html,
    });
  } catch (err) {
    logger.error("LMS admin email failed:", err.message);
  }
};

module.exports = {
  sendCourseEnrolledEmailSafe,
  sendEnrollmentRevokedEmailSafe,
  sendLessonAccessBlockedEmailSafe,
  sendLessonAccessRestoredEmailSafe,
  sendLessonDeviceResetEmailSafe,
  sendCourseCompletedEmailSafe,
  sendAdminEmailSafe,
};
