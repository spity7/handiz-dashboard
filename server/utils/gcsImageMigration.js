const {
  downloadImage,
  deleteImage,
  isGcsUrl,
  uploadOptimizedImage,
  uploadProjectImage,
  uploadCourseImage,
} = require("./gcs");
const { isImageOptimized } = require("./imageProcessing");
const { isCompressibleImage } = require("./imageValidation");

function fileNameFromUrl(url) {
  if (!url) return "image";
  try {
    return decodeURIComponent(url.split("/").pop() || "image");
  } catch {
    return "image";
  }
}

async function migrateImageAtUrl(
  oldUrl,
  {
    uploadFn,
    folder,
    stamp,
    index,
    dryRun = false,
    urlCache,
    skipNonGcs = true,
  },
) {
  if (!oldUrl) {
    return { status: "skipped", reason: "no url", oldUrl, newUrl: oldUrl };
  }

  if (skipNonGcs && !isGcsUrl(oldUrl)) {
    const result = {
      status: "skipped",
      reason: "not a GCS url",
      oldUrl,
      newUrl: oldUrl,
    };
    urlCache?.set(oldUrl, result);
    return result;
  }

  if (urlCache?.has(oldUrl)) {
    const cached = urlCache.get(oldUrl);
    return { ...cached, reason: `reused: ${cached.reason}` };
  }

  let buffer;
  try {
    buffer = await downloadImage(oldUrl);
  } catch (err) {
    const result = {
      status: "error",
      reason: `download failed: ${err.message}`,
      oldUrl,
      newUrl: null,
    };
    urlCache?.set(oldUrl, result);
    return result;
  }

  const beforeKb = Math.round(buffer.length / 1024);

  if (await isImageOptimized(buffer)) {
    const result = {
      status: "skipped",
      reason: `already optimized (${beforeKb} KB)`,
      oldUrl,
      newUrl: oldUrl,
    };
    urlCache?.set(oldUrl, result);
    return result;
  }

  if (dryRun) {
    const result = {
      status: "dry-run",
      reason: `would optimize ${beforeKb} KB`,
      oldUrl,
      newUrl: null,
    };
    urlCache?.set(oldUrl, result);
    return result;
  }

  const originalName = fileNameFromUrl(oldUrl);
  const newUrl = await uploadFn(buffer, originalName, folder, { stamp, index });

  try {
    await deleteImage(oldUrl);
  } catch (err) {
    console.warn("  Could not delete old file:", err.message);
  }

  let afterKb = beforeKb;
  try {
    const optimized = await downloadImage(newUrl);
    afterKb = Math.round(optimized.length / 1024);
  } catch {
    // non-fatal
  }

  const result = {
    status: "migrated",
    reason: `${beforeKb} KB → ${afterKb} KB`,
    oldUrl,
    newUrl,
  };
  urlCache?.set(oldUrl, result);
  return result;
}

async function migrateThumbnailAndGallery(
  doc,
  {
    labelField,
    thumbnailFolder,
    galleryFolder,
    uploadFn = uploadOptimizedImage,
    dryRun,
    urlCache,
  },
) {
  const stamp = Date.now();
  const updates = {};
  const results = [];

  if (doc.thumbnailUrl) {
    const result = await migrateImageAtUrl(doc.thumbnailUrl, {
      uploadFn,
      folder: thumbnailFolder,
      stamp,
      dryRun,
      urlCache,
    });
    results.push({ kind: "thumbnail", ...result });
    if (result.status === "migrated" && result.newUrl) {
      updates.thumbnailUrl = result.newUrl;
    }
  }

  if (doc.gallery?.length) {
    const newGallery = [...doc.gallery];
    let galleryChanged = false;

    for (let index = 0; index < doc.gallery.length; index += 1) {
      const result = await migrateImageAtUrl(doc.gallery[index], {
        uploadFn,
        folder: galleryFolder,
        stamp,
        index,
        dryRun,
        urlCache,
      });
      results.push({ kind: `gallery[${index}]`, ...result });

      if (result.status === "migrated" && result.newUrl) {
        newGallery[index] = result.newUrl;
        galleryChanged = true;
      }
    }

    if (galleryChanged) {
      updates.gallery = newGallery;
    }
  }

  return { label: doc[labelField] || doc._id, updates, results };
}

