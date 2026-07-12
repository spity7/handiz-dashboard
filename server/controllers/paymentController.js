const Course = require("../models/courseModel");
const Enrollment = require("../models/enrollmentModel");
const Order = require("../models/orderModel");
const Certificate = require("../models/certificateModel");
const Quiz = require("../models/quizModel");
const QuizAttempt = require("../models/quizAttemptModel");
const Lesson = require("../models/lessonModel");
const LessonProgress = require("../models/lessonProgressModel");
const {
  ENROLLMENT_STATUS,
  ENROLLMENT_SOURCE,
  ORDER_STATUS,
} = require("../constants/enrollmentStatus");
const { COURSE_CURRENCY } = require("../constants/courseStatus");
const { canEnrollInCourse } = require("../utils/courseAccess");
const {
  getCourseCheckoutAmount,
  isEffectivelyFree,
} = require("../utils/coursePricing");
const {
  notifyCourseEnrolled,
  recalculateEnrollmentProgress,
} = require("../utils/courseHelpers");
const {
  upsertUnreadNotification,
} = require("../utils/helpers/notificationService");
const {
  getWhishClient,
  parseCallbackUrl,
  buildCallbackUrl,
} = require("../utils/whish");

const getHandizSiteUrl = () => {
  const fromEnv = process.env.HANDIZ_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://handiz.org";
};

const getApiBaseUrl = () =>
  (process.env.BASE_URL || "http://localhost:5016").replace(/\/$/, "");

const fulfillPaidEnrollment = async ({
  userId,
  courseId,
  externalId,
  transactionId,
}) => {
  const course = await Course.findById(courseId);
  if (!course) return;

  const orderQuery = externalId
    ? { whishExternalId: String(externalId) }
    : { userId, courseId, status: ORDER_STATUS.PENDING };

  await Order.findOneAndUpdate(orderQuery, {
    status: ORDER_STATUS.PAID,
    whishTransactionId: transactionId || "",
    paidAt: new Date(),
  });

  let enrollment = await Enrollment.findOne({ userId, courseId });
  if (!enrollment) {
    enrollment = await Enrollment.create({
      userId,
      courseId,
      source: ENROLLMENT_SOURCE.WHISH,
    });
    await Course.findByIdAndUpdate(courseId, { $inc: { enrollmentCount: 1 } });
  } else if (enrollment.status === ENROLLMENT_STATUS.REVOKED) {
    enrollment.status = ENROLLMENT_STATUS.ACTIVE;
    enrollment.source = ENROLLMENT_SOURCE.WHISH;
    await enrollment.save();
    await Course.findByIdAndUpdate(courseId, { $inc: { enrollmentCount: 1 } });
  }

  await notifyCourseEnrolled(userId, course);
  await upsertUnreadNotification({
    recipientId: userId,
    type: "payment_received",
    title: "Payment received",
    message: `Your payment for "${course.title}" was successful.`,
    link: `/courses/${course.slug}/learn`,
    relatedCourseId: course._id,
  });
};

exports.createCheckoutSession = async (req, res) => {
  try {
    const whish = getWhishClient();
    if (!whish) {
      return res.status(503).json({ message: "Payment system not configured" });
    }

    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (!canEnrollInCourse(req.user, course)) {
      return res.status(400).json({ message: "Course not available" });
    }
    if (isEffectivelyFree(course.pricing)) {
      return res
        .status(400)
        .json({ message: "Course is free. Use enroll endpoint." });
    }

    const existing = await Enrollment.findOne({
      userId: req.user._id,
      courseId: course._id,
      status: { $in: [ENROLLMENT_STATUS.ACTIVE, ENROLLMENT_STATUS.COMPLETED] },
    });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Already enrolled", enrollment: existing });
    }

    const amount = getCourseCheckoutAmount(course.pricing);
    if (!amount || amount <= 0) {
      return res.status(400).json({
        message: "Course is free. Use enroll endpoint.",
      });
    }
    const currency = COURSE_CURRENCY;
    const externalId = whish.generateExternalId();
    const apiBase = getApiBaseUrl();
    const siteBase = getHandizSiteUrl();
    const successRedirect =
      process.env.WHISH_SUCCESS_URL ||
      `${siteBase}/courses/{slug}?enrolled=true`;
    const failureRedirect =
      process.env.WHISH_CANCEL_URL ||
      `${siteBase}/courses/{slug}?payment=failed`;

    await Order.create({
      userId: req.user._id,
      courseId: course._id,
      paymentProvider: "whish",
      whishExternalId: String(externalId),
      amount,
      currency,
      status: ORDER_STATUS.PENDING,
    });

    const result = await whish.createPayment({
      amount,
      currency,
      invoice: `Handiz Course: ${course.title}`,
      externalId,
      successCallbackUrl: `${apiBase}/api/v1/webhooks/whish/success`,
      failureCallbackUrl: `${apiBase}/api/v1/webhooks/whish/failure`,
      successRedirectUrl: successRedirect.replace("{slug}", course.slug),
      failureRedirectUrl: failureRedirect.replace("{slug}", course.slug),
    });

    if (!result.success) {
      await Order.findOneAndUpdate(
        { whishExternalId: String(externalId) },
        {
          status: ORDER_STATUS.FAILED,
          failureReason: result.dialog?.message || result.code || "unknown",
        },
      );
      return res.status(400).json({
        message: result.dialog?.message || "Could not start Whish payment",
        code: result.code,
      });
    }

    res.status(200).json({
      url: result.collectUrl,
      externalId: String(externalId),
    });
  } catch (error) {
    console.error("createCheckoutSession error:", error);
    res.status(500).json({
      message: "Server error creating checkout",
      error: error.message,
    });
  }
};

