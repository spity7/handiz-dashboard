const Notification = require("../../models/notificationModel");
const logger = require("../../config/logger");

const READ_NOTIFICATION_RETENTION_DAYS = 90;
const UNREAD_NOTIFICATION_RETENTION_DAYS = 180;

const upsertUnreadNotification = async ({
  recipientId,
  type,
  title,
  message,
  link = "",
  relatedProjectId = null,
  relatedCourseId = null,
  relatedUserId = null,
}) => {
  const query = {
    recipientId,
    type,
    isRead: false,
  };

  if (relatedProjectId) {
    query.relatedProjectId = relatedProjectId;
  }

  if (relatedCourseId) {
    query.relatedCourseId = relatedCourseId;
  }

  if (relatedUserId) {
    query.relatedUserId = relatedUserId;
  }

  const now = new Date();
  const payload = {
    title,
    message,
    link,
    relatedProjectId,
    relatedCourseId,
    relatedUserId,
    createdAt: now,
  };

  const existing = await Notification.findOne(query);

  if (existing) {
    await Notification.updateOne({ _id: existing._id }, payload);
    return { created: false };
  }

  await Notification.create({
    recipientId,
    type,
    ...payload,
  });

  return { created: true };
};

const markProjectPendingAsRead = async (projectId) => {
  const projectLinkPattern = `project=${projectId}`;

  await Notification.updateMany(
    {
      type: "project_pending",
      isRead: false,
      $or: [
        { relatedProjectId: projectId },
        {
          relatedProjectId: null,
          link: { $regex: projectLinkPattern },
        },
      ],
    },
    { isRead: true },
  );
};

const notifyProjectOwner = async (project, { type, title, message, link }) => {
  if (!project?.createdBy) return;

  await upsertUnreadNotification({
    recipientId: project.createdBy,
    type,
    title,
    message,
    link,
    relatedProjectId: project._id,
  });
};

const notifyProjectPublished = async (project) => {
  await markProjectPendingAsRead(project._id);
  await notifyProjectOwner(project, {
    type: "project_published",
    title: "Your student project was published",
    message: `"${project.title}" is now live on Handiz.`,
    link: `/ecommerce/student-projects?project=${project._id}`,
  });
};

const notifyProjectUnpublished = async (project) => {
  await notifyProjectOwner(project, {
    type: "project_unpublished",
    title: "Your student project was unpublished",
    message: `"${project.title}" is no longer published. Contact an editor if you have questions.`,
    link: `/ecommerce/student-projects/edit/${project._id}`,
  });
};

const cleanupReadNotifications = async (
  retentionDays = READ_NOTIFICATION_RETENTION_DAYS,
) => {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const result = await Notification.deleteMany({
    isRead: true,
    updatedAt: { $lt: cutoff },
  });

  if (result.deletedCount > 0) {
    logger.info(
      `Cleaned up ${result.deletedCount} read notifications older than ${retentionDays} days.`,
    );
  }

  return result.deletedCount;
};

const cleanupStaleUnreadNotifications = async (
  retentionDays = UNREAD_NOTIFICATION_RETENTION_DAYS,
) => {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const result = await Notification.deleteMany({
    isRead: false,
    createdAt: { $lt: cutoff },
  });

  if (result.deletedCount > 0) {
    logger.info(
      `Cleaned up ${result.deletedCount} stale unread notifications older than ${retentionDays} days.`,
    );
  }

  return result.deletedCount;
};

const cleanupNotifications = async () => {
  const readDeleted = await cleanupReadNotifications();
  const unreadDeleted = await cleanupStaleUnreadNotifications();
  return readDeleted + unreadDeleted;
};

module.exports = {
  upsertUnreadNotification,
  markProjectPendingAsRead,
  notifyProjectPublished,
  notifyProjectUnpublished,
  cleanupNotifications,
  READ_NOTIFICATION_RETENTION_DAYS,
  UNREAD_NOTIFICATION_RETENTION_DAYS,
};
