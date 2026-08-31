const MIN_MARKETING_VIDEOS = 4;
const MAX_MARKETING_VIDEOS = 7;

const isHttpUrl = (value) => {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const extractYouTubeId = (url) => {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id || null;
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname.startsWith("/embed/")) {
      return url.pathname.split("/")[2] || null;
    }
    if (url.pathname.startsWith("/shorts/")) {
      return url.pathname.split("/")[2] || null;
    }
    const v = url.searchParams.get("v");
    if (v) return v;
  }
  return null;
};

const extractVimeoId = (url) => {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return /^\d+$/.test(id || "") ? id : null;
  }
  if (host === "player.vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const videoIndex = parts.indexOf("video");
    if (videoIndex >= 0 && parts[videoIndex + 1]) {
      return /^\d+$/.test(parts[videoIndex + 1]) ? parts[videoIndex + 1] : null;
    }
  }
  return null;
};

const resolveExternalVideoUrl = (url) => {
  const trimmed = String(url || "").trim();
  if (!trimmed) {
    return { url: "", embedUrl: "", thumbnailUrl: "" };
  }

  if (!isHttpUrl(trimmed)) {
    return {
      error: "Enter a valid http(s) video link (YouTube, Vimeo, etc.).",
    };
  }

  const parsed = new URL(trimmed);
  const youtubeId = extractYouTubeId(parsed);
  if (youtubeId) {
    const isShort = parsed.pathname.includes("/shorts/");
    return {
      url: trimmed,
      embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/${
        isShort ? "oar2" : "hqdefault"
      }.jpg`,
    };
  }

  const vimeoId = extractVimeoId(parsed);
  if (vimeoId) {
    return {
      url: trimmed,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
      thumbnailUrl: `https://vumbnail.com/${vimeoId}.jpg`,
    };
  }

  return {
    url: trimmed,
    embedUrl: "",
    thumbnailUrl: "",
  };
};

const normalizeEnrollmentUrlInput = (value) => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return { url: "" };
  }

  if (!isHttpUrl(trimmed)) {
    return { error: "Enrollment link must be a valid http(s) URL." };
  }

  return { url: trimmed };
};

const normalizeIntroVideoUrlInput = (value) => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return { introVideoUrl: "", introVideoEmbedUrl: "" };
  }

  const resolved = resolveExternalVideoUrl(trimmed);
  if (resolved.error) {
    return { error: resolved.error };
  }

  return {
    introVideoUrl: resolved.url,
    introVideoEmbedUrl: resolved.embedUrl,
  };
};

const resolveMarketingVideo = (raw, index) => {
  const url = String(raw?.url || raw?.link || "").trim();
  if (!url) return null;

  const resolved = resolveExternalVideoUrl(url);
  if (resolved.error) {
    return {
      error: `Marketing video ${index + 1}: enter a valid http(s) link (YouTube, Vimeo, etc.).`,
    };
  }

  return {
    url: resolved.url,
    embedUrl: resolved.embedUrl,
    thumbnailUrl: resolved.thumbnailUrl,
    order: index,
  };
};

const normalizeMarketingVideosInput = (value) => {
  let items = value;

  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch {
      return { error: "Marketing videos must be valid JSON.", videos: [] };
    }
  }

  if (!Array.isArray(items)) {
    return { error: "Marketing videos must be an array.", videos: [] };
  }

  if (items.length > MAX_MARKETING_VIDEOS) {
    return {
      error: `You can add at most ${MAX_MARKETING_VIDEOS} marketing videos.`,
      videos: [],
    };
  }

  if (items.length > 0 && items.length < MIN_MARKETING_VIDEOS) {
    return {
      error: `Add at least ${MIN_MARKETING_VIDEOS} marketing videos, or leave them all empty.`,
      videos: [],
    };
  }

  const videos = [];
  for (let i = 0; i < items.length; i += 1) {
    const resolved = resolveMarketingVideo(items[i], i);
    if (resolved?.error) {
      return { error: resolved.error, videos: [] };
    }
    if (resolved) videos.push(resolved);
  }

  return { videos };
};

const emptyMarketingVideoSlots = () =>
  Array.from({ length: MAX_MARKETING_VIDEOS }, () => ({
    url: "",
  }));

module.exports = {
  MIN_MARKETING_VIDEOS,
  MAX_MARKETING_VIDEOS,
  normalizeMarketingVideosInput,
  normalizeIntroVideoUrlInput,
  normalizeEnrollmentUrlInput,
  emptyMarketingVideoSlots,
};