async function migrateContentBlockImages(
  doc,
  { labelField, folder, uploadFn = uploadOptimizedImage, dryRun, urlCache },
) {
  const stamp = Date.now();
  const updates = {};
  const results = [];

  if (!doc.contentBlocks?.length) {
    return { label: doc[labelField] || doc._id, updates, results };
  }

  const newBlocks = doc.contentBlocks.map((block) => ({ ...block }));
  let blocksChanged = false;

  for (let index = 0; index < newBlocks.length; index += 1) {
    const block = newBlocks[index];
    if (block.type !== "image" || !block.content) continue;

    const result = await migrateImageAtUrl(block.content, {
      uploadFn,
      folder,
      stamp,
      index,
      dryRun,
      urlCache,
    });
    results.push({ kind: `block[${index}]`, ...result });

    if (result.status === "migrated" && result.newUrl) {
      newBlocks[index] = { ...block, content: result.newUrl };
      blocksChanged = true;
    }
  }

  if (blocksChanged) {
    updates.contentBlocks = newBlocks;
  }

  return { label: doc[labelField] || doc._id, updates, results };
}

async function migrateProjectDoc(project, { dryRun, urlCache }) {
  const stamp = Date.now();
  const updates = {};
  const results = [];

  if (project.thumbnailUrl) {
    const result = await migrateImageAtUrl(project.thumbnailUrl, {
      uploadFn: uploadProjectImage,
      folder: "thumbnails",
      stamp,
      dryRun,
      urlCache,
    });
    results.push({ kind: "thumbnail", ...result });
    if (result.status === "migrated" && result.newUrl) {
      updates.thumbnailUrl = result.newUrl;
    }
  }

  if (project.gallery?.length) {
    const newGallery = [...project.gallery];
    let galleryChanged = false;

    for (let index = 0; index < project.gallery.length; index += 1) {
      const result = await migrateImageAtUrl(project.gallery[index], {
        uploadFn: uploadProjectImage,
        folder: "gallery",
        stamp,
        index,
        dryRun,
        urlCache,
      });
      results.push({ kind: `gallery[${index}]`, ...result });

      if (result.status === "migrated" && result.newUrl) {
        newGallery[index] = result.newUrl;
        galleryChanged = true;
      }
    }

    if (galleryChanged) {
      updates.gallery = newGallery;
    }
  }

  if (project.contentBlocks?.length) {
    const newBlocks = project.contentBlocks.map((block) => ({ ...block }));
    let blocksChanged = false;

    for (let index = 0; index < newBlocks.length; index += 1) {
      const block = newBlocks[index];
      if (block.type !== "image" || !block.content) continue;

      const result = await migrateImageAtUrl(block.content, {
        uploadFn: uploadProjectImage,
        folder: "blocks",
        stamp,
        index,
        dryRun,
        urlCache,
      });
      results.push({ kind: `block[${index}]`, ...result });

      if (result.status === "migrated" && result.newUrl) {
        newBlocks[index] = { ...block, content: result.newUrl };
        blocksChanged = true;
      }
    }

    if (blocksChanged) {
      updates.contentBlocks = newBlocks;
    }
  }

  return {
    label: project.title || project._id,
    updates,
    results,
  };
}

async function migrateCourseDoc(course, { dryRun, urlCache }) {
  const stamp = Date.now();
  const updates = {};
  const results = [];

  const imageFields = [
    { field: "thumbnailUrl", folder: "thumbnails", kind: "thumbnail" },
    {
      field: "heroImageDesktopUrl",
      folder: "hero/desktop",
      kind: "heroDesktop",
    },
    { field: "heroImageMobileUrl", folder: "hero/mobile", kind: "heroMobile" },
  ];

  for (const { field, folder, kind } of imageFields) {
    const url = course[field];
    if (!url) continue;

    const result = await migrateImageAtUrl(url, {
      uploadFn: uploadCourseImage,
      folder,
      stamp,
      dryRun,
      urlCache,
    });
    results.push({ kind, ...result });
    if (result.status === "migrated" && result.newUrl) {
      updates[field] = result.newUrl;
    }
  }

  return {
    label: course.title || course._id,
    updates,
    results,
  };
}

