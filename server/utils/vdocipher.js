require("../config/env");

// VdoCipher's documented production base URL (hostname is "dev" for all environments).
const VDOCIPHER_API_BASE =
  process.env.VDOCIPHER_API_BASE || "https://dev.vdocipher.com/api";

const getApiSecret = () => {
  const secret = process.env.VDOCIPHER_API_SECRET_KEY;
  if (!secret) {
    throw new Error("VDOCIPHER_API_SECRET_KEY is not configured");
  }
  return secret;
};

const vdocipherFetch = async (path, { method = "GET", body } = {}) => {
  const url = `${VDOCIPHER_API_BASE}${path}`;
  const headers = {
    Accept: "application/json",
    Authorization: `Apisecret ${getApiSecret()}`,
  };

  const options = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const message =
      data?.message || data?.error || `VdoCipher API error (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
};

const getUploadCredentials = async (title, folderId) => {
  const params = new URLSearchParams({ title: title || "Untitled lesson" });
  if (folderId) params.set("folderId", folderId);

  return vdocipherFetch(`/videos?${params.toString()}`, { method: "PUT" });
};

const createFolder = async (name, parent = "root") => {
  return vdocipherFetch("/videos/folders", {
    method: "POST",
    body: { name, parent },
  });
};

/** Lists sub-folders under `folderId`; 404 means the folder id is invalid. */
const getFolder = async (folderId) => {
  if (!folderId || folderId === "root") {
    const err = new Error("Folder not found");
    err.status = 404;
    throw err;
  }
  return vdocipherFetch(`/videos/folders/${encodeURIComponent(folderId)}`);
};

const extractFolderId = (payload) => {
  if (!payload || typeof payload !== "object") return null;
  const id = payload.id || payload.folderId;
  return id ? String(id).trim() : null;
};

const isFolderNotFoundError = (error) =>
  error?.status === 404 &&
  String(error?.message || "")
    .toLowerCase()
    .includes("folder not found");

const buildCourseFolderName = (course) => {
  const title = String(course?.title || "Untitled course").trim();
  const slug = String(course?.slug || "").trim();
  const name = slug ? `${title} (${slug})` : title;
  return name.slice(0, 200);
};

const buildModuleFolderName = (module) =>
  String(module?.title || "Untitled module")
    .trim()
    .slice(0, 200);

const buildLessonVideoTitle = ({ moduleTitle, lessonTitle } = {}) => {
  const lesson = String(lessonTitle || "").trim();
  const module = String(moduleTitle || "").trim();
  if (module && lesson) return `${module} - ${lesson}`;
  return lesson || module || "Untitled lesson";
};

const getPlaybackOtpTtlSeconds = () =>
  parseInt(process.env.VDOCIPHER_OTP_TTL || "300", 10);

const getPlaybackOtp = async (videoId, { ttl, annotate } = {}) => {
  const body = {};
  const otpTtl = ttl || getPlaybackOtpTtlSeconds();
  if (otpTtl) body.ttl = otpTtl;
  if (annotate) body.annotate = annotate;

  return vdocipherFetch(`/videos/${videoId}/otp`, {
    method: "POST",
    body,
  });
};

/**
 * Subtle static watermark for VdoCipher OTP playback (traceability without blocking content).
 * annotate must be a JSON-stringified array of watermark objects (see VdoCipher docs).
 */
const buildWatermarkAnnotate = (user) => {
  if (process.env.VDOCIPHER_WATERMARK !== "1" || !user) return undefined;

  const text = String(process.env.EMAIL_USER || "").trim();
  if (!text) return undefined;

  return JSON.stringify([
    {
      type: "text",
      text,
      alpha: "0.22",
      color: "0xCCCCCC",
      size: "11",
      x: "72",
      y: "92",
    },
  ]);
};

const deleteVideo = async (videoId) => {
  if (!videoId) return;
  return vdocipherFetch(`/videos?videos=${encodeURIComponent(videoId)}`, {
    method: "DELETE",
  });
};

const deleteFolder = async (folderId) => {
  if (!folderId) return;
  return vdocipherFetch(`/videos/folders/${encodeURIComponent(folderId)}`, {
    method: "DELETE",
  });
};

const getVideo = async (videoId) => {
  return vdocipherFetch(`/videos/${videoId}`);
};

const listVideosInFolder = async (folderId, { limit = 50 } = {}) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (folderId) params.set("folderId", folderId);
  const data = await vdocipherFetch(`/videos?${params.toString()}`);
  return data?.rows || data?.videos || [];
};

const updateVideoMetadata = async (
  videoId,
  { title, folderId, description } = {},
) => {
  if (!videoId) return;
  const body = {};
  const trimmedTitle = String(title || "").trim();
  const trimmedFolderId = String(folderId || "").trim();
  if (trimmedTitle) {
    body.title = trimmedTitle;
    body.description = description !== undefined ? String(description) : "";
  }
  if (trimmedFolderId && trimmedFolderId !== "root") {
    body.folderId = trimmedFolderId;
  }
  if (!Object.keys(body).length) return;
  return vdocipherFetch(`/videos/${encodeURIComponent(videoId)}`, {
    method: "POST",
    body,
  });
};

const videoIsInFolder = async (videoId, folderId) => {
  if (!videoId || !folderId) return false;
  const rows = await listVideosInFolder(folderId, { limit: 100 });
  return rows.some((row) => row.id === videoId);
};

/**
 * VdoCipher only sets folder at upload time; POST may accept folderId but often
 * does not relocate. We verify listing and try the legacy /videos/move endpoint.
 */
const moveVideoToFolder = async (
  videoId,
  folderId,
  { title, description = "" } = {},
) => {
  const trimmedTitle = String(title || "").trim();
  if (!videoId || !folderId || !trimmedTitle) {
    return { moved: false, reason: "missing_params" };
  }

  if (await videoIsInFolder(videoId, folderId)) {
    await updateVideoMetadata(videoId, { title: trimmedTitle, description });
    return { moved: true, method: "already_in_folder" };
  }

  await updateVideoMetadata(videoId, {
    title: trimmedTitle,
    description,
    folderId,
  });
  if (await videoIsInFolder(videoId, folderId)) {
    return { moved: true, method: "metadata" };
  }

  try {
    await vdocipherFetch("/videos/move", {
      method: "POST",
      body: { videoId, folderId },
    });
    if (await videoIsInFolder(videoId, folderId)) {
      return { moved: true, method: "move_api" };
    }
  } catch {
    // undocumented / plan-limited on some accounts
  }

  return { moved: false, reason: "folder_unchanged" };
};

const updateVideoTitle = async (videoId, title) =>
  updateVideoMetadata(videoId, { title });

const renameFolder = async (folderId, name) => {
  if (!folderId || folderId === "root") return;
  const trimmed = String(name || "").trim();
  if (!trimmed) return;
  return vdocipherFetch(`/videos/folders/${encodeURIComponent(folderId)}`, {
    method: "PUT",
    body: { name: trimmed },
  });
};

module.exports = {
  getUploadCredentials,
  getPlaybackOtp,
  getPlaybackOtpTtlSeconds,
  buildWatermarkAnnotate,
  deleteVideo,
  deleteFolder,
  getVideo,
  listVideosInFolder,
  videoIsInFolder,
  moveVideoToFolder,
  updateVideoTitle,
  updateVideoMetadata,
  renameFolder,
  getFolder,
  extractFolderId,
  isFolderNotFoundError,
  createFolder,
  buildCourseFolderName,
  buildModuleFolderName,
  buildLessonVideoTitle,
};
