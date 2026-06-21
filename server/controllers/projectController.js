const Project = require("../models/projectModel");
const archiver = require("archiver");
const {
  uploadProjectImage,
  uploadThumbnail,
  deleteImage,
  downloadImage,
} = require("../utils/gcs");
const { ROLES } = require("../constants/permissions");
const { PROJECT_STATUS } = require("../constants/projectStatus");
const {
  canReadProject,
  canRestoreProject,
  canPermanentlyDeleteProject,
  getProjectListFilter,
} = require("../utils/projectAccess");
const notifyProjectPending = require("../utils/helpers/sendProjectPendingNotification");
const {
  notifyProjectPublished,
  notifyProjectUnpublished,
} = require("../utils/helpers/notificationService");
const { CREATED_BY_POPULATE } = require("../utils/createdByPopulate");
const {
  buildProjectImagesZipName,
  collectProjectDownloadableImages,
  findProjectImageByLabel,
} = require("../utils/projectImageDownload");

const collectProjectImageUrls = (project) => [
  ...new Set(
    collectProjectDownloadableImages(project).map((image) => image.url),
  ),
];

const assertCanAccessProjectImages = (req, project) => {
  if (!req.user) {
    if (project.status !== PROJECT_STATUS.PUBLISHED) {
      return { status: 404, message: "Project not found" };
    }
    return null;
  }

  if (!canReadProject(req.user, project)) {
    return {
      status: 403,
      message: "Forbidden: cannot access this project",
    };
  }

  return null;
};

const deleteProjectImages = async (project) => {
  const imageUrls = collectProjectImageUrls(project);
  await Promise.all(
    imageUrls.map(async (url) => {
      try {
        await deleteImage(url);
      } catch (err) {
        console.warn("Failed to delete project image:", url, err.message);
      }
    }),
  );
};

exports.createProject = async (req, res) => {
  try {
    const {
      title,
      student,
      area,
      category,
      description,
      order,
      concept,
      type,
      year,
      location,
      university,
      googleMapUrl,
      thesisUrl,
      fileUrl,
      contentBlocks,
    } = req.body;
    const thumbnailFile = req.files?.thumbnail?.[0];
    const galleryFiles = req.files?.gallery || [];
    const blockImageFiles = req.files?.blockImages || [];

    if (
      !title ||
      !student ||
      !area ||
      !category ||
      !description ||
      !location ||
      !concept ||
      !type ||
      !year ||
      !university
    ) {
      return res.status(400).json({
        message:
          "Title, Student, Area, category, description, concept, Type, location, year, and university are required",
      });
    }

    if (!thumbnailFile) {
      return res.status(400).json({ message: "Thumbnail image is required." });
    }

    let parsedContentBlocks = [];
    if (contentBlocks) {
      try {
        parsedContentBlocks = JSON.parse(contentBlocks);
      } catch (err) {
        console.error("Error parsing contentBlocks:", err);
      }
    }

    const uploadStamp = Date.now();

    let thumbnailUrl;
    let galleryUrls = [];
    let uploadedBlockImages = [];

    try {
      [thumbnailUrl, galleryUrls, uploadedBlockImages] = await Promise.all([
        uploadThumbnail(thumbnailFile.buffer, thumbnailFile.originalname),
        galleryFiles.length > 0
          ? Promise.all(
              galleryFiles.map((file, index) =>
                uploadProjectImage(file.buffer, file.originalname, "gallery", {
                  stamp: uploadStamp,
                  index,
                }),
              ),
            )
          : Promise.resolve([]),
        blockImageFiles.length > 0
          ? Promise.all(
              blockImageFiles.map((file, index) =>
                uploadProjectImage(file.buffer, file.originalname, "blocks", {
                  stamp: uploadStamp,
                  index,
                }),
              ),
            )
          : Promise.resolve([]),
      ]);
    } catch (err) {
      console.error("Error uploading project images:", err);
      return res.status(500).json({
        message: "Failed to upload project images",
        error: err.message,
      });
    }

    if (parsedContentBlocks.length > 0 && uploadedBlockImages.length > 0) {
      parsedContentBlocks = parsedContentBlocks.map((block) => {
        if (
          block.type === "image" &&
          block.fileIndex !== undefined &&
          uploadedBlockImages[block.fileIndex]
        ) {
          return { ...block, content: uploadedBlockImages[block.fileIndex] };
        }
        return block;
      });
    }

    const parsedConcept = Array.isArray(concept) ? concept : [concept];
    const parsedType = Array.isArray(type) ? type : [type];
    const parsedCategory = Array.isArray(category) ? category : [category];
    const parsedYear = Array.isArray(year) ? year : [year];
    const parsedLocation = Array.isArray(location) ? location : [location];
    const parsedUniversity = Array.isArray(university)
      ? university
      : [university];

    const trimUrl = (v) => (typeof v === "string" ? v.trim() : "") || "";

    const creatorRole = req.user.role;
    const initialStatus =
      creatorRole === ROLES.USER
        ? PROJECT_STATUS.PENDING
        : PROJECT_STATUS.PUBLISHED;

    const newProject = await Project.create({
      title,
      student,
      area,
      description,
      order,
      thumbnailUrl,
      gallery: galleryUrls,
      concept: parsedConcept,
      type: parsedType,
      category: parsedCategory,
      year: parsedYear,
      location: parsedLocation,
      university: parsedUniversity,
      googleMapUrl: trimUrl(googleMapUrl),
      thesisUrl: trimUrl(thesisUrl),
      fileUrl: trimUrl(fileUrl),
      contentBlocks: parsedContentBlocks,
      createdBy: req.user._id,
      createdByRole: creatorRole,
      status: initialStatus,
      ...(initialStatus === PROJECT_STATUS.PUBLISHED && {
        publishedAt: new Date(),
        publishedBy: req.user._id,
      }),
    });

    if (initialStatus === PROJECT_STATUS.PENDING) {
      notifyProjectPending(newProject, req.user).catch((err) => {
        console.error(
          "Failed to send project pending notification:",
          err.message,
        );
      });
    }

    res.status(201).json({
      message: "Project created successfully",
      project: newProject,
    });
  } catch (error) {
    console.error("Project creation error:", error);
    res.status(500).json({
      message: "Server error creating project",
      error: error.message,
    });
  }
};

