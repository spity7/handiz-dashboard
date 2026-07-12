require("../config/env");

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

const getPlaybackOtp = async (videoId, { ttl, annotate } = {}) => {
  const body = {};
  const otpTtl = ttl || parseInt(process.env.VDOCIPHER_OTP_TTL || "300", 10);
  if (otpTtl) body.ttl = otpTtl;
  if (annotate) body.annotate = annotate;

  return vdocipherFetch(`/videos/${videoId}/otp`, {
    method: "POST",
    body,
  });
};

/**
 * Dynamic watermark text shown on video (deters screen recording).
 */
const buildWatermarkAnnotate = (user) => {
  if (process.env.VDOCIPHER_WATERMARK !== "1" || !user) return undefined;

  const name =
    [user.firstname, user.lastname].filter(Boolean).join(" ").trim() ||
    user.username ||
    "Student";
  const email = user.email || "";
  const date = new Date().toISOString().slice(0, 10);

  return email ? `${name}\n${email}\n${date}` : `${name}\n${date}`;
};

const deleteVideo = async (videoId) => {
  if (!videoId) return;
  return vdocipherFetch(`/videos?videos=${encodeURIComponent(videoId)}`, {
    method: "DELETE",
  });
};

const getVideo = async (videoId) => {
  return vdocipherFetch(`/videos/${videoId}`);
};

module.exports = {
  getUploadCredentials,
  getPlaybackOtp,
  buildWatermarkAnnotate,
  deleteVideo,
  getVideo,
};