async function migrateLessonDoc(lesson, { dryRun, urlCache }) {
  const stamp = Date.now();
  const updates = {};
  const results = [];

  if (lesson.contentBlocks?.length) {
    const newBlocks = lesson.contentBlocks.map((block) => ({ ...block }));
    let blocksChanged = false;

    for (let index = 0; index < newBlocks.length; index += 1) {
      const block = newBlocks[index];
      if (block.type !== "image" || !block.content) continue;

      const result = await migrateImageAtUrl(block.content, {
        uploadFn: uploadCourseImage,
        folder: "blocks",
        stamp,
        index,
        dryRun,
        urlCache,
      });
      results.push({ kind: `block[${index}]`, ...result });

      if (result.status === "migrated" && result.newUrl) {
        newBlocks[index] = { ...block, content: result.newUrl };
        blocksChanged = true;
      }
    }

    if (blocksChanged) {
      updates.contentBlocks = newBlocks;
    }
  }

  if (lesson.resources?.length) {
    const newResources = lesson.resources.map((resource) => ({ ...resource }));
    let resourcesChanged = false;

    for (let index = 0; index < newResources.length; index += 1) {
      const resource = newResources[index];
      if (!resource.url) continue;

      const originalName = fileNameFromUrl(resource.url);
      if (!isCompressibleImage(resource.fileType, originalName)) continue;

      const result = await migrateImageAtUrl(resource.url, {
        uploadFn: uploadCourseImage,
        folder: "resources",
        stamp,
        index,
        dryRun,
        urlCache,
      });
      results.push({ kind: `resource[${index}]`, ...result });

      if (result.status === "migrated" && result.newUrl) {
        newResources[index] = { ...resource, url: result.newUrl };
        resourcesChanged = true;
      }
    }

    if (resourcesChanged) {
      updates.resources = newResources;
    }
  }

  return {
    label: lesson.title || lesson._id,
    updates,
    results,
  };
}

async function migrateUserDoc(user, { dryRun, urlCache }) {
  const updates = {};
  const results = [];

  if (!user.avatarUrl) {
    return { label: user.email || user._id, updates, results };
  }

  const result = await migrateImageAtUrl(user.avatarUrl, {
    uploadFn: uploadOptimizedImage,
    folder: "users/avatars",
    stamp: Date.now(),
    dryRun,
    urlCache,
  });
  results.push({ kind: "avatar", ...result });

  if (result.status === "migrated" && result.newUrl) {
    updates.avatarUrl = result.newUrl;
  }

  return {
    label: user.email || user._id,
    updates,
    results,
  };
}

async function migrateServiceDoc(service, { dryRun, urlCache }) {
  const updates = {};
  const results = [];

  if (!service.iconUrl) {
    return { label: service.name || service._id, updates, results };
  }

  const result = await migrateImageAtUrl(service.iconUrl, {
    uploadFn: uploadOptimizedImage,
    folder: "services/icons",
    stamp: Date.now(),
    dryRun,
    urlCache,
  });
  results.push({ kind: "icon", ...result });

  if (result.status === "migrated" && result.newUrl) {
    updates.iconUrl = result.newUrl;
  }

  return {
    label: service.name || service._id,
    updates,
    results,
  };
}

function createSummary() {
  return { migrated: 0, skipped: 0, error: 0, dryRun: 0 };
}

function tallyResults(summary, results) {
  for (const result of results) {
    const statusKey = result.status === "dry-run" ? "dryRun" : result.status;
    summary[statusKey] = (summary[statusKey] || 0) + 1;
  }
}

function logResults(label, results) {
  for (const result of results) {
    console.log(
      `[${result.status}] ${label} (${result.kind}) — ${result.reason}`,
    );
  }
}

module.exports = {
  migrateImageAtUrl,
  migrateThumbnailAndGallery,
  migrateContentBlockImages,
  migrateProjectDoc,
  migrateCourseDoc,
  migrateLessonDoc,
  migrateUserDoc,
  migrateServiceDoc,
  createSummary,
  tallyResults,
  logResults,
};