const verifyWhishPayment = async (req) => {
  const whish = getWhishClient();
  if (!whish) {
    throw new Error("Whish not configured");
  }

  const callbackData = parseCallbackUrl(buildCallbackUrl(req));
  const { externalId, currency } = callbackData;

  if (!externalId || !currency) {
    return { ok: false, status: 400, message: "Missing payment parameters" };
  }

  const order = await Order.findOne({ whishExternalId: String(externalId) });
  if (!order) {
    return { ok: false, status: 404, message: "Order not found" };
  }

  if (order.status === ORDER_STATUS.PAID) {
    return { ok: true, order, alreadyPaid: true };
  }

  const status = await whish.getPaymentStatus(currency, externalId);

  if (status.collectStatus === "pending") {
    return {
      ok: false,
      status: 409,
      message: "Payment still pending",
      order,
    };
  }

  if (status.collectStatus !== "success") {
    await Order.findByIdAndUpdate(order._id, {
      status: ORDER_STATUS.FAILED,
      failureReason: callbackData.errorMessage || status.collectStatus,
    });
    return { ok: false, status: 400, message: "Payment not confirmed", order };
  }

  if (
    status.amount != null &&
    !whish.validateAmount(status.amount, order.amount, order.currency)
  ) {
    await Order.findByIdAndUpdate(order._id, {
      status: ORDER_STATUS.FAILED,
      failureReason: "Amount mismatch",
    });
    return {
      ok: false,
      status: 400,
      message: "Payment amount mismatch",
      order,
    };
  }

  await fulfillPaidEnrollment({
    userId: order.userId,
    courseId: order.courseId,
    externalId: String(externalId),
    transactionId: status.transactionId,
  });

  return { ok: true, order };
};

exports.handleWhishSuccessCallback = async (req, res) => {
  try {
    const result = await verifyWhishPayment(req);
    if (!result.ok) {
      return res.status(result.status || 400).json({ message: result.message });
    }
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("handleWhishSuccessCallback error:", error);
    res.status(500).json({ message: "Webhook verification failed" });
  }
};

exports.handleWhishFailureCallback = async (req, res) => {
  try {
    const callbackData = parseCallbackUrl(buildCallbackUrl(req));
    const { externalId, errorMessage } = callbackData;

    if (externalId) {
      await Order.findOneAndUpdate(
        { whishExternalId: String(externalId), status: ORDER_STATUS.PENDING },
        {
          status: ORDER_STATUS.FAILED,
          failureReason: errorMessage || "Payment failed",
        },
      );
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("handleWhishFailureCallback error:", error);
    res.status(500).json({ message: "Webhook handling failed" });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "firstname lastname email")
      .populate("courseId", "title slug")
      .sort({ createdAt: -1 })
      .limit(500);

    res.status(200).json({ orders });
  } catch (error) {
    console.error("getOrders error:", error);
    res.status(500).json({ message: "Server error fetching orders" });
  }
};

exports.submitQuizAttempt = async (req, res) => {
  try {
    const { answers } = req.body;
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const course = await Course.findById(quiz.courseId);
    if (!course) {
      return res.status(403).json({ message: "Course is no longer available" });
    }

    const lesson = await Lesson.findById(quiz.lessonId);
    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId: quiz.courseId,
      status: { $in: [ENROLLMENT_STATUS.ACTIVE, ENROLLMENT_STATUS.COMPLETED] },
    });

    if (!enrollment) {
      return res.status(403).json({ message: "Not enrolled" });
    }

    const parsedAnswers = Array.isArray(answers) ? answers : [];
    let correct = 0;
    quiz.questions.forEach((q, i) => {
      const answer = parsedAnswers.find((a) => a.questionIndex === i);
      if (answer && answer.selectedIndex === q.correctIndex) {
        correct += 1;
      }
    });

    const score =
      quiz.questions.length > 0
        ? Math.round((correct / quiz.questions.length) * 100)
        : 0;
    const passed = score >= (quiz.passingScore || 70);

    const attempt = await QuizAttempt.create({
      enrollmentId: enrollment._id,
      quizId: quiz._id,
      score,
      passed,
      answers: parsedAnswers,
    });

    if (passed) {
      let progress = await LessonProgress.findOne({
        enrollmentId: enrollment._id,
        lessonId: lesson._id,
      });
      if (!progress) {
        progress = await LessonProgress.create({
          enrollmentId: enrollment._id,
          lessonId: lesson._id,
        });
      }
      if (!progress.completed) {
        progress.completed = true;
        progress.completedAt = new Date();
        await progress.save();
      }
      const enrollmentProgress = await recalculateEnrollmentProgress(
        enrollment._id,
      );
      return res.status(200).json({
        attempt,
        passed,
        score,
        enrollmentProgress,
      });
    }

    res.status(200).json({ attempt, passed, score });
  } catch (error) {
    console.error("submitQuizAttempt error:", error);
    res.status(500).json({ message: "Server error submitting quiz" });
  }
};

exports.getCertificate = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.enrollmentId);
    if (!enrollment)
      return res.status(404).json({ message: "Enrollment not found" });

    const isOwner = String(enrollment.userId) === String(req.user._id);
    if (!isOwner && req.user.role !== "Admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (enrollment.status !== ENROLLMENT_STATUS.COMPLETED) {
      return res.status(400).json({ message: "Course not yet completed" });
    }

    const certificate = await Certificate.findOne({
      enrollmentId: enrollment._id,
    }).populate("courseId", "title slug");

    if (!certificate) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    res.status(200).json({ certificate });
  } catch (error) {
    console.error("getCertificate error:", error);
    res.status(500).json({ message: "Server error fetching certificate" });
  }
};
