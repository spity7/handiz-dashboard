const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "project_pending",
        "project_published",
        "project_unpublished",
        "course_enrolled",
        "course_completed",
        "course_new_lesson",
        "payment_received",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: "" },
    relatedProjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },
    relatedCourseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
      index: true,
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notificationSchema.index({
  recipientId: 1,
  type: 1,
  relatedProjectId: 1,
  isRead: 1,
});

module.exports = mongoose.model("Notification", notificationSchema);