exports.getAllProjects = async (req, res) => {
  try {
    const filter = getProjectListFilter(req.user);
    const projects = await Project.findWithDeleted(filter)
      .sort({ order: 1, createdAt: -1 })
      .populate(CREATED_BY_POPULATE);
    res.status(200).json({ projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Server error fetching projects" });
  }
};

const stripHtml = (html) => (html || "").replace(/<[^>]+>/g, "").trim();

exports.getProjectsList = async (req, res) => {
  try {
    const projects = await Project.find({ status: PROJECT_STATUS.PUBLISHED })
      .select(
        "_id title student area description order thumbnailUrl concept type category year location university",
      )
      .sort({ order: 1, createdAt: -1 })
      .lean();

    const list = projects.map((project) => ({
      ...project,
      description: stripHtml(project.description),
    }));

    res.status(200).json({ projects: list });
  } catch (error) {
    console.error("Error fetching projects list:", error);
    res.status(500).json({ message: "Server error fetching projects list" });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate(
      CREATED_BY_POPULATE,
    );
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (!req.user) {
      if (project.status !== PROJECT_STATUS.PUBLISHED) {
        return res.status(404).json({ message: "Project not found" });
      }
      return res.status(200).json({ project });
    }

    if (!canReadProject(req.user, project)) {
      return res
        .status(403)
        .json({ message: "Forbidden: cannot access this project" });
    }

    res.status(200).json({ project });
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ message: "Server error fetching project" });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const {
      title,
      student,
      area,
      category,
      description,
      location,
      order,
      concept,
      type,
      year,
      university,
      googleMapUrl,
      thesisUrl,
      fileUrl,
      contentBlocks,
    } = req.body;
    const thumbnailFile = req.files?.thumbnail?.[0];
    const galleryFiles = req.files?.gallery || [];
    const blockImageFiles = req.files?.blockImages || [];

    if (!concept || !type || !category || !location || !year || !university) {
      return res.status(400).json({
        message:
          "Concept, Type, Category, Year, location, and university are required",
      });
    }

    const existingProject =
      req.project || (await Project.findById(req.params.id));
    if (!existingProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    const userEdited = req.user.role === ROLES.USER;

    const parsedConcept = Array.isArray(concept) ? concept : [concept];
    const parsedType = Array.isArray(type) ? type : [type];
    const parsedCategory = Array.isArray(category) ? category : [category];
    const parsedYear = Array.isArray(year) ? year : [year];
    const parsedLocation = Array.isArray(location) ? location : [location];
    const parsedUniversity = Array.isArray(university)
      ? university
      : [university];

    const trimUrl = (v) => (typeof v === "string" ? v.trim() : "") || "";

    const updateData = {
      title,
      student,
      area,
      description,
      order,
      concept: parsedConcept,
      type: parsedType,
      category: parsedCategory,
      year: parsedYear,
      location: parsedLocation,
      university: parsedUniversity,
      googleMapUrl: trimUrl(googleMapUrl),
      thesisUrl: trimUrl(thesisUrl),
      fileUrl: trimUrl(fileUrl),
    };

    // Process Content Blocks
    let parsedContentBlocks = [];
    if (contentBlocks) {
      try {
        parsedContentBlocks = JSON.parse(contentBlocks);
      } catch (err) {
        console.error("Error parsing contentBlocks:", err);
      }
    }

    // Upload block images and map to contentBlocks
    if (parsedContentBlocks.length > 0) {
      // Upload NEW block images
      if (blockImageFiles.length > 0) {
        const uploadStamp = Date.now();
        const uploadedBlockImages = await Promise.all(
          blockImageFiles.map((file, index) =>
            uploadProjectImage(file.buffer, file.originalname, "blocks", {
              stamp: uploadStamp,
              index,
            }),
          ),
        );

        let imageIndex = 0;
        parsedContentBlocks = parsedContentBlocks.map((block) => {
          // If block has a fileIndex, it means it's a NEW file upload
          if (block.type === "image" && block.fileIndex !== undefined) {
            const url = uploadedBlockImages[block.fileIndex]; // Use fileIndex from frontend
            // Cleanup: remove temporary fileIndex
            const { fileIndex, ...rest } = block;
            return { ...rest, content: url };
          }
          return block;
        });
      }

      updateData.contentBlocks = parsedContentBlocks;
    } else if (contentBlocks) {
      // If contentBlocks is sent but empty (user deleted all blocks), update to empty array
      updateData.contentBlocks = [];
    }

    // ✅ Clean up old content block images
    // 1. Get all image URLs from the existing project (DB state)
    const oldBlockImages = existingProject.contentBlocks
      .filter((b) => b.type === "image" && b.content)
      .map((b) => b.content);

    // 2. Get all image URLs from the NEW payload (after new uploads are processed)
    //    We check updateData.contentBlocks if set, otherwise it defaults to [] if we reached here with contentBlocks valid
    const newBlockImages = (updateData.contentBlocks || [])
      .filter((b) => b.type === "image" && b.content)
      .map((b) => b.content);

    // 3. Find images that are in old BUT NOT in new
    const imagesToDelete = oldBlockImages.filter(
      (url) => !newBlockImages.includes(url),
    );

    // 4. Delete them from GCS
    if (imagesToDelete.length > 0) {
      await Promise.all(
        imagesToDelete.map(async (url) => {
          try {
            await deleteImage(url);
          } catch (err) {
            console.warn(
              "⚠️ Failed to delete removed block image:",
              err.message,
            );
          }
        }),
      );
    }

    // ✅ Handle new thumbnail upload
    if (thumbnailFile) {
      // Delete old thumbnail if exists
      if (existingProject.thumbnailUrl) {
        try {
          await deleteImage(existingProject.thumbnailUrl);
        } catch (err) {
          console.warn("⚠️ Failed to delete old thumbnail:", err.message);
        }
      }

      const newThumbnailUrl = await uploadThumbnail(
        thumbnailFile.buffer,
        thumbnailFile.originalname,
      );
      updateData.thumbnailUrl = newThumbnailUrl;
    }

    // ✅ Parallel upload for gallery
    let newGalleryUrls = [];
    if (galleryFiles.length > 0) {
      try {
        const uploadStamp = Date.now();
        newGalleryUrls = await Promise.all(
          galleryFiles.map((file, index) =>
            uploadProjectImage(file.buffer, file.originalname, "gallery", {
              stamp: uploadStamp,
              index,
            }),
          ),
        );
      } catch (err) {
        console.error("Error uploading gallery images:", err);
        return res.status(500).json({
          message: "Failed to upload one or more gallery images",
          error: err.message,
        });
      }
    }

    if (newGalleryUrls.length > 0) {
      updateData.gallery = [
        ...(existingProject.gallery || []),
        ...newGalleryUrls,
      ];
    }

    if (userEdited) {
      updateData.status = PROJECT_STATUS.PENDING;
      if (existingProject.status === PROJECT_STATUS.PUBLISHED) {
        updateData.publishedAt = null;
        updateData.publishedBy = null;
      }
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true },
    );

    if (userEdited) {
      notifyProjectPending(updatedProject, req.user, true).catch((err) => {
        console.error(
          "Failed to send project pending notification:",
          err.message,
        );
      });
    }

    res.status(200).json({
      message: "Project updated successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({
      message: "Server error updating project",
      error: error.message,
    });
  }
};

