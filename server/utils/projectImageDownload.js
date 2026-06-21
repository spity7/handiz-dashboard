const path = require("path");

const IMAGE_EXTENSION_PATTERN = /\.(avif|webp|jpe?g|png|gif)$/i;

const getExtensionFromUrl = (fileUrl) => {
  try {
    const match = new URL(fileUrl).pathname.match(IMAGE_EXTENSION_PATTERN);
    return match ? match[0] : ".jpg";
  } catch {
    return ".jpg";
  }
};

const getFilenameFromUrl = (fileUrl, fallback = "image") => {
  try {
    const segment = new URL(fileUrl).pathname.split("/").pop();
    const decoded = decodeURIComponent(segment || "");
    const basename = decoded.split("/").pop();
    if (basename) return basename;
  } catch {
    // ignore invalid URLs
  }
  return fallback;
};

const slugifyProjectTitle = (projectTitle) =>
  (projectTitle || "project")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(0, 60) || "project";

const buildProjectImageFilename = (projectTitle, label, fileUrl) => {
  const slug = slugifyProjectTitle(projectTitle);
  const fromUrl = getFilenameFromUrl(fileUrl);
  if (fromUrl && fromUrl !== "image") return `${slug}_${label}_${fromUrl}`;
  return `${slug}_${label}${getExtensionFromUrl(fileUrl)}`;
};

const collectProjectDownloadableImages = (project) => {
  if (!project) return [];

  const images = [];
  const title = project.title;

  if (project.thumbnailUrl) {
    images.push({
      label: "thumbnail",
      url: project.thumbnailUrl,
      filename: buildProjectImageFilename(
        title,
        "thumbnail",
        project.thumbnailUrl,
      ),
    });
  }

  if (Array.isArray(project.gallery)) {
    project.gallery.forEach((url, index) => {
      images.push({
        label: `gallery_${index + 1}`,
        url,
        filename: buildProjectImageFilename(title, `gallery_${index + 1}`, url),
      });
    });
  }

  if (Array.isArray(project.contentBlocks)) {
    project.contentBlocks.forEach((block, index) => {
      if (block.type === "image" && block.content?.trim()) {
        const url = block.content.trim();
        images.push({
          label: `content_${index + 1}`,
          url,
          filename: buildProjectImageFilename(
            title,
            `content_${index + 1}`,
            url,
          ),
        });
      }
    });
  }

  return images;
};

const buildProjectImagesZipName = (projectTitle) =>
  `${slugifyProjectTitle(projectTitle)}_images.zip`;

const findProjectImageByLabel = (project, label) =>
  collectProjectDownloadableImages(project).find(
    (image) => image.label === label,
  );

module.exports = {
  buildProjectImageFilename,
  buildProjectImagesZipName,
  collectProjectDownloadableImages,
  findProjectImageByLabel,
  getFilenameFromUrl,
};
