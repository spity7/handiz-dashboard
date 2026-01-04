const Competition = require("../models/competitionModel");
const { uploadImage, deleteImage } = require("../utils/gcs");

exports.createCompetition = async (req, res) => {
  try {
    const { title, prize, deadline, link, category, description, order, side } =
      req.body;
    const thumbnailFile = req.files?.thumbnail?.[0];
    const galleryFiles = req.files?.gallery || [];

    if (
      !title ||
      !prize ||
      !deadline ||
      !link ||
      !category ||
      !description ||
      !side
    ) {
      return res.status(400).json({
        message:
          "Title, Prize, Deadline, Link, category, description, and side are required",
      });
    }

    if (!thumbnailFile) {
      return res.status(400).json({ message: "Thumbnail image is required." });
    }

    // Upload thumbnail
    const thumbnailFileName = `competitions/thumbnails/${Date.now()}_${
      thumbnailFile.originalname
    }`;
    const thumbnailUrl = await uploadImage(
      thumbnailFile.buffer,
      thumbnailFileName,
      thumbnailFile.mimetype
    );

    // Upload gallery (optional)
    let galleryUrls = [];

    if (galleryFiles.length > 0) {
      try {
        galleryUrls = await Promise.all(
          galleryFiles.map(async (file) => {
            const fileName = `competitions/gallery/${Date.now()}_${
              file.originalname
            }`;
            return await uploadImage(file.buffer, fileName, file.mimetype);
          })
        );
      } catch (err) {
        console.error("Error uploading one of the gallery images:", err);
        return res.status(500).json({
          message: "Failed to upload gallery images",
          error: err.message,
        });
      }
    }

    // Save competition to DB
    const newCompetition = await Competition.create({
      title,
      prize,
      deadline,
      link,
      description,
      order,
      side,
      thumbnailUrl,
      gallery: galleryUrls,
      category,
    });

    res.status(201).json({
      message: "Competition created successfully",
      competition: newCompetition,
    });
  } catch (error) {
    console.error("Competition creation error:", error);
    res.status(500).json({
      message: "Server error creating competition",
      error: error.message,
    });
  }
};

exports.getAllCompetitions = async (req, res) => {
  try {
    const competitions = await Competition.find().sort({
      order: 1,
      createdAt: -1,
    });
    res.status(200).json({ competitions });
  } catch (error) {
    console.error("Error fetching competitions:", error);
    res.status(500).json({ message: "Server error fetching competitions" });
  }
};

exports.getCompetitionById = async (req, res) => {
  try {
    const competition = await Competition.findById(req.params.id);
    if (!competition)
      return res.status(404).json({ message: "Competition not found" });
    res.status(200).json({ competition });
  } catch (error) {
    console.error("Error fetching competition:", error);
    res.status(500).json({ message: "Server error fetching competition" });
  }
};

exports.updateCompetition = async (req, res) => {
  try {
    const { title, prize, deadline, link, category, description, order, side } =
      req.body;
    const thumbnailFile = req.files?.thumbnail?.[0];
    const galleryFiles = req.files?.gallery || [];

    // ✅ Find existing competition first
    const existingCompetition = await Competition.findById(req.params.id);
    if (!existingCompetition) {
      return res.status(404).json({ message: "Competition not found" });
    }

    const updateData = {
      title,
      prize,
      deadline,
      link,
      description,
      order,
      side,
      category,
    };

    // ✅ Handle new thumbnail upload
    if (thumbnailFile) {
      // Delete old thumbnail if exists
      if (existingCompetition.thumbnailUrl) {
        try {
          await deleteImage(existingCompetition.thumbnailUrl);
        } catch (err) {
          console.warn("⚠️ Failed to delete old thumbnail:", err.message);
        }
      }

      // Upload new one
      const newThumbnailName = `competitions/thumbnails/${Date.now()}_${
        thumbnailFile.originalname
      }`;
      const newThumbnailUrl = await uploadImage(
        thumbnailFile.buffer,
        newThumbnailName,
        thumbnailFile.mimetype
      );
      updateData.thumbnailUrl = newThumbnailUrl;
    }

    // ✅ Parallel upload for gallery
    let newGalleryUrls = [];
    if (galleryFiles.length > 0) {
      try {
        newGalleryUrls = await Promise.all(
          galleryFiles.map(async (file) => {
            const fileName = `competitions/gallery/${Date.now()}_${
              file.originalname
            }`;
            return await uploadImage(file.buffer, fileName, file.mimetype);
          })
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
      // Option 1: append new gallery images
      updateData.gallery = [
        ...(existingCompetition.gallery || []),
        ...newGalleryUrls,
      ];
    }

    // ✅ Update competition
    const updatedCompetition = await Competition.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.status(200).json({
      message: "Competition updated successfully",
      competition: updatedCompetition,
    });
  } catch (error) {
    console.error("Error updating competition:", error);
    res.status(500).json({
      message: "Server error updating competition",
      error: error.message,
    });
  }
};

exports.deleteCompetition = async (req, res) => {
  try {
    const competition = await Competition.findById(req.params.id);
    if (!competition)
      return res.status(404).json({ message: "Competition not found" });

    // Delete thumbnail from GCS
    if (competition.thumbnailUrl) {
      await deleteImage(competition.thumbnailUrl);
    }

    // Delete all gallery images from GCS (if any)
    if (Array.isArray(competition.gallery) && competition.gallery.length > 0) {
      await Promise.all(
        competition.gallery.map(async (imageUrl) => {
          try {
            await deleteImage(imageUrl);
          } catch (err) {
            console.warn("⚠️ Failed to delete gallery image:", err.message);
          }
        })
      );
    }

    // Delete competition from MongoDB
    await competition.deleteOne();

    res.status(200).json({ message: "Competition deleted successfully" });
  } catch (error) {
    console.error("Error deleting competition:", error);
    res.status(500).json({ message: "Server error deleting competition" });
  }
};

exports.deleteCompetitionImage = async (req, res) => {
  try {
    const { id } = req.params; // competition id
    const { imageUrl } = req.body; // the image URL to delete

    if (!imageUrl) {
      return res.status(400).json({ message: "Image URL is required" });
    }

    const competition = await Competition.findById(id);
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" });
    }

    // Check if the image exists in the competition's gallery
    const imageExists = competition.gallery.includes(imageUrl);
    if (!imageExists) {
      return res.status(404).json({ message: "Image not found in gallery" });
    }

    // Delete the image from GCS
    await deleteImage(imageUrl);

    // Remove the image from MongoDB array
    competition.gallery = competition.gallery.filter((url) => url !== imageUrl);
    await competition.save();

    res.status(200).json({
      message: "Gallery image deleted successfully",
      gallery: competition.gallery,
    });
  } catch (error) {
    console.error("Error deleting gallery image:", error);
    res.status(500).json({
      message: "Server error deleting gallery image",
      error: error.message,
    });
  }
};