exports.publishProject = async (req, res) => {
  try {
    const project = req.project;
    project.status = PROJECT_STATUS.PUBLISHED;
    project.publishedAt = new Date();
    project.publishedBy = req.user._id;
    await project.save();
    await notifyProjectPublished(project);
    res.status(200).json({ message: "Project published", project });
  } catch (error) {
    res.status(500).json({ message: "Server error publishing project" });
  }
};

exports.unpublishProject = async (req, res) => {
  try {
    const project = req.project;
    project.status = PROJECT_STATUS.UNPUBLISHED;
    project.publishedAt = null;
    project.publishedBy = null;
    await project.save();
    await notifyProjectUnpublished(project);
    res.status(200).json({ message: "Project unpublished", project });
  } catch (error) {
    res.status(500).json({ message: "Server error unpublishing project" });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = req.project || (await Project.findById(req.params.id));
    if (!project) return res.status(404).json({ message: "Project not found" });

    await project.softDelete();

    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ message: "Server error deleting project" });
  }
};

exports.restoreProject = async (req, res) => {
  try {
    const project = await Project.findOneWithDeleted({ _id: req.params.id });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    if (!canRestoreProject(req.user, project)) {
      return res
        .status(403)
        .json({ message: "Forbidden: cannot restore this project" });
    }
    if (!project.deletedAt) {
      return res.status(400).json({ message: "Project is not deleted" });
    }

    await project.restore();

    res.status(200).json({
      message: "Project restored successfully",
      project,
    });
  } catch (error) {
    console.error("Error restoring project:", error);
    res.status(500).json({ message: "Server error restoring project" });
  }
};

