const { deleteImage } = require("./gcs");

const EDITABLE_FIELDS = [
  "title",
  "student",
  "area",
  "description",
  "order",
  "thumbnailUrl",
  "gallery",
  "concept",
  "type",
  "category",
  "year",
  "location",
  "university",
  "googleMapUrl",
  "thesisUrl",
  "fileUrl",
  "contentBlocks",
];

const cloneValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) =>
      item && typeof item === "object" ? { ...item } : item,
    );
  }
  return value;
};

const toPlainObject = (value) =>
  value && typeof value.toObject === "function" ? value.toObject() : value;

const extractEditableContent = (source) => {
  const plain = toPlainObject(source) || {};
  const content = {};

  for (const field of EDITABLE_FIELDS) {
    if (plain[field] !== undefined) {
      content[field] = cloneValue(plain[field]);
    }
  }

  return content;
};

const getPendingBaseline = (project) => {
  const liveContent = extractEditableContent(project);
  if (!project?.hasPendingChanges || !project?.pendingChanges) {
    return liveContent;
  }

  return {
    ...liveContent,
    ...extractEditableContent(project.pendingChanges),
  };
};

const collectContentImageUrls = (content) => {
  if (!content) return [];

  const urls = [];
  if (content.thumbnailUrl) urls.push(content.thumbnailUrl);

  if (Array.isArray(content.gallery)) {
    urls.push(...content.gallery.filter(Boolean));
  }

  if (Array.isArray(content.contentBlocks)) {
    content.contentBlocks.forEach((block) => {
      if (block?.type === "image" && block.content?.trim()) {
        urls.push(block.content.trim());
      }
    });
  }

  return [...new Set(urls)];
};

const getOrphanedImageUrls = (oldUrls, newUrls, protectedUrls = []) => {
  const newSet = new Set(newUrls);
  const protectedSet = new Set(protectedUrls);
  return oldUrls.filter((url) => !newSet.has(url) && !protectedSet.has(url));
};

const deleteImagesQuietly = async (urls) => {
  if (!urls.length) return;

  await Promise.all(
    urls.map(async (url) => {
      try {
        await deleteImage(url);
      } catch (err) {
        console.warn("Failed to delete project image:", url, err.message);
      }
    }),
  );
};

const applyEditableContent = (target, content) => {
  for (const field of EDITABLE_FIELDS) {
    if (content[field] !== undefined) {
      target[field] = cloneValue(content[field]);
    }
  }
};

const clearPendingChanges = (project) => {
  project.hasPendingChanges = false;
  project.pendingSubmittedAt = null;
  project.pendingSubmittedBy = null;
  project.pendingChanges = null;
  project.markModified("pendingChanges");
};

const discardPendingChanges = async (project) => {
  if (!project?.hasPendingChanges) return;

  const liveContent = extractEditableContent(project);
  const draftContent = getPendingBaseline(project);
  const draftOnlyUrls = getOrphanedImageUrls(
    collectContentImageUrls(draftContent),
    [],
    collectContentImageUrls(liveContent),
  );

  await deleteImagesQuietly(draftOnlyUrls);
  clearPendingChanges(project);
};

const promotePendingChanges = async (project) => {
  if (!project?.hasPendingChanges || !project.pendingChanges) {
    return false;
  }

  const liveContent = extractEditableContent(project);
  const draftContent = getPendingBaseline(project);
  const liveUrls = collectContentImageUrls(liveContent);
  const draftUrls = collectContentImageUrls(draftContent);

  applyEditableContent(project, draftContent);
  clearPendingChanges(project);

  const replacedLiveUrls = getOrphanedImageUrls(liveUrls, draftUrls);
  await deleteImagesQuietly(replacedLiveUrls);

  return true;
};

const collectAllProjectImageUrls = (project) => {
  const urls = collectContentImageUrls(extractEditableContent(project));
  if (project?.hasPendingChanges && project.pendingChanges) {
    collectContentImageUrls(getPendingBaseline(project)).forEach((url) =>
      urls.push(url),
    );
  }
  return [...new Set(urls)];
};

module.exports = {
  EDITABLE_FIELDS,
  extractEditableContent,
  getPendingBaseline,
  collectContentImageUrls,
  getOrphanedImageUrls,
  deleteImagesQuietly,
  applyEditableContent,
  clearPendingChanges,
  discardPendingChanges,
  promotePendingChanges,
  collectAllProjectImageUrls,
};