exports.permanentlyDeleteProject = async (req, res) => {
  try {
    if (!canPermanentlyDeleteProject(req.user)) {
      return res.status(403).json({
        message: "Forbidden: cannot permanently delete this project",
      });
    }

    const project = await Project.findOneWithDeleted({ _id: req.params.id });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    if (!project.deletedAt) {
      return res.status(400).json({
        message: "Project must be soft-deleted before permanent deletion",
      });
    }

    await deleteProjectImages(project);
    await Project.deleteOne({ _id: project._id });

    res.status(200).json({ message: "Project permanently deleted" });
  } catch (error) {
    console.error("Error permanently deleting project:", error);
    res
      .status(500)
      .json({ message: "Server error permanently deleting project" });
  }
};

exports.deleteProjectImage = async (req, res) => {
  try {
    const { id } = req.params; // project id
    const { imageUrl } = req.body; // the image URL to delete

    if (!imageUrl) {
      return res.status(400).json({ message: "Image URL is required" });
    }

    const project = req.project || (await Project.findById(id));
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check if the image exists in the project's gallery
    const imageExists = project.gallery.includes(imageUrl);
    if (!imageExists) {
      return res.status(404).json({ message: "Image not found in gallery" });
    }

    // Delete the image from GCS
    await deleteImage(imageUrl);

    // Remove the image from MongoDB array
    project.gallery = project.gallery.filter((url) => url !== imageUrl);
    await project.save();

    res.status(200).json({
      message: "Gallery image deleted successfully",
      gallery: project.gallery,
    });
  } catch (error) {
    console.error("Error deleting gallery image:", error);
    res.status(500).json({
      message: "Server error deleting gallery image",
      error: error.message,
    });
  }
};

exports.downloadProjectImagesZip = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const accessError = assertCanAccessProjectImages(req, project);
    if (accessError) {
      return res
        .status(accessError.status)
        .json({ message: accessError.message });
    }

    const images = collectProjectDownloadableImages(project);
    if (!images.length) {
      return res.status(404).json({ message: "No images to download" });
    }

    const downloadedImages = (
      await Promise.all(
        images.map(async (image) => {
          try {
            const buffer = await downloadImage(image.url);
            return { ...image, buffer };
          } catch (err) {
            console.warn(
              "Failed to download image for ZIP:",
              image.url,
              err.message,
            );
            return null;
          }
        }),
      )
    ).filter(Boolean);

    if (!downloadedImages.length) {
      return res
        .status(500)
        .json({ message: "Failed to download project images" });
    }

    const zipName = buildProjectImagesZipName(project.title);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);

    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.on("error", (err) => {
      console.error("ZIP archive error:", err);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to create image archive" });
      }
    });

    archive.pipe(res);

    for (const image of downloadedImages) {
      archive.append(image.buffer, { name: image.filename });
    }

    await archive.finalize();
  } catch (error) {
    console.error("Error downloading project images:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Server error downloading images" });
    }
  }
};

exports.downloadProjectImageFile = async (req, res) => {
  try {
    const { label } = req.query;
    if (!label) {
      return res.status(400).json({ message: "Image label is required" });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const accessError = assertCanAccessProjectImages(req, project);
    if (accessError) {
      return res
        .status(accessError.status)
        .json({ message: accessError.message });
    }

    const image = findProjectImageByLabel(project, label);
    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    const buffer = await downloadImage(image.url);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${image.filename}"`,
    );
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(buffer);
  } catch (error) {
    console.error("Error downloading project image:", error);
    res.status(500).json({ message: "Server error downloading image" });
  }
};
